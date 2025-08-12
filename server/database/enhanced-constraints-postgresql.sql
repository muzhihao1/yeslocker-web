-- Enhanced Foreign Key Constraints and Data Validation for PostgreSQL
-- This file adds comprehensive data validation and referential integrity

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text similarity searches

-- Add enhanced CHECK constraints and data validation

-- 1. Add phone number format validation for users
ALTER TABLE users ADD CONSTRAINT chk_users_phone_format 
  CHECK (phone ~ '^1[3-9][0-9]{9}$');

-- 2. Add name format validation for users  
ALTER TABLE users ADD CONSTRAINT chk_users_name_format 
  CHECK (char_length(name) >= 1 AND char_length(name) <= 50 AND name ~ '^[\u4e00-\u9fa5a-zA-Z0-9\s]+$');

-- 3. Add enhanced status validation for users
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_status;
ALTER TABLE users ADD CONSTRAINT chk_users_status 
  CHECK (status IN ('active', 'inactive', 'suspended', 'pending'));

-- 4. Add enhanced status validation for stores
ALTER TABLE stores DROP CONSTRAINT IF EXISTS chk_stores_status;
ALTER TABLE stores ADD CONSTRAINT chk_stores_status 
  CHECK (status IN ('active', 'inactive', 'maintenance'));

-- 5. Add phone format validation for stores
ALTER TABLE stores ADD CONSTRAINT chk_stores_phone_format 
  CHECK (phone IS NULL OR phone ~ '^[0-9]{3}-[0-9]{4}-[0-9]{4}$');

-- 6. Add business hours format validation
ALTER TABLE stores ADD CONSTRAINT chk_stores_business_hours 
  CHECK (business_hours IS NULL OR business_hours ~ '^[0-9]{2}:[0-9]{2} - [0-9]{2}:[0-9]{2}$');

-- 7. Add name length validation for stores
ALTER TABLE stores ADD CONSTRAINT chk_stores_name_length 
  CHECK (char_length(name) >= 1 AND char_length(name) <= 100);

-- 8. Add phone format validation for admins
ALTER TABLE admins ADD CONSTRAINT chk_admins_phone_format 
  CHECK (phone ~ '^1[3-9][0-9]{9}$');

-- 9. Add name format validation for admins
ALTER TABLE admins ADD CONSTRAINT chk_admins_name_format 
  CHECK (char_length(name) >= 1 AND char_length(name) <= 50 AND name ~ '^[\u4e00-\u9fa5a-zA-Z0-9\s]+$');

-- 10. Add enhanced status validation for admins
ALTER TABLE admins DROP CONSTRAINT IF EXISTS chk_admins_status;
ALTER TABLE admins ADD CONSTRAINT chk_admins_status 
  CHECK (status IN ('active', 'inactive', 'suspended'));

-- 11. Add enhanced locker status validation
ALTER TABLE lockers DROP CONSTRAINT IF EXISTS chk_lockers_status;
ALTER TABLE lockers ADD CONSTRAINT chk_lockers_status 
  CHECK (status IN ('available', 'occupied', 'maintenance', 'out_of_order'));

-- 12. Add locker number format validation
ALTER TABLE lockers ADD CONSTRAINT chk_lockers_number_format 
  CHECK (char_length(number) >= 1 AND char_length(number) <= 10 AND number ~ '^[A-Z0-9]+$');

-- 13. Add enhanced application status validation
ALTER TABLE applications DROP CONSTRAINT IF EXISTS chk_applications_status;
ALTER TABLE applications ADD CONSTRAINT chk_applications_status 
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));

-- 14. Add locker type validation
ALTER TABLE applications ADD CONSTRAINT chk_applications_locker_type 
  CHECK (locker_type IS NULL OR locker_type IN ('standard', 'premium', 'vip', 'mini'));

-- 15. Add business logic constraint for approved applications
ALTER TABLE applications ADD CONSTRAINT chk_applications_approval_logic 
  CHECK (
    (status = 'approved' AND approved_by IS NOT NULL AND approved_at IS NOT NULL AND assigned_locker_id IS NOT NULL) OR 
    (status != 'approved')
  );

-- 16. Add rejection reason constraint
ALTER TABLE applications ADD CONSTRAINT chk_applications_rejection_reason 
  CHECK (
    (status = 'rejected' AND rejection_reason IS NOT NULL AND char_length(rejection_reason) >= 1) OR 
    (status != 'rejected')
  );

-- 17. Add enhanced locker records action validation
ALTER TABLE locker_records DROP CONSTRAINT IF EXISTS chk_locker_records_action;
ALTER TABLE locker_records ADD CONSTRAINT chk_locker_records_action 
  CHECK (action IN ('assigned', 'store', 'retrieve', 'released', 'maintenance'));

-- 18. Add enhanced reminders type validation
ALTER TABLE reminders DROP CONSTRAINT IF EXISTS chk_reminders_type;
ALTER TABLE reminders ADD CONSTRAINT chk_reminders_type 
  CHECK (type IN ('general', 'maintenance', 'urgent', 'system'));

-- 19. Add title length validation for reminders
ALTER TABLE reminders ADD CONSTRAINT chk_reminders_title_length 
  CHECK (char_length(title) >= 1 AND char_length(title) <= 200);

-- Business Logic Constraints

-- 20. Store admin constraint: must be assigned to a store
ALTER TABLE admins ADD CONSTRAINT chk_store_admin_has_store 
  CHECK (
    (role = 'store_admin' AND store_id IS NOT NULL) OR 
    (role != 'store_admin')
  );

-- 21. Super admin constraint: should not be assigned to a specific store
ALTER TABLE admins ADD CONSTRAINT chk_super_admin_no_store 
  CHECK (
    (role = 'super_admin' AND store_id IS NULL) OR 
    (role != 'super_admin')
  );

-- 22. Locker assignment consistency
ALTER TABLE lockers ADD CONSTRAINT chk_locker_assignment_consistency 
  CHECK (
    (status = 'occupied' AND current_user_id IS NOT NULL AND assigned_at IS NOT NULL) OR
    (status != 'occupied' AND current_user_id IS NULL)
  );

-- Enhanced Functions and Triggers

-- 23. Function to prevent duplicate active applications
CREATE OR REPLACE FUNCTION check_duplicate_applications()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' AND EXISTS (
    SELECT 1 FROM applications 
    WHERE user_id = NEW.user_id 
    AND store_id = NEW.store_id 
    AND status = 'pending'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'User already has a pending application for this store';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_duplicate_applications
  BEFORE INSERT OR UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION check_duplicate_applications();

-- 24. Function to handle locker assignment logic
CREATE OR REPLACE FUNCTION handle_locker_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-set assigned_at when status changes to occupied
  IF NEW.status = 'occupied' AND (OLD.status IS NULL OR OLD.status != 'occupied') THEN
    NEW.assigned_at = CURRENT_TIMESTAMP;
  END IF;
  
  -- Auto-clear assigned_at when status changes from occupied
  IF OLD.status = 'occupied' AND NEW.status != 'occupied' THEN
    NEW.assigned_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_locker_assignment_handling
  BEFORE UPDATE ON lockers
  FOR EACH ROW EXECUTE FUNCTION handle_locker_assignment();

-- 25. Function to update user activity on locker operations
CREATE OR REPLACE FUNCTION update_user_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users 
  SET last_active_at = CURRENT_TIMESTAMP 
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_user_activity
  AFTER INSERT ON locker_records
  FOR EACH ROW EXECUTE FUNCTION update_user_activity();

-- 26. Function to handle user deletion cleanup
CREATE OR REPLACE FUNCTION cleanup_user_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Release any lockers assigned to the deleted user
  UPDATE lockers 
  SET current_user_id = NULL, 
      status = 'available',
      assigned_at = NULL
  WHERE current_user_id = OLD.id;
  
  -- Cancel pending applications
  UPDATE applications 
  SET status = 'cancelled', 
      rejection_reason = 'User account deleted',
      updated_at = CURRENT_TIMESTAMP
  WHERE user_id = OLD.id AND status = 'pending';
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_deletion_cleanup
  AFTER DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION cleanup_user_data();

-- 27. Function to validate store deletion
CREATE OR REPLACE FUNCTION validate_store_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if store has active users
  IF EXISTS (SELECT 1 FROM users WHERE store_id = OLD.id AND status = 'active') THEN
    RAISE EXCEPTION 'Cannot delete store with active users';
  END IF;
  
  -- Check if store has occupied lockers
  IF EXISTS (SELECT 1 FROM lockers WHERE store_id = OLD.id AND status = 'occupied') THEN
    RAISE EXCEPTION 'Cannot delete store with occupied lockers';
  END IF;
  
  -- Check if store has pending applications
  IF EXISTS (SELECT 1 FROM applications WHERE store_id = OLD.id AND status = 'pending') THEN
    RAISE EXCEPTION 'Cannot delete store with pending applications';
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_store_deletion
  BEFORE DELETE ON stores
  FOR EACH ROW EXECUTE FUNCTION validate_store_deletion();

-- Audit and Logging

-- 28. Create application audit log table
CREATE TABLE IF NOT EXISTS application_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_by UUID,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES admins(id) ON DELETE SET NULL
);

-- 29. Function to log application status changes
CREATE OR REPLACE FUNCTION log_application_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != NEW.status THEN
    INSERT INTO application_audit_log (application_id, old_status, new_status, changed_by, notes)
    VALUES (
      NEW.id, 
      OLD.status, 
      NEW.status, 
      NEW.approved_by,
      CASE 
        WHEN NEW.status = 'rejected' THEN NEW.rejection_reason
        WHEN NEW.status = 'approved' THEN 'Application approved and locker assigned'
        ELSE NULL 
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_application_status_audit
  AFTER UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION log_application_status_change();

-- Performance and Maintenance Indexes

-- 30. Add additional indexes for constraint checking performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_user_store_status 
  ON applications(user_id, store_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lockers_status_user 
  ON lockers(status, current_user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admins_role_store 
  ON admins(role, store_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locker_records_action_created 
  ON locker_records(action, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_status_store 
  ON users(status, store_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stores_status 
  ON stores(status);

-- 31. Create partial indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_pending 
  ON applications(user_id, store_id, created_at) 
  WHERE status = 'pending';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lockers_occupied 
  ON lockers(store_id, current_user_id, assigned_at) 
  WHERE status = 'occupied';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active 
  ON users(store_id, last_active_at) 
  WHERE status = 'active';

-- Advanced Views for Business Intelligence

-- 32. Create comprehensive business views
CREATE OR REPLACE VIEW active_user_lockers AS
SELECT 
  u.id as user_id,
  u.name as user_name,
  u.phone as user_phone,
  l.id as locker_id,
  l.number as locker_number,
  s.name as store_name,
  l.assigned_at,
  l.status,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - l.assigned_at))/86400 as days_assigned
FROM users u
JOIN lockers l ON u.id = l.current_user_id
JOIN stores s ON l.store_id = s.id
WHERE u.status = 'active' AND l.status = 'occupied';

CREATE OR REPLACE VIEW pending_applications AS
SELECT 
  a.id as application_id,
  u.name as user_name,
  u.phone as user_phone,
  s.name as store_name,
  a.locker_type,
  a.purpose,
  a.created_at,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - a.created_at))/86400 as days_pending,
  CASE 
    WHEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - a.created_at))/86400 > 7 THEN 'overdue'
    WHEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - a.created_at))/86400 > 3 THEN 'urgent'
    ELSE 'normal'
  END as priority_level
FROM applications a
JOIN users u ON a.user_id = u.id
JOIN stores s ON a.store_id = s.id
WHERE a.status = 'pending'
ORDER BY a.created_at ASC;

CREATE OR REPLACE VIEW store_utilization AS
SELECT 
  s.id as store_id,
  s.name as store_name,
  COUNT(l.id) as total_lockers,
  COUNT(CASE WHEN l.status = 'occupied' THEN 1 END) as occupied_lockers,
  COUNT(CASE WHEN l.status = 'available' THEN 1 END) as available_lockers,
  COUNT(CASE WHEN l.status = 'maintenance' THEN 1 END) as maintenance_lockers,
  ROUND(
    (COUNT(CASE WHEN l.status = 'occupied' THEN 1 END)::decimal / 
     NULLIF(COUNT(CASE WHEN l.status != 'out_of_order' THEN 1 END), 0)) * 100, 
    2
  ) as utilization_percentage
FROM stores s
LEFT JOIN lockers l ON s.id = l.store_id
WHERE s.status = 'active'
GROUP BY s.id, s.name
ORDER BY utilization_percentage DESC;

CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
  u.id as user_id,
  u.name as user_name,
  u.phone as user_phone,
  s.name as store_name,
  COUNT(lr.id) as total_operations,
  COUNT(CASE WHEN lr.action = 'store' THEN 1 END) as store_operations,
  COUNT(CASE WHEN lr.action = 'retrieve' THEN 1 END) as retrieve_operations,
  MAX(lr.created_at) as last_operation_at,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - MAX(lr.created_at)))/86400 as days_since_last_operation
FROM users u
LEFT JOIN stores s ON u.store_id = s.id
LEFT JOIN locker_records lr ON u.id = lr.user_id
WHERE u.status = 'active'
GROUP BY u.id, u.name, u.phone, s.name
ORDER BY last_operation_at DESC NULLS LAST;

-- Data Quality and Maintenance Functions

-- 33. Function to clean up old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM application_audit_log 
  WHERE changed_at < CURRENT_TIMESTAMP - INTERVAL '1 year';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 34. Function to generate database health report
CREATE OR REPLACE FUNCTION database_health_report()
RETURNS TABLE (
  metric_name TEXT,
  metric_value TEXT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'Total Users'::TEXT,
    COUNT(*)::TEXT,
    CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'WARNING' END::TEXT
  FROM users WHERE status = 'active'
  
  UNION ALL
  
  SELECT 
    'Total Stores'::TEXT,
    COUNT(*)::TEXT,
    CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'WARNING' END::TEXT
  FROM stores WHERE status = 'active'
  
  UNION ALL
  
  SELECT 
    'Occupied Lockers'::TEXT,
    COUNT(*)::TEXT,
    'INFO'::TEXT
  FROM lockers WHERE status = 'occupied'
  
  UNION ALL
  
  SELECT 
    'Pending Applications'::TEXT,
    COUNT(*)::TEXT,
    CASE WHEN COUNT(*) > 100 THEN 'WARNING' ELSE 'OK' END::TEXT
  FROM applications WHERE status = 'pending'
  
  UNION ALL
  
  SELECT 
    'Overdue Applications'::TEXT,
    COUNT(*)::TEXT,
    CASE WHEN COUNT(*) > 0 THEN 'WARNING' ELSE 'OK' END::TEXT
  FROM applications 
  WHERE status = 'pending' 
  AND created_at < CURRENT_TIMESTAMP - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;