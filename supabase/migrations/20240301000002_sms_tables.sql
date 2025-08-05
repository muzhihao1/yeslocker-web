-- SMS相关表结构
-- Terminal 2: Backend API Support

-- 短信验证码表
CREATE TABLE sms_verification_codes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(10) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('register', 'login', 'reminder')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 短信发送日志表
CREATE TABLE sms_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    type VARCHAR(20) NOT NULL,
    success BOOLEAN NOT NULL,
    content TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_sms_verification_codes_phone ON sms_verification_codes(phone);
CREATE INDEX idx_sms_verification_codes_created_at ON sms_verification_codes(created_at);
CREATE INDEX idx_sms_logs_phone ON sms_logs(phone);
CREATE INDEX idx_sms_logs_created_at ON sms_logs(created_at);

-- 清理过期验证码的函数
CREATE OR REPLACE FUNCTION cleanup_expired_codes()
RETURNS void AS $$
BEGIN
    DELETE FROM sms_verification_codes 
    WHERE expires_at < CURRENT_TIMESTAMP 
    OR (used = TRUE AND created_at < CURRENT_TIMESTAMP - INTERVAL '1 day');
END;
$$ LANGUAGE plpgsql;

-- 创建定时清理任务 (需要pg_cron扩展)
-- SELECT cron.schedule('cleanup-expired-codes', '0 */6 * * *', 'SELECT cleanup_expired_codes();');