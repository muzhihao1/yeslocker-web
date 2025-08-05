-- Add OTP codes table for secure authentication
CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone VARCHAR(11) NOT NULL,
    code_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of OTP
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INTEGER DEFAULT 0,
    used BOOLEAN DEFAULT FALSE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('login', 'register')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_otp_codes_phone ON otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_codes_used ON otp_codes(used);
CREATE INDEX IF NOT EXISTS idx_otp_codes_phone_used_expires ON otp_codes(phone, used, expires_at);

-- Add RLS policy for OTP codes
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- Only service role can access OTP codes (no user access)
CREATE POLICY "Service role only access" ON otp_codes
    FOR ALL USING (auth.role() = 'service_role');

-- Add admin login logs table
CREATE TABLE IF NOT EXISTS admin_login_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
    login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    logout_time TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT TRUE,
    failure_reason TEXT,
    session_duration INTERVAL
);

-- Add indexes for admin logs
CREATE INDEX IF NOT EXISTS idx_admin_login_logs_admin_id ON admin_login_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_login_logs_login_time ON admin_login_logs(login_time);
CREATE INDEX IF NOT EXISTS idx_admin_login_logs_success ON admin_login_logs(success);

-- Add RLS policy for admin login logs
ALTER TABLE admin_login_logs ENABLE ROW LEVEL SECURITY;

-- Admins can only see their own logs
CREATE POLICY "Admins can view own logs" ON admin_login_logs
    FOR SELECT USING (auth.uid()::text = admin_id::text);

-- Service role can access all logs
CREATE POLICY "Service role full access to logs" ON admin_login_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Add security audit logs table
CREATE TABLE IF NOT EXISTS security_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    user_id UUID,
    admin_id UUID,
    phone VARCHAR(11),
    ip_address INET,
    user_agent TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_security_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_security_logs_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
);

-- Add indexes for security logs
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON security_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_severity ON security_audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_admin_id ON security_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_phone ON security_audit_logs(phone);

-- Add RLS policy for security logs
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can access security logs
CREATE POLICY "Service role only access to security logs" ON security_audit_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Add rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    identifier VARCHAR(100) NOT NULL, -- IP, phone, etc.
    endpoint VARCHAR(100) NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_request TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    blocked_until TIMESTAMP WITH TIME ZONE
);

-- Add unique constraint for rate limiting
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_identifier_endpoint 
    ON rate_limits(identifier, endpoint);

-- Add indexes for rate limiting
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked_until ON rate_limits(blocked_until);

-- Add RLS policy for rate limits
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can access rate limits
CREATE POLICY "Service role only access to rate limits" ON rate_limits
    FOR ALL USING (auth.role() = 'service_role');

-- Update users table to add security fields
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS security_flags JSONB DEFAULT '{}';

-- Update admins table to improve password security
ALTER TABLE admins 
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS security_flags JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;

-- Add function to clean up expired OTP codes
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM otp_codes 
    WHERE expires_at < NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    INSERT INTO security_audit_logs (event_type, severity, details)
    VALUES ('OTP_CLEANUP', 'low', jsonb_build_object('deleted_count', deleted_count));
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to clean up old security logs
CREATE OR REPLACE FUNCTION cleanup_old_security_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM security_audit_logs 
    WHERE created_at < NOW() - INTERVAL '90 days'
    AND severity NOT IN ('high', 'critical');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to check account lockout
CREATE OR REPLACE FUNCTION check_account_lockout(phone_number VARCHAR(11))
RETURNS BOOLEAN AS $$
DECLARE
    user_record RECORD;
BEGIN
    SELECT locked_until, failed_login_attempts 
    INTO user_record
    FROM users 
    WHERE phone = phone_number;
    
    IF user_record IS NULL THEN
        RETURN FALSE; -- User doesn't exist, not locked
    END IF;
    
    IF user_record.locked_until IS NOT NULL AND user_record.locked_until > NOW() THEN
        RETURN TRUE; -- Account is locked
    END IF;
    
    -- Reset lockout if time has passed
    IF user_record.locked_until IS NOT NULL AND user_record.locked_until <= NOW() THEN
        UPDATE users 
        SET locked_until = NULL, failed_login_attempts = 0
        WHERE phone = phone_number;
    END IF;
    
    RETURN FALSE; -- Account is not locked
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to increment failed login attempts
CREATE OR REPLACE FUNCTION increment_failed_login(phone_number VARCHAR(11))
RETURNS VOID AS $$
DECLARE
    new_attempts INTEGER;
    lockout_duration INTERVAL := '15 minutes';
    max_attempts INTEGER := 5;
BEGIN
    UPDATE users 
    SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1
    WHERE phone = phone_number
    RETURNING failed_login_attempts INTO new_attempts;
    
    -- Lock account if too many failed attempts
    IF new_attempts >= max_attempts THEN
        UPDATE users 
        SET locked_until = NOW() + lockout_duration
        WHERE phone = phone_number;
        
        INSERT INTO security_audit_logs (event_type, severity, phone, details)
        VALUES ('ACCOUNT_LOCKED', 'high', phone_number, 
                jsonb_build_object('failed_attempts', new_attempts, 'locked_until', NOW() + lockout_duration));
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to reset failed login attempts on successful login
CREATE OR REPLACE FUNCTION reset_failed_login(phone_number VARCHAR(11))
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET failed_login_attempts = 0, 
        locked_until = NULL,
        last_login_at = NOW()
    WHERE phone = phone_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create scheduled job to clean up expired OTP codes (runs every hour)
-- Note: This requires pg_cron extension to be enabled
-- SELECT cron.schedule('cleanup-expired-otps', '0 * * * *', 'SELECT cleanup_expired_otps();');

-- Create scheduled job to clean up old security logs (runs daily at 2 AM)
-- SELECT cron.schedule('cleanup-old-security-logs', '0 2 * * *', 'SELECT cleanup_old_security_logs();');

-- Add comments for documentation
COMMENT ON TABLE otp_codes IS 'Stores OTP codes for secure authentication';
COMMENT ON TABLE admin_login_logs IS 'Logs admin login attempts and sessions';
COMMENT ON TABLE security_audit_logs IS 'Security event audit trail';
COMMENT ON TABLE rate_limits IS 'Rate limiting data for API endpoints';

COMMENT ON FUNCTION cleanup_expired_otps() IS 'Cleans up expired OTP codes older than 24 hours';
COMMENT ON FUNCTION cleanup_old_security_logs() IS 'Cleans up security logs older than 90 days (except high/critical)';
COMMENT ON FUNCTION check_account_lockout(VARCHAR) IS 'Checks if an account is locked due to failed login attempts';
COMMENT ON FUNCTION increment_failed_login(VARCHAR) IS 'Increments failed login attempts and locks account if necessary';
COMMENT ON FUNCTION reset_failed_login(VARCHAR) IS 'Resets failed login attempts on successful login';