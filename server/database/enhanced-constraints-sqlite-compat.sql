-- Enhanced Foreign Key Constraints and Data Validation for SQLite (Compatible Version)
-- This file adds comprehensive data validation and referential integrity
-- using SQLite-compatible syntax

-- Enable foreign key support (critical for SQLite)
PRAGMA foreign_keys = ON;

-- SQLite has limited ALTER TABLE support, so we'll use triggers for validation
-- instead of CHECK constraints on existing tables

-- Business Logic Triggers for Data Validation

-- 1. Validate user status values
CREATE TRIGGER IF NOT EXISTS trg_validate_user_status
  BEFORE INSERT ON users
  WHEN NEW.status NOT IN ('active', 'inactive', 'suspended', 'pending')
BEGIN
  SELECT RAISE(ABORT, 'Invalid user status. Must be: active, inactive, suspended, or pending');
END;

CREATE TRIGGER IF NOT EXISTS trg_validate_user_status_update
  BEFORE UPDATE ON users
  WHEN NEW.status NOT IN ('active', 'inactive', 'suspended', 'pending')
BEGIN
  SELECT RAISE(ABORT, 'Invalid user status. Must be: active, inactive, suspended, or pending');
END;

-- 2. Validate user phone format
CREATE TRIGGER IF NOT EXISTS trg_validate_user_phone
  BEFORE INSERT ON users
  WHEN NEW.phone NOT GLOB '[1][3-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
BEGIN
  SELECT RAISE(ABORT, 'Invalid phone number format. Must be Chinese mobile number (11 digits starting with 1[3-9])');
END;

CREATE TRIGGER IF NOT EXISTS trg_validate_user_phone_update
  BEFORE UPDATE ON users
  WHEN NEW.phone NOT GLOB '[1][3-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
BEGIN
  SELECT RAISE(ABORT, 'Invalid phone number format. Must be Chinese mobile number (11 digits starting with 1[3-9])');
END;

-- 3. Validate user name length
CREATE TRIGGER IF NOT EXISTS trg_validate_user_name
  BEFORE INSERT ON users
  WHEN length(NEW.name) < 1 OR length(NEW.name) > 50
BEGIN
  SELECT RAISE(ABORT, 'User name must be between 1 and 50 characters');
END;

CREATE TRIGGER IF NOT EXISTS trg_validate_user_name_update
  BEFORE UPDATE ON users
  WHEN length(NEW.name) < 1 OR length(NEW.name) > 50
BEGIN
  SELECT RAISE(ABORT, 'User name must be between 1 and 50 characters');
END;

-- 4. Validate store status
CREATE TRIGGER IF NOT EXISTS trg_validate_store_status
  BEFORE INSERT ON stores
  WHEN NEW.status NOT IN ('active', 'inactive', 'maintenance')
BEGIN
  SELECT RAISE(ABORT, 'Invalid store status. Must be: active, inactive, or maintenance');
END;

CREATE TRIGGER IF NOT EXISTS trg_validate_store_status_update
  BEFORE UPDATE ON stores
  WHEN NEW.status NOT IN ('active', 'inactive', 'maintenance')
BEGIN
  SELECT RAISE(ABORT, 'Invalid store status. Must be: active, inactive, or maintenance');
END;

-- 5. Validate store business hours format
CREATE TRIGGER IF NOT EXISTS trg_validate_store_hours
  BEFORE INSERT ON stores
  WHEN NEW.business_hours IS NOT NULL AND 
       NEW.business_hours NOT GLOB '*[0-9][0-9]:[0-9][0-9] - [0-9][0-9]:[0-9][0-9]*'
BEGIN
  SELECT RAISE(ABORT, 'Invalid business hours format. Must be like "09:00 - 22:00"');
END;

CREATE TRIGGER IF NOT EXISTS trg_validate_store_hours_update
  BEFORE UPDATE ON stores
  WHEN NEW.business_hours IS NOT NULL AND 
       NEW.business_hours NOT GLOB '*[0-9][0-9]:[0-9][0-9] - [0-9][0-9]:[0-9][0-9]*'
BEGIN
  SELECT RAISE(ABORT, 'Invalid business hours format. Must be like "09:00 - 22:00"');
END;

-- 6. Validate admin role
CREATE TRIGGER IF NOT EXISTS trg_validate_admin_role
  BEFORE INSERT ON admins
  WHEN NEW.role NOT IN ('super_admin', 'store_admin')
BEGIN
  SELECT RAISE(ABORT, 'Invalid admin role. Must be: super_admin or store_admin');
END;

CREATE TRIGGER IF NOT EXISTS trg_validate_admin_role_update
  BEFORE UPDATE ON admins
  WHEN NEW.role NOT IN ('super_admin', 'store_admin')
BEGIN
  SELECT RAISE(ABORT, 'Invalid admin role. Must be: super_admin or store_admin');
END;

-- 7. Validate admin status
CREATE TRIGGER IF NOT EXISTS trg_validate_admin_status
  BEFORE INSERT ON admins
  WHEN NEW.status NOT IN ('active', 'inactive', 'suspended')
BEGIN
  SELECT RAISE(ABORT, 'Invalid admin status. Must be: active, inactive, or suspended');
END;

CREATE TRIGGER IF NOT EXISTS trg_validate_admin_status_update
  BEFORE UPDATE ON admins
  WHEN NEW.status NOT IN ('active', 'inactive', 'suspended')
BEGIN
  SELECT RAISE(ABORT, 'Invalid admin status. Must be: active, inactive, or suspended');
END;

-- 8. Validate admin phone format
CREATE TRIGGER IF NOT EXISTS trg_validate_admin_phone
  BEFORE INSERT ON admins
  WHEN NEW.phone NOT GLOB '[1][3-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
BEGIN
  SELECT RAISE(ABORT, 'Invalid admin phone number format. Must be Chinese mobile number (11 digits starting with 1[3-9])');
END;

CREATE TRIGGER IF NOT EXISTS trg_validate_admin_phone_update
  BEFORE UPDATE ON admins
  WHEN NEW.phone NOT GLOB '[1][3-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
BEGIN
  SELECT RAISE(ABORT, 'Invalid admin phone number format. Must be Chinese mobile number (11 digits starting with 1[3-9])');
END;

-- 9. Validate admin name length
CREATE TRIGGER IF NOT EXISTS trg_validate_admin_name
  BEFORE INSERT ON admins
  WHEN length(NEW.name) < 1 OR length(NEW.name) > 50
BEGIN
  SELECT RAISE(ABORT, 'Admin name must be between 1 and 50 characters');
END;

CREATE TRIGGER IF NOT EXISTS trg_validate_admin_name_update
  BEFORE UPDATE ON admins
  WHEN length(NEW.name) < 1 OR length(NEW.name) > 50
BEGIN
  SELECT RAISE(ABORT, 'Admin name must be between 1 and 50 characters');
END;

-- 10. Validate locker status
CREATE TRIGGER IF NOT EXISTS trg_validate_locker_status
  BEFORE INSERT ON lockers
  WHEN NEW.status NOT IN ('available', 'occupied', 'maintenance', 'out_of_order')
BEGIN
  SELECT RAISE(ABORT, 'Invalid locker status. Must be: available, occupied, maintenance, or out_of_order');
END;

CREATE TRIGGER IF NOT EXISTS trg_validate_locker_status_update
  BEFORE UPDATE ON lockers
  WHEN NEW.status NOT IN ('available', 'occupied', 'maintenance', 'out_of_order')
BEGIN
  SELECT RAISE(ABORT, 'Invalid locker status. Must be: available, occupied, maintenance, or out_of_order');
END;

-- 11. Validate locker number format
CREATE TRIGGER IF NOT EXISTS trg_validate_locker_number
  BEFORE INSERT ON lockers
  WHEN length(NEW.number) < 1 OR length(NEW.number) > 10 OR NEW.number NOT GLOB '[A-Z0-9]*'
BEGIN
  SELECT RAISE(ABORT, 'Invalid locker number. Must be 1-10 characters containing only uppercase letters and numbers');
END;

CREATE TRIGGER IF NOT EXISTS trg_validate_locker_number_update
  BEFORE UPDATE ON lockers
  WHEN length(NEW.number) < 1 OR length(NEW.number) > 10 OR NEW.number NOT GLOB '[A-Z0-9]*'
BEGIN
  SELECT RAISE(ABORT, 'Invalid locker number. Must be 1-10 characters containing only uppercase letters and numbers');
END;

-- 12. Validate application status
CREATE TRIGGER IF NOT EXISTS trg_validate_application_status
  BEFORE INSERT ON applications
  WHEN NEW.status NOT IN ('pending', 'approved', 'rejected', 'cancelled')
BEGIN
  SELECT RAISE(ABORT, 'Invalid application status. Must be: pending, approved, rejected, or cancelled');
END;

CREATE TRIGGER IF NOT EXISTS trg_validate_application_status_update
  BEFORE UPDATE ON applications
  WHEN NEW.status NOT IN ('pending', 'approved', 'rejected', 'cancelled')
BEGIN
  SELECT RAISE(ABORT, 'Invalid application status. Must be: pending, approved, rejected, or cancelled');
END;

-- 13. Validate locker type
CREATE TRIGGER IF NOT EXISTS trg_validate_application_locker_type
  BEFORE INSERT ON applications
  WHEN NEW.locker_type IS NOT NULL AND NEW.locker_type NOT IN ('standard', 'premium', 'vip', 'mini')
BEGIN
  SELECT RAISE(ABORT, 'Invalid locker type. Must be: standard, premium, vip, or mini');
END;

CREATE TRIGGER IF NOT EXISTS trg_validate_application_locker_type_update
  BEFORE UPDATE ON applications
  WHEN NEW.locker_type IS NOT NULL AND NEW.locker_type NOT IN ('standard', 'premium', 'vip', 'mini')
BEGIN
  SELECT RAISE(ABORT, 'Invalid locker type. Must be: standard, premium, vip, or mini');
END;

-- 14. Validate locker records action
CREATE TRIGGER IF NOT EXISTS trg_validate_locker_record_action
  BEFORE INSERT ON locker_records
  WHEN NEW.action NOT IN ('assigned', 'store', 'retrieve', 'released', 'maintenance')
BEGIN
  SELECT RAISE(ABORT, 'Invalid locker record action. Must be: assigned, store, retrieve, released, or maintenance');
END;

-- 15. Validate reminders type
CREATE TRIGGER IF NOT EXISTS trg_validate_reminder_type
  BEFORE INSERT ON reminders
  WHEN NEW.type NOT IN ('general', 'maintenance', 'urgent', 'system')
BEGIN
  SELECT RAISE(ABORT, 'Invalid reminder type. Must be: general, maintenance, urgent, or system');
END;

CREATE TRIGGER IF NOT EXISTS trg_validate_reminder_type_update
  BEFORE UPDATE ON reminders
  WHEN NEW.type NOT IN ('general', 'maintenance', 'urgent', 'system')
BEGIN
  SELECT RAISE(ABORT, 'Invalid reminder type. Must be: general, maintenance, urgent, or system');
END;

-- 16. Validate reminder title length
CREATE TRIGGER IF NOT EXISTS trg_validate_reminder_title
  BEFORE INSERT ON reminders
  WHEN length(NEW.title) < 1 OR length(NEW.title) > 200
BEGIN
  SELECT RAISE(ABORT, 'Reminder title must be between 1 and 200 characters');
END;

CREATE TRIGGER IF NOT EXISTS trg_validate_reminder_title_update
  BEFORE UPDATE ON reminders
  WHEN length(NEW.title) < 1 OR length(NEW.title) > 200
BEGIN
  SELECT RAISE(ABORT, 'Reminder title must be between 1 and 200 characters');
END;

-- Business Logic Constraints

-- 17. Ensure store admins can only manage their assigned store
CREATE TRIGGER IF NOT EXISTS trg_admin_store_constraint
  BEFORE INSERT ON admins
  WHEN NEW.role = 'store_admin' AND NEW.store_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'Store admins must be assigned to a store');
END;

CREATE TRIGGER IF NOT EXISTS trg_admin_store_constraint_update
  BEFORE UPDATE ON admins
  WHEN NEW.role = 'store_admin' AND NEW.store_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'Store admins must be assigned to a store');
END;

-- 18. Ensure super admins don't need a specific store assignment
CREATE TRIGGER IF NOT EXISTS trg_super_admin_store_constraint
  BEFORE INSERT ON admins
  WHEN NEW.role = 'super_admin' AND NEW.store_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'Super admins should not be assigned to a specific store');
END;

CREATE TRIGGER IF NOT EXISTS trg_super_admin_store_constraint_update
  BEFORE UPDATE ON admins
  WHEN NEW.role = 'super_admin' AND NEW.store_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'Super admins should not be assigned to a specific store');
END;

-- 19. Ensure locker assignment consistency
CREATE TRIGGER IF NOT EXISTS trg_locker_assignment_consistency
  BEFORE UPDATE ON lockers
  WHEN NEW.status = 'occupied' AND NEW.current_user_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'Occupied lockers must have a current_user_id');
END;

-- 20. Ensure locker availability consistency
CREATE TRIGGER IF NOT EXISTS trg_locker_availability_consistency
  BEFORE UPDATE ON lockers
  WHEN NEW.status = 'available' AND NEW.current_user_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'Available lockers cannot have a current_user_id');
END;

-- 21. Prevent duplicate active applications per user-store combination
CREATE TRIGGER IF NOT EXISTS trg_prevent_duplicate_applications
  BEFORE INSERT ON applications
  WHEN NEW.status = 'pending' AND (
    SELECT COUNT(*) FROM applications 
    WHERE user_id = NEW.user_id 
    AND store_id = NEW.store_id 
    AND status = 'pending'
  ) > 0
BEGIN
  SELECT RAISE(ABORT, 'User already has a pending application for this store');
END;

-- 22. Ensure approved applications have assigned lockers and approval details
CREATE TRIGGER IF NOT EXISTS trg_approved_application_locker
  BEFORE UPDATE ON applications
  WHEN NEW.status = 'approved' AND (
    NEW.assigned_locker_id IS NULL OR 
    NEW.approved_by IS NULL OR 
    NEW.approved_at IS NULL
  )
BEGIN
  SELECT RAISE(ABORT, 'Approved applications must have assigned locker, approved by, and approved at fields');
END;

-- 23. Ensure rejected applications have rejection reason
CREATE TRIGGER IF NOT EXISTS trg_rejected_application_reason
  BEFORE UPDATE ON applications
  WHEN NEW.status = 'rejected' AND (NEW.rejection_reason IS NULL OR length(NEW.rejection_reason) < 1)
BEGIN
  SELECT RAISE(ABORT, 'Rejected applications must have a rejection reason');
END;

-- Enhanced Referential Integrity

-- 24. Cascade delete for user data when user is deleted
CREATE TRIGGER IF NOT EXISTS trg_user_deletion_cleanup
  AFTER DELETE ON users
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
      rejection_reason = 'User account deleted'
  WHERE user_id = OLD.id AND status = 'pending';
END;

-- 25. Handle store deletion properly
CREATE TRIGGER IF NOT EXISTS trg_store_deletion_cleanup
  BEFORE DELETE ON stores
  WHEN EXISTS (SELECT 1 FROM users WHERE store_id = OLD.id AND status = 'active') OR
       EXISTS (SELECT 1 FROM lockers WHERE store_id = OLD.id AND status = 'occupied') OR
       EXISTS (SELECT 1 FROM applications WHERE store_id = OLD.id AND status = 'pending')
BEGIN
  SELECT RAISE(ABORT, 'Cannot delete store with active users, occupied lockers, or pending applications');
END;

-- Data Quality Triggers

-- 26. Auto-set locker assigned_at when status changes to occupied
CREATE TRIGGER IF NOT EXISTS trg_locker_assigned_at
  AFTER UPDATE ON lockers
  WHEN NEW.status = 'occupied' AND OLD.status != 'occupied'
BEGIN
  UPDATE lockers 
  SET assigned_at = datetime('now') 
  WHERE id = NEW.id;
END;

-- 27. Auto-clear locker assigned_at when status changes from occupied
CREATE TRIGGER IF NOT EXISTS trg_locker_cleared_at
  AFTER UPDATE ON lockers
  WHEN OLD.status = 'occupied' AND NEW.status != 'occupied'
BEGIN
  UPDATE lockers 
  SET assigned_at = NULL 
  WHERE id = NEW.id;
END;

-- 28. Update user last_active_at on locker operations
CREATE TRIGGER IF NOT EXISTS trg_update_user_activity
  AFTER INSERT ON locker_records
BEGIN
  UPDATE users 
  SET last_active_at = datetime('now') 
  WHERE id = NEW.user_id;
END;

-- Logging and Audit Triggers

-- 29. Create application audit log table
CREATE TABLE IF NOT EXISTS application_audit_log (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    application_id TEXT NOT NULL,
    old_status TEXT,
    new_status TEXT,
    changed_by TEXT,
    changed_at TEXT DEFAULT (datetime('now')),
    notes TEXT,
    FOREIGN KEY (application_id) REFERENCES applications(id),
    FOREIGN KEY (changed_by) REFERENCES admins(id)
);

-- 30. Log application status changes
CREATE TRIGGER IF NOT EXISTS trg_application_status_audit
  AFTER UPDATE OF status ON applications
  WHEN OLD.status != NEW.status
BEGIN
  INSERT INTO application_audit_log (application_id, old_status, new_status, changed_by, notes)
  VALUES (NEW.id, OLD.status, NEW.status, NEW.approved_by, 
          CASE NEW.status 
            WHEN 'rejected' THEN NEW.rejection_reason
            WHEN 'approved' THEN 'Application approved and locker assigned'
            ELSE NULL 
          END);
END;

-- Performance and Maintenance

-- 31. Add additional indexes for constraint checking performance
CREATE INDEX IF NOT EXISTS idx_applications_user_store_status 
  ON applications(user_id, store_id, status);

CREATE INDEX IF NOT EXISTS idx_lockers_status_user 
  ON lockers(status, current_user_id);

CREATE INDEX IF NOT EXISTS idx_admins_role_store 
  ON admins(role, store_id);

CREATE INDEX IF NOT EXISTS idx_locker_records_action_created 
  ON locker_records(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_status_store 
  ON users(status, store_id);

CREATE INDEX IF NOT EXISTS idx_stores_status 
  ON stores(status);

CREATE INDEX IF NOT EXISTS idx_applications_pending 
  ON applications(user_id, store_id, created_at);

CREATE INDEX IF NOT EXISTS idx_application_audit_log_app_id 
  ON application_audit_log(application_id);

-- 32. Create views for common business queries
CREATE VIEW IF NOT EXISTS active_user_lockers AS
SELECT 
  u.id as user_id,
  u.name as user_name,
  u.phone as user_phone,
  l.id as locker_id,
  l.number as locker_number,
  s.name as store_name,
  l.assigned_at,
  l.status,
  julianday('now') - julianday(l.assigned_at) as days_assigned
FROM users u
JOIN lockers l ON u.id = l.current_user_id
JOIN stores s ON l.store_id = s.id
WHERE u.status = 'active' AND l.status = 'occupied';

CREATE VIEW IF NOT EXISTS pending_applications AS
SELECT 
  a.id as application_id,
  u.name as user_name,
  u.phone as user_phone,
  s.name as store_name,
  a.locker_type,
  a.purpose,
  a.created_at,
  julianday('now') - julianday(a.created_at) as days_pending,
  CASE 
    WHEN julianday('now') - julianday(a.created_at) > 7 THEN 'overdue'
    WHEN julianday('now') - julianday(a.created_at) > 3 THEN 'urgent'
    ELSE 'normal'
  END as priority_level
FROM applications a
JOIN users u ON a.user_id = u.id
JOIN stores s ON a.store_id = s.id
WHERE a.status = 'pending'
ORDER BY a.created_at ASC;

CREATE VIEW IF NOT EXISTS store_utilization AS
SELECT 
  s.id as store_id,
  s.name as store_name,
  COUNT(l.id) as total_lockers,
  COUNT(CASE WHEN l.status = 'occupied' THEN 1 END) as occupied_lockers,
  COUNT(CASE WHEN l.status = 'available' THEN 1 END) as available_lockers,
  COUNT(CASE WHEN l.status = 'maintenance' THEN 1 END) as maintenance_lockers,
  ROUND(
    (COUNT(CASE WHEN l.status = 'occupied' THEN 1 END) * 100.0) / 
     NULLIF(COUNT(CASE WHEN l.status != 'out_of_order' THEN 1 END), 0), 
    2
  ) as utilization_percentage
FROM stores s
LEFT JOIN lockers l ON s.id = l.store_id
WHERE s.status = 'active'
GROUP BY s.id, s.name
ORDER BY utilization_percentage DESC;

CREATE VIEW IF NOT EXISTS user_activity_summary AS
SELECT 
  u.id as user_id,
  u.name as user_name,
  u.phone as user_phone,
  s.name as store_name,
  COUNT(lr.id) as total_operations,
  COUNT(CASE WHEN lr.action = 'store' THEN 1 END) as store_operations,
  COUNT(CASE WHEN lr.action = 'retrieve' THEN 1 END) as retrieve_operations,
  MAX(lr.created_at) as last_operation_at,
  julianday('now') - julianday(MAX(lr.created_at)) as days_since_last_operation
FROM users u
LEFT JOIN stores s ON u.store_id = s.id
LEFT JOIN locker_records lr ON u.id = lr.user_id
WHERE u.status = 'active'
GROUP BY u.id, u.name, u.phone, s.name
ORDER BY last_operation_at DESC;