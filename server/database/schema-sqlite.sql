-- YesLocker SQLite Database Schema
-- Simplified for local development

-- 门店表
CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    phone TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    avatar_url TEXT,
    store_id TEXT,
    status TEXT DEFAULT 'active',
    last_active_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (store_id) REFERENCES stores(id)
);

-- 管理员表
CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    phone TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL, -- 'super_admin' or 'store_admin'
    store_id TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (store_id) REFERENCES stores(id)
);

-- 杆柜表
CREATE TABLE IF NOT EXISTS lockers (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    store_id TEXT NOT NULL,
    number TEXT NOT NULL,
    status TEXT DEFAULT 'available', -- 'available', 'occupied', 'maintenance'
    current_user_id TEXT,
    assigned_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (store_id) REFERENCES stores(id),
    FOREIGN KEY (current_user_id) REFERENCES users(id),
    UNIQUE(store_id, number)
);

-- 杆柜申请表
CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    locker_type TEXT, -- 申请的杆柜类型或规格
    purpose TEXT,     -- 申请目的
    notes TEXT,       -- 申请备注
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    assigned_locker_id TEXT,
    approved_by TEXT,  -- 审批人ID
    approved_at TEXT,  -- 审批时间
    rejection_reason TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (store_id) REFERENCES stores(id),
    FOREIGN KEY (assigned_locker_id) REFERENCES lockers(id),
    FOREIGN KEY (approved_by) REFERENCES admins(id)
);

-- 杆柜使用记录表
CREATE TABLE IF NOT EXISTS locker_records (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    locker_id TEXT NOT NULL,
    action TEXT NOT NULL, -- 'assigned', 'store', 'retrieve', 'released'
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (locker_id) REFERENCES lockers(id)
);

-- 提醒事项表
CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title TEXT NOT NULL,
    content TEXT,
    type TEXT DEFAULT 'general', -- 'general', 'maintenance', 'urgent'
    is_active INTEGER DEFAULT 1, -- SQLite uses INTEGER for boolean
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_store_id ON users(store_id);
CREATE INDEX IF NOT EXISTS idx_lockers_store_id ON lockers(store_id);
CREATE INDEX IF NOT EXISTS idx_lockers_user_id ON lockers(current_user_id);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_store_id ON applications(store_id);
CREATE INDEX IF NOT EXISTS idx_locker_records_user_id ON locker_records(user_id);
CREATE INDEX IF NOT EXISTS idx_locker_records_locker_id ON locker_records(locker_id);

-- 创建更新时间触发器
CREATE TRIGGER IF NOT EXISTS update_users_updated_at 
    AFTER UPDATE ON users
    FOR EACH ROW
    BEGIN
        UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_admins_updated_at 
    AFTER UPDATE ON admins
    FOR EACH ROW
    BEGIN
        UPDATE admins SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_applications_updated_at 
    AFTER UPDATE ON applications
    FOR EACH ROW
    BEGIN
        UPDATE applications SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_lockers_updated_at 
    AFTER UPDATE ON lockers
    FOR EACH ROW
    BEGIN
        UPDATE lockers SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_stores_updated_at 
    AFTER UPDATE ON stores
    FOR EACH ROW
    BEGIN
        UPDATE stores SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_reminders_updated_at 
    AFTER UPDATE ON reminders
    FOR EACH ROW
    BEGIN
        UPDATE reminders SET updated_at = datetime('now') WHERE id = NEW.id;
    END;