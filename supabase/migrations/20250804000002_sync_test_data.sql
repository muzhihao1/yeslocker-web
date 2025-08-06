-- YesLocker测试数据同步迁移
-- 同步Express服务器测试数据到Supabase数据库
-- 创建时间: 2025-08-04

-- 添加缺失的字段到lockers表
ALTER TABLE lockers ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'medium' 
    CHECK (type IN ('small', 'medium', 'large'));

-- 清理现有测试数据（仅开发环境）
-- 先清空外键引用避免约束违反
UPDATE stores SET admin_id = NULL;

-- 按依赖顺序删除数据
DELETE FROM reminders;
DELETE FROM locker_records;
DELETE FROM applications;
DELETE FROM lockers;
DELETE FROM users;
DELETE FROM admins;
DELETE FROM stores;

-- 插入与Express服务器一致的门店数据
INSERT INTO stores (id, name, address, phone, status) VALUES
    ('a1b2c3d4-e5f6-4789-a012-345678901234', '旗舰店', '北京市朝阳区xxx路xxx号', '010-12345678', 'active'),
    ('b2c3d4e5-f6a7-4890-b123-456789012345', '分店A', '上海市浦东新区xxx路xxx号', '021-87654321', 'active'),
    ('c3d4e5f6-a7b8-4901-c234-567890123456', '分店B', '广州市天河区xxx路xxx号', '020-13579246', 'active')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone,
    status = EXCLUDED.status;

-- 插入与Express服务器一致的管理员数据
-- 注意：这里使用明文密码仅用于开发环境测试
INSERT INTO admins (id, phone, name, role, store_id, password_hash, status) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', '13800000001', '超级管理员', 'super_admin', NULL, 'admin123', 'active'),
    ('550e8400-e29b-41d4-a716-446655440002', '13800000002', '门店管理员', 'store_admin', 'a1b2c3d4-e5f6-4789-a012-345678901234', 'admin123', 'active')
ON CONFLICT (phone) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    store_id = EXCLUDED.store_id,
    password_hash = EXCLUDED.password_hash,
    status = EXCLUDED.status;

-- 插入测试用户数据（与Express服务器测试数据一致）
INSERT INTO users (id, phone, name, avatar_url, store_id, status) VALUES
    ('6ba7b810-9dad-11d1-80b4-00c04fd430c8', '13800000003', '张三', NULL, 'a1b2c3d4-e5f6-4789-a012-345678901234', 'active'),
    ('6ba7b811-9dad-11d1-80b4-00c04fd430c8', '13800000004', '李四', NULL, 'a1b2c3d4-e5f6-4789-a012-345678901234', 'active'),
    ('6ba7b812-9dad-11d1-80b4-00c04fd430c8', '13800000005', '王五', NULL, 'b2c3d4e5-f6a7-4890-b123-456789012345', 'active'),
    ('6ba7b813-9dad-11d1-80b4-00c04fd430c8', '13800000006', '赵六', NULL, 'a1b2c3d4-e5f6-4789-a012-345678901234', 'active'),
    ('6ba7b814-9dad-11d1-80b4-00c04fd430c8', '13800000007', '孙七', NULL, 'b2c3d4e5-f6a7-4890-b123-456789012345', 'active'),
    ('6ba7b815-9dad-11d1-80b4-00c04fd430c8', '13800000008', '周八', NULL, 'a1b2c3d4-e5f6-4789-a012-345678901234', 'inactive')
ON CONFLICT (phone) DO UPDATE SET
    name = EXCLUDED.name,
    avatar_url = EXCLUDED.avatar_url,
    store_id = EXCLUDED.store_id,
    status = EXCLUDED.status;

-- 插入杆柜数据
INSERT INTO lockers (id, store_id, number, type, status, user_id, assigned_at) VALUES
    -- 旗舰店杆柜
    ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'a1b2c3d4-e5f6-4789-a012-345678901234', 'A001', 'small', 'available', NULL, NULL),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d480', 'a1b2c3d4-e5f6-4789-a012-345678901234', 'A002', 'small', 'occupied', '6ba7b811-9dad-11d1-80b4-00c04fd430c8', '2025-01-02T15:00:00Z'),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d481', 'a1b2c3d4-e5f6-4789-a012-345678901234', 'A003', 'medium', 'available', NULL, NULL),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d482', 'a1b2c3d4-e5f6-4789-a012-345678901234', 'A004', 'medium', 'available', NULL, NULL),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d483', 'a1b2c3d4-e5f6-4789-a012-345678901234', 'B001', 'large', 'available', NULL, NULL),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d484', 'a1b2c3d4-e5f6-4789-a012-345678901234', 'B002', 'large', 'maintenance', NULL, NULL),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d485', 'a1b2c3d4-e5f6-4789-a012-345678901234', 'B003', 'medium', 'available', NULL, NULL),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d486', 'a1b2c3d4-e5f6-4789-a012-345678901234', 'B004', 'medium', 'available', NULL, NULL),
    -- 分店A杆柜
    ('f47ac10b-58cc-4372-a567-0e02b2c3d487', 'b2c3d4e5-f6a7-4890-b123-456789012345', 'C001', 'small', 'available', NULL, NULL),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d488', 'b2c3d4e5-f6a7-4890-b123-456789012345', 'C002', 'small', 'available', NULL, NULL),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d489', 'b2c3d4e5-f6a7-4890-b123-456789012345', 'C003', 'medium', 'occupied', '6ba7b814-9dad-11d1-80b4-00c04fd430c8', '2024-12-30T11:30:00Z'),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d490', 'b2c3d4e5-f6a7-4890-b123-456789012345', 'C004', 'medium', 'available', NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
    store_id = EXCLUDED.store_id,
    number = EXCLUDED.number,
    type = EXCLUDED.type,
    status = EXCLUDED.status,
    user_id = EXCLUDED.user_id,
    assigned_at = EXCLUDED.assigned_at;

-- 更新用户的杆柜关联
UPDATE users SET locker_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d480' WHERE id = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';
UPDATE users SET locker_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d489' WHERE id = '6ba7b814-9dad-11d1-80b4-00c04fd430c8';

-- 插入测试申请数据（与Express服务器测试数据一致）
INSERT INTO applications (id, user_id, store_id, requested_locker_number, status, approved_by, approved_at, rejection_reason) VALUES
    ('3f9ed7a4-1c82-4b76-9f52-7e4d3a5b6c7d', '6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'a1b2c3d4-e5f6-4789-a012-345678901234', NULL, 'pending', NULL, NULL, NULL),
    ('3f9ed7a4-1c82-4b76-9f52-7e4d3a5b6c7e', '6ba7b811-9dad-11d1-80b4-00c04fd430c8', 'a1b2c3d4-e5f6-4789-a012-345678901234', 'A001', 'approved', '550e8400-e29b-41d4-a716-446655440001', '2025-01-02T15:00:00Z', NULL),
    ('3f9ed7a4-1c82-4b76-9f52-7e4d3a5b6c7f', '6ba7b812-9dad-11d1-80b4-00c04fd430c8', 'b2c3d4e5-f6a7-4890-b123-456789012345', NULL, 'rejected', '550e8400-e29b-41d4-a716-446655440002', '2025-01-01T10:00:00Z', '材料不完整'),
    ('3f9ed7a4-1c82-4b76-9f52-7e4d3a5b6c80', '6ba7b813-9dad-11d1-80b4-00c04fd430c8', 'a1b2c3d4-e5f6-4789-a012-345678901234', NULL, 'pending', NULL, NULL, NULL),
    ('3f9ed7a4-1c82-4b76-9f52-7e4d3a5b6c81', '6ba7b814-9dad-11d1-80b4-00c04fd430c8', 'b2c3d4e5-f6a7-4890-b123-456789012345', 'C003', 'approved', '550e8400-e29b-41d4-a716-446655440002', '2024-12-30T11:30:00Z', NULL)
ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    store_id = EXCLUDED.store_id,
    requested_locker_number = EXCLUDED.requested_locker_number,
    status = EXCLUDED.status,
    approved_by = EXCLUDED.approved_by,
    approved_at = EXCLUDED.approved_at,
    rejection_reason = EXCLUDED.rejection_reason;

-- 插入一些测试操作记录
INSERT INTO locker_records (user_id, locker_id, store_id, action_type, notes) VALUES
    ('6ba7b811-9dad-11d1-80b4-00c04fd430c8', 'f47ac10b-58cc-4372-a567-0e02b2c3d480', 'a1b2c3d4-e5f6-4789-a012-345678901234', 'apply', '申请杆柜'),
    ('6ba7b811-9dad-11d1-80b4-00c04fd430c8', 'f47ac10b-58cc-4372-a567-0e02b2c3d480', 'a1b2c3d4-e5f6-4789-a012-345678901234', 'approve', '审批通过'),
    ('6ba7b811-9dad-11d1-80b4-00c04fd430c8', 'f47ac10b-58cc-4372-a567-0e02b2c3d480', 'a1b2c3d4-e5f6-4789-a012-345678901234', 'store', '存放球杆'),
    ('6ba7b814-9dad-11d1-80b4-00c04fd430c8', 'f47ac10b-58cc-4372-a567-0e02b2c3d489', 'b2c3d4e5-f6a7-4890-b123-456789012345', 'apply', '申请杆柜'),
    ('6ba7b814-9dad-11d1-80b4-00c04fd430c8', 'f47ac10b-58cc-4372-a567-0e02b2c3d489', 'b2c3d4e5-f6a7-4890-b123-456789012345', 'approve', '审批通过'),
    ('6ba7b814-9dad-11d1-80b4-00c04fd430c8', 'f47ac10b-58cc-4372-a567-0e02b2c3d489', 'b2c3d4e5-f6a7-4890-b123-456789012345', 'store', '存放私人球杆')
ON CONFLICT DO NOTHING;

-- 插入一些测试提醒
INSERT INTO reminders (user_id, locker_id, reminder_type, message, status) VALUES
    ('6ba7b811-9dad-11d1-80b4-00c04fd430c8', 'f47ac10b-58cc-4372-a567-0e02b2c3d480', 'long_term_unused', '您的杆柜已超过30天未使用，请及时取出球杆', 'sent'),
    ('6ba7b814-9dad-11d1-80b4-00c04fd430c8', 'f47ac10b-58cc-4372-a567-0e02b2c3d489', 'return_key', '请记得归还杆柜钥匙', 'read')
ON CONFLICT DO NOTHING;

-- 更新门店管理员关联
UPDATE stores SET admin_id = '550e8400-e29b-41d4-a716-446655440002' WHERE id = 'a1b2c3d4-e5f6-4789-a012-345678901234';

-- 创建测试数据视图，方便查询和验证
CREATE OR REPLACE VIEW test_data_summary AS
SELECT 
    'stores' as table_name,
    COUNT(*) as record_count,
    MAX(created_at) as last_updated
FROM stores
UNION ALL
SELECT 
    'admins' as table_name,
    COUNT(*) as record_count,
    MAX(created_at) as last_updated
FROM admins
UNION ALL
SELECT 
    'users' as table_name,
    COUNT(*) as record_count,
    MAX(created_at) as last_updated
FROM users
UNION ALL
SELECT 
    'lockers' as table_name,
    COUNT(*) as record_count,
    MAX(created_at) as last_updated
FROM lockers
UNION ALL
SELECT 
    'applications' as table_name,
    COUNT(*) as record_count,
    MAX(created_at) as last_updated
FROM applications
UNION ALL
SELECT 
    'locker_records' as table_name,
    COUNT(*) as record_count,
    MAX(created_at) as last_updated
FROM locker_records
UNION ALL
SELECT 
    'reminders' as table_name,
    COUNT(*) as record_count,
    MAX(created_at) as last_updated
FROM reminders;

-- 创建用于Express服务器API兼容的函数
CREATE OR REPLACE FUNCTION get_test_applications_for_api()
RETURNS TABLE (
    id TEXT,
    user_id TEXT,
    user_name TEXT,
    user_phone TEXT,
    store_id TEXT,
    store_name TEXT,
    status TEXT,
    remark TEXT,
    created_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by TEXT,
    rejection_reason TEXT,
    assigned_locker_id TEXT,
    locker_number TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id::TEXT,
        u.id::TEXT,
        u.name,
        u.phone,
        s.id::TEXT,
        s.name,
        a.status,
        COALESCE('申请存放台球杆', '') as remark,
        a.created_at,
        a.approved_at,
        adm.id::TEXT,
        a.rejection_reason,
        l.id::TEXT,
        l.number
    FROM applications a
    JOIN users u ON a.user_id = u.id
    JOIN stores s ON a.store_id = s.id
    LEFT JOIN admins adm ON a.approved_by = adm.id
    LEFT JOIN lockers l ON u.locker_id = l.id
    ORDER BY a.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 创建测试数据重置函数（仅开发环境使用）
CREATE OR REPLACE FUNCTION reset_test_data()
RETURNS TEXT AS $$
BEGIN
    -- 清理和重新初始化测试数据
    DELETE FROM reminders;
    DELETE FROM locker_records;
    DELETE FROM applications WHERE id LIKE '3f9ed7a4-%';
    
    -- 重置用户杆柜关联
    UPDATE users SET locker_id = NULL;
    UPDATE lockers SET status = 'available', user_id = NULL, assigned_at = NULL;
    
    -- 重新插入基础申请数据
    INSERT INTO applications (id, user_id, store_id, status) VALUES
        ('3f9ed7a4-1c82-4b76-9f52-7e4d3a5b6c91', '6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'a1b2c3d4-e5f6-4789-a012-345678901234', 'pending'),
        ('3f9ed7a4-1c82-4b76-9f52-7e4d3a5b6c92', '6ba7b813-9dad-11d1-80b4-00c04fd430c8', 'a1b2c3d4-e5f6-4789-a012-345678901234', 'pending')
    ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        approved_by = NULL,
        approved_at = NULL,
        rejection_reason = NULL;
    
    RETURN 'Test data reset completed at ' || CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- 添加注释说明
COMMENT ON TABLE stores IS '门店信息表 - 包含与Express测试服务器一致的测试数据';
COMMENT ON TABLE admins IS '管理员表 - 密码字段用于开发测试，生产环境应使用password_hash';
COMMENT ON TABLE users IS '用户表 - 包含测试用户数据';
COMMENT ON TABLE applications IS '申请表 - 包含各种状态的测试申请';
COMMENT ON FUNCTION get_test_applications_for_api() IS 'API兼容函数 - 返回Express服务器格式的申请数据';
COMMENT ON FUNCTION reset_test_data() IS '测试数据重置函数 - 仅用于开发环境';

-- 验证数据插入
SELECT * FROM test_data_summary ORDER BY table_name;