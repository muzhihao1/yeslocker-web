-- 管理员登录日志表
-- Terminal 2: Admin Authentication Support

CREATE TABLE admin_login_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES admins(id),
    login_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT TRUE,
    logout_time TIMESTAMP WITH TIME ZONE
);

-- 创建索引
CREATE INDEX idx_admin_login_logs_admin_id ON admin_login_logs(admin_id);
CREATE INDEX idx_admin_login_logs_login_time ON admin_login_logs(login_time);

-- 清理旧日志函数 (保留最近30天)
CREATE OR REPLACE FUNCTION cleanup_old_admin_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM admin_login_logs 
    WHERE login_time < CURRENT_TIMESTAMP - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;