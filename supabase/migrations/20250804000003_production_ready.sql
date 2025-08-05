-- YesLocker生产环境准备迁移
-- 为生产部署准备安全的数据结构和配置
-- 创建时间: 2025-08-04

-- 确保password_hash字段存在且正确
ALTER TABLE admins DROP COLUMN IF EXISTS password;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NOT NULL DEFAULT '$2b$10$dummy.hash.for.production';

-- 添加安全索引
CREATE INDEX IF NOT EXISTS idx_admins_phone_active ON admins(phone) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_applications_store_status ON applications(store_id, status);
CREATE INDEX IF NOT EXISTS idx_lockers_store_status ON lockers(store_id, status);
CREATE INDEX IF NOT EXISTS idx_users_store_active ON users(store_id) WHERE status = 'active';

-- 添加数据完整性约束
ALTER TABLE applications ADD CONSTRAINT check_approval_data 
    CHECK (
        (status = 'approved' AND approved_by IS NOT NULL AND approved_at IS NOT NULL) OR
        (status = 'rejected' AND approved_by IS NOT NULL AND approved_at IS NOT NULL AND rejection_reason IS NOT NULL) OR
        (status = 'pending' AND approved_by IS NULL AND approved_at IS NULL)
    );

-- 添加杆柜状态约束
ALTER TABLE lockers ADD CONSTRAINT check_locker_user_consistency
    CHECK (
        (status = 'occupied' AND user_id IS NOT NULL AND assigned_at IS NOT NULL) OR
        (status IN ('available', 'maintenance') AND user_id IS NULL)
    );

-- 创建生产环境安全函数

-- 安全的管理员认证函数（使用密码哈希）
CREATE OR REPLACE FUNCTION authenticate_admin(
    input_phone TEXT,
    input_password_hash TEXT
)
RETURNS TABLE (
    admin_id UUID,
    admin_name TEXT,
    admin_role TEXT,
    store_id UUID,
    store_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        a.role,
        a.store_id,
        s.name
    FROM admins a
    LEFT JOIN stores s ON a.store_id = s.id
    WHERE a.phone = input_phone 
      AND a.password_hash = input_password_hash 
      AND a.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 申请审批函数
CREATE OR REPLACE FUNCTION process_application(
    app_id UUID,
    admin_id UUID,
    action TEXT,
    assigned_locker_id UUID DEFAULT NULL,
    reason TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    application_status TEXT
) AS $$
DECLARE
    app_record applications%ROWTYPE;
    admin_record admins%ROWTYPE;
    locker_record lockers%ROWTYPE;
BEGIN
    -- 验证管理员权限
    SELECT * INTO admin_record FROM admins WHERE id = admin_id AND status = 'active';
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, '管理员不存在或已禁用', '';
        RETURN;
    END IF;
    
    -- 获取申请记录
    SELECT * INTO app_record FROM applications WHERE id = app_id AND status = 'pending';
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, '申请不存在或已处理', '';
        RETURN;
    END IF;
    
    -- 验证管理员权限（门店管理员只能处理自己门店的申请）
    IF admin_record.role = 'store_admin' AND admin_record.store_id != app_record.store_id THEN
        RETURN QUERY SELECT false, '权限不足', '';
        RETURN;
    END IF;
    
    IF action = 'approve' THEN
        -- 审批通过逻辑
        IF assigned_locker_id IS NOT NULL THEN
            -- 验证杆柜是否可用
            SELECT * INTO locker_record FROM lockers 
            WHERE id = assigned_locker_id AND status = 'available' AND store_id = app_record.store_id;
            
            IF NOT FOUND THEN
                RETURN QUERY SELECT false, '指定的杆柜不可用', '';
                RETURN;
            END IF;
            
            -- 分配杆柜
            UPDATE lockers SET 
                status = 'occupied',
                user_id = app_record.user_id,
                assigned_at = CURRENT_TIMESTAMP
            WHERE id = assigned_locker_id;
            
            -- 更新用户杆柜关联
            UPDATE users SET locker_id = assigned_locker_id WHERE id = app_record.user_id;
        END IF;
        
        -- 更新申请状态
        UPDATE applications SET 
            status = 'approved',
            approved_by = admin_id,
            approved_at = CURRENT_TIMESTAMP
        WHERE id = app_id;
        
        -- 记录操作日志
        INSERT INTO locker_records (user_id, locker_id, store_id, action_type, notes)
        VALUES (app_record.user_id, assigned_locker_id, app_record.store_id, 'approve', '管理员审批通过');
        
        RETURN QUERY SELECT true, '审批通过', 'approved';
        
    ELSIF action = 'reject' THEN
        -- 审批拒绝逻辑
        UPDATE applications SET 
            status = 'rejected',
            approved_by = admin_id,
            approved_at = CURRENT_TIMESTAMP,
            rejection_reason = reason
        WHERE id = app_id;
        
        -- 记录操作日志
        INSERT INTO locker_records (user_id, locker_id, store_id, action_type, notes)
        VALUES (app_record.user_id, NULL, app_record.store_id, 'reject', COALESCE(reason, '审批拒绝'));
        
        RETURN QUERY SELECT true, '已拒绝', 'rejected';
        
    ELSE
        RETURN QUERY SELECT false, '无效的操作类型', '';
    END IF;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 用户杆柜操作函数
CREATE OR REPLACE FUNCTION user_locker_operation(
    user_id UUID,
    locker_id UUID,
    operation TEXT,
    notes TEXT DEFAULT ''
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    user_record users%ROWTYPE;
    locker_record lockers%ROWTYPE;
BEGIN
    -- 验证用户
    SELECT * INTO user_record FROM users WHERE id = user_id AND status = 'active';
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, '用户不存在或已禁用';
        RETURN;
    END IF;
    
    -- 验证杆柜
    SELECT * INTO locker_record FROM lockers WHERE id = locker_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, '杆柜不存在';
        RETURN;
    END IF;
    
    -- 验证用户权限（只能操作自己的杆柜）
    IF locker_record.user_id != user_id THEN
        RETURN QUERY SELECT false, '无权限操作此杆柜';
        RETURN;
    END IF;
    
    IF operation = 'store' THEN
        -- 存杆操作
        INSERT INTO locker_records (user_id, locker_id, store_id, action_type, notes)
        VALUES (user_id, locker_id, locker_record.store_id, 'store', notes);
        
        RETURN QUERY SELECT true, '存杆成功';
        
    ELSIF operation = 'retrieve' THEN
        -- 取杆操作
        INSERT INTO locker_records (user_id, locker_id, store_id, action_type, notes)
        VALUES (user_id, locker_id, locker_record.store_id, 'retrieve', notes);
        
        RETURN QUERY SELECT true, '取杆成功';
        
    ELSE
        RETURN QUERY SELECT false, '无效的操作类型';
    END IF;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取用户可用杆柜列表
CREATE OR REPLACE FUNCTION get_available_lockers(store_id UUID)
RETURNS TABLE (
    id UUID,
    number VARCHAR(20),
    type VARCHAR(20),
    status VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT l.id, l.number, l.type, l.status
    FROM lockers l
    WHERE l.store_id = store_id AND l.status = 'available'
    ORDER BY l.number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取用户操作历史
CREATE OR REPLACE FUNCTION get_user_locker_history(
    user_id UUID,
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    locker_number VARCHAR(20),
    store_name VARCHAR(100),
    action_type VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lr.id,
        l.number,
        s.name,
        lr.action_type,
        lr.notes,
        lr.created_at
    FROM locker_records lr
    JOIN lockers l ON lr.locker_id = l.id
    JOIN stores s ON lr.store_id = s.id
    WHERE lr.user_id = user_id
    ORDER BY lr.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 增强的RLS策略

-- 管理员策略：只能访问自己管辖的数据
DROP POLICY IF EXISTS "Admins can view all data" ON users;
DROP POLICY IF EXISTS "Admins can manage lockers" ON lockers;

CREATE POLICY "Admins can view users in their stores" ON users FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM admins a
        WHERE a.id::text = auth.uid()::text
        AND (a.role = 'super_admin' OR a.store_id = users.store_id)
    )
);

CREATE POLICY "Admins can update users in their stores" ON users FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM admins a
        WHERE a.id::text = auth.uid()::text
        AND (a.role = 'super_admin' OR a.store_id = users.store_id)
    )
);

CREATE POLICY "Admins can view lockers in their stores" ON lockers FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM admins a
        WHERE a.id::text = auth.uid()::text
        AND (a.role = 'super_admin' OR a.store_id = lockers.store_id)
    )
);

CREATE POLICY "Admins can manage lockers in their stores" ON lockers FOR ALL USING (
    EXISTS (
        SELECT 1 FROM admins a
        WHERE a.id::text = auth.uid()::text
        AND (a.role = 'super_admin' OR a.store_id = lockers.store_id)
    )
);

CREATE POLICY "Admins can view applications in their stores" ON applications FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM admins a
        WHERE a.id::text = auth.uid()::text
        AND (a.role = 'super_admin' OR a.store_id = applications.store_id)
    )
);

CREATE POLICY "Admins can update applications in their stores" ON applications FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM admins a
        WHERE a.id::text = auth.uid()::text
        AND (a.role = 'super_admin' OR a.store_id = applications.store_id)
    )
);

-- 创建审计日志表（可选，用于生产环境审计）
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    operation VARCHAR(10) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    user_id TEXT,
    user_type VARCHAR(20), -- 'admin' or 'user'
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建审计触发器函数
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (table_name, operation, old_data, user_id, user_type)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), auth.uid()::text, 'admin');
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (table_name, operation, old_data, new_data, user_id, user_type)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), row_to_json(NEW), auth.uid()::text, 'admin');
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (table_name, operation, new_data, user_id, user_type)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(NEW), auth.uid()::text, 'admin');
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 为关键表添加审计触发器（可选，生产环境启用）
-- CREATE TRIGGER audit_applications AFTER INSERT OR UPDATE OR DELETE ON applications
--     FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
-- CREATE TRIGGER audit_lockers AFTER INSERT OR UPDATE OR DELETE ON lockers
--     FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- 创建健康检查视图
CREATE OR REPLACE VIEW system_health_check AS
SELECT 
    'Database Connection' as check_name,
    'OK' as status,
    CURRENT_TIMESTAMP as checked_at
UNION ALL
SELECT 
    'Total Stores' as check_name,
    COUNT(*)::TEXT as status,
    MAX(created_at) as checked_at
FROM stores WHERE status = 'active'
UNION ALL
SELECT 
    'Active Admins' as check_name,
    COUNT(*)::TEXT as status,
    MAX(created_at) as checked_at
FROM admins WHERE status = 'active'
UNION ALL
SELECT 
    'Active Users' as check_name,
    COUNT(*)::TEXT as status,
    MAX(created_at) as checked_at
FROM users WHERE status = 'active'
UNION ALL
SELECT 
    'Available Lockers' as check_name,
    COUNT(*)::TEXT as status,
    MAX(created_at) as checked_at
FROM lockers WHERE status = 'available'
UNION ALL
SELECT 
    'Pending Applications' as check_name,
    COUNT(*)::TEXT as status,
    MAX(created_at) as checked_at
FROM applications WHERE status = 'pending';

-- 添加生产环境注释
COMMENT ON FUNCTION authenticate_admin(TEXT, TEXT) IS '管理员认证函数 - 生产环境使用密码哈希';
COMMENT ON FUNCTION process_application(UUID, UUID, TEXT, UUID, TEXT) IS '申请审批函数 - 包含完整的权限检查';
COMMENT ON FUNCTION user_locker_operation(UUID, UUID, TEXT, TEXT) IS '用户杆柜操作函数 - 包含权限验证';
COMMENT ON VIEW system_health_check IS '系统健康检查视图 - 用于监控系统状态';
COMMENT ON TABLE audit_logs IS '审计日志表 - 记录所有关键操作（可选启用）';

-- 验证生产环境配置
SELECT 'Production migration completed' as status, CURRENT_TIMESTAMP as completed_at;