-- PostgreSQL Migration: Create vouchers and voucher_events tables

-- Create vouchers table
CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  locker_id UUID NOT NULL REFERENCES lockers(id),
  operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('store', 'retrieve')),
  code VARCHAR(8) UNIQUE NOT NULL,
  qr_data TEXT NOT NULL, -- Base64 encoded QR image or URL
  status VARCHAR(20) NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'used', 'expired', 'cancelled')),
  
  -- Snapshot user info at issue time
  user_phone VARCHAR(20) NOT NULL,
  user_name VARCHAR(100) NOT NULL,
  user_avatar_url TEXT,
  
  -- Locker info snapshot
  locker_number VARCHAR(50) NOT NULL,
  store_id UUID NOT NULL REFERENCES stores(id),
  store_name VARCHAR(100) NOT NULL,
  
  -- Timestamps
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  
  -- Verification info
  used_by UUID REFERENCES admins(id),
  used_at_store UUID REFERENCES stores(id),
  verification_notes TEXT,
  
  -- Metadata
  device_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_vouchers_user_id ON vouchers(user_id);
CREATE INDEX idx_vouchers_code ON vouchers(code);
CREATE INDEX idx_vouchers_status ON vouchers(status);
CREATE INDEX idx_vouchers_issued_at ON vouchers(issued_at);
CREATE INDEX idx_vouchers_expires_at ON vouchers(expires_at);
CREATE INDEX idx_vouchers_locker_id ON vouchers(locker_id);
CREATE INDEX idx_vouchers_store_id ON vouchers(store_id);

-- Create voucher events audit table
CREATE TABLE IF NOT EXISTS voucher_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voucher_id UUID NOT NULL REFERENCES vouchers(id),
  event_type VARCHAR(50) NOT NULL, -- issued, scanned, verified, used, expired, cancelled
  actor_type VARCHAR(20) NOT NULL CHECK (actor_type IN ('user', 'staff', 'system')),
  actor_id UUID,
  store_id UUID REFERENCES stores(id),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for voucher events
CREATE INDEX idx_voucher_events_voucher_id ON voucher_events(voucher_id);
CREATE INDEX idx_voucher_events_created_at ON voucher_events(created_at);
CREATE INDEX idx_voucher_events_event_type ON voucher_events(event_type);

-- Function to generate unique 8-character voucher code
CREATE OR REPLACE FUNCTION generate_voucher_code()
RETURNS VARCHAR(8) AS $$
DECLARE
  chars VARCHAR(36) := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result VARCHAR(8) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-expire vouchers
CREATE OR REPLACE FUNCTION expire_old_vouchers()
RETURNS void AS $$
BEGIN
  UPDATE vouchers 
  SET status = 'expired', 
      updated_at = NOW()
  WHERE status = 'issued' 
    AND expires_at < NOW();
    
  -- Log expiry events
  INSERT INTO voucher_events (voucher_id, event_type, actor_type, metadata)
  SELECT id, 'expired', 'system', '{"reason": "auto-expired"}'::jsonb
  FROM vouchers
  WHERE status = 'expired' 
    AND updated_at >= NOW() - INTERVAL '1 minute';
END;
$$ LANGUAGE plpgsql;

-- Create a sample view for active vouchers
CREATE OR REPLACE VIEW active_vouchers AS
SELECT 
  v.*,
  u.name as current_user_name,
  u.phone as current_user_phone,
  u.avatar_url as current_user_avatar,
  l.number as current_locker_number,
  s.name as current_store_name,
  CASE 
    WHEN v.expires_at < NOW() THEN true
    ELSE false
  END as is_expired,
  EXTRACT(EPOCH FROM (v.expires_at - NOW()))/60 as minutes_remaining
FROM vouchers v
JOIN users u ON v.user_id = u.id
JOIN lockers l ON v.locker_id = l.id
JOIN stores s ON v.store_id = s.id
WHERE v.status = 'issued';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON vouchers TO PUBLIC;
GRANT SELECT, INSERT ON voucher_events TO PUBLIC;
GRANT SELECT ON active_vouchers TO PUBLIC;