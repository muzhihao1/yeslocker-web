-- 台球杆柜管理系统数据库架构
-- Terminal 2: Backend + Database Design

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 门店表
CREATE TABLE stores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    admin_id UUID,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 管理员表
CREATE TABLE admins (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    role VARCHAR(20) DEFAULT 'store_admin' CHECK (role IN ('super_admin', 'store_admin')),
    store_id UUID REFERENCES stores(id),
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 用户表
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    avatar_url TEXT,
    store_id UUID REFERENCES stores(id),
    locker_id UUID,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 杆柜表
CREATE TABLE lockers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES stores(id),
    number VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
    user_id UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(store_id, number)
);

-- 存取记录表
CREATE TABLE locker_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    locker_id UUID NOT NULL REFERENCES lockers(id),
    store_id UUID NOT NULL REFERENCES stores(id),
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('store', 'retrieve', 'apply', 'approve', 'reject')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 提醒记录表
CREATE TABLE reminders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    locker_id UUID NOT NULL REFERENCES lockers(id),
    reminder_type VARCHAR(30) NOT NULL CHECK (reminder_type IN ('long_term_unused', 'return_key', 'approval_needed', 'system_notice')),
    message TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'read', 'acknowledged'))
);

-- 申请记录表 (用于跟踪杆柜申请状态)
CREATE TABLE applications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    store_id UUID NOT NULL REFERENCES stores(id),
    requested_locker_number VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES admins(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 添加外键关系
ALTER TABLE stores ADD CONSTRAINT fk_stores_admin 
    FOREIGN KEY (admin_id) REFERENCES admins(id);

ALTER TABLE users ADD CONSTRAINT fk_users_locker 
    FOREIGN KEY (locker_id) REFERENCES lockers(id);

-- 创建索引以提升查询性能
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_store_id ON users(store_id);
CREATE INDEX idx_lockers_store_id ON lockers(store_id);
CREATE INDEX idx_lockers_user_id ON lockers(user_id);
CREATE INDEX idx_locker_records_user_id ON locker_records(user_id);
CREATE INDEX idx_locker_records_created_at ON locker_records(created_at);
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_reminders_user_id ON reminders(user_id);

-- 创建更新时间戳的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表添加更新时间戳触发器
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lockers_updated_at BEFORE UPDATE ON lockers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) 策略
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE lockers ENABLE ROW LEVEL SECURITY;
ALTER TABLE locker_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的数据
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid()::text = id::text);

-- 杆柜记录策略
CREATE POLICY "Users can view own locker records" ON locker_records FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own locker records" ON locker_records FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- 提醒记录策略
CREATE POLICY "Users can view own reminders" ON reminders FOR SELECT USING (auth.uid()::text = user_id::text);

-- 申请记录策略
CREATE POLICY "Users can view own applications" ON applications FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own applications" ON applications FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- 管理员可以查看所有数据（这里简化，实际可能需要更复杂的权限控制）
CREATE POLICY "Admins can view all data" ON users FOR ALL USING (
    EXISTS (
        SELECT 1 FROM admins WHERE admins.id::text = auth.uid()::text
    )
);

CREATE POLICY "Admins can manage lockers" ON lockers FOR ALL USING (
    EXISTS (
        SELECT 1 FROM admins 
        WHERE admins.id::text = auth.uid()::text 
        AND (admins.role = 'super_admin' OR admins.store_id = lockers.store_id)
    )
);

-- 初始化示例数据（开发环境）
INSERT INTO stores (id, name, address, phone) VALUES 
    ('00000000-0000-0000-0000-000000000001', '旗舰店', '北京市朝阳区xxx路xxx号', '010-12345678'),
    ('00000000-0000-0000-0000-000000000002', '分店A', '上海市浦东新区xxx路xxx号', '021-87654321');

INSERT INTO admins (id, phone, name, role, store_id, password_hash) VALUES 
    ('00000000-0000-0000-0000-000000000001', '13800000001', '超级管理员', 'super_admin', NULL, '$2b$10$dummy.hash.for.dev.only'),
    ('00000000-0000-0000-0000-000000000002', '13800000002', '旗舰店管理员', 'store_admin', '00000000-0000-0000-0000-000000000001', '$2b$10$dummy.hash.for.dev.only');

-- 更新门店管理员关联
UPDATE stores SET admin_id = '00000000-0000-0000-0000-000000000002' WHERE id = '00000000-0000-0000-0000-000000000001';

INSERT INTO lockers (store_id, number, status) VALUES 
    ('00000000-0000-0000-0000-000000000001', 'A001', 'available'),
    ('00000000-0000-0000-0000-000000000001', 'A002', 'available'),
    ('00000000-0000-0000-0000-000000000001', 'A003', 'available'),
    ('00000000-0000-0000-0000-000000000001', 'B001', 'available'),
    ('00000000-0000-0000-0000-000000000001', 'B002', 'available'),
    ('00000000-0000-0000-0000-000000000002', 'C001', 'available'),
    ('00000000-0000-0000-0000-000000000002', 'C002', 'available');