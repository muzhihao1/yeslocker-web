-- Enhanced Foreign Key Constraints and Data Validation for SQLite
-- This file adds comprehensive data validation and referential integrity

-- Enable foreign key support (critical for SQLite)
PRAGMA foreign_keys = ON;

-- Add missing CHECK constraints for data validation

-- 1. Add status validation for users table
ALTER TABLE users ADD CONSTRAINT chk_users_status 
  CHECK (status IN ('active', 'inactive', 'suspended', 'pending'));

-- 2. Add phone number format validation
ALTER TABLE users ADD CONSTRAINT chk_users_phone_format 
  CHECK (phone GLOB '[1][3-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]');

-- 3. Add name length validation
ALTER TABLE users ADD CONSTRAINT chk_users_name_length 
  CHECK (length(name) >= 1 AND length(name) <= 50);

-- 4. Add status validation for stores table
ALTER TABLE stores ADD CONSTRAINT chk_stores_status 
  CHECK (status IN ('active', 'inactive', 'maintenance'));

-- 5. Add business hours format validation
ALTER TABLE stores ADD CONSTRAINT chk_stores_business_hours 
  CHECK (business_hours GLOB '*[0-9][0-9]:[0-9][0-9] - [0-9][0-9]:[0-9][0-9]*' OR business_hours IS NULL);

-- 6. Add phone format validation for stores
ALTER TABLE stores ADD CONSTRAINT chk_stores_phone_format 
  CHECK (phone GLOB '[0-9][0-9][0-9]-[0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9]' OR phone IS NULL);

-- 7. Add admin role validation
ALTER TABLE admins ADD CONSTRAINT chk_admins_role 
  CHECK (role IN ('super_admin', 'store_admin'));

-- 8. Add admin status validation
ALTER TABLE admins ADD CONSTRAINT chk_admins_status 
  CHECK (status IN ('active', 'inactive', 'suspended'));

-- 9. Add admin phone format validation
ALTER TABLE admins ADD CONSTRAINT chk_admins_phone_format 
  CHECK (phone GLOB '[1][3-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]');

-- 10. Add admin name length validation
ALTER TABLE admins ADD CONSTRAINT chk_admins_name_length 
  CHECK (length(name) >= 1 AND length(name) <= 50);

-- 11. Add locker status validation
ALTER TABLE lockers ADD CONSTRAINT chk_lockers_status 
  CHECK (status IN ('available', 'occupied', 'maintenance', 'out_of_order'));

-- 12. Add locker number format validation
ALTER TABLE lockers ADD CONSTRAINT chk_lockers_number_format 
  CHECK (length(number) >= 1 AND length(number) <= 10 AND number GLOB '[A-Z0-9]*');

-- 13. Add application status validation
ALTER TABLE applications ADD CONSTRAINT chk_applications_status 
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));

-- 14. Add locker type validation
ALTER TABLE applications ADD CONSTRAINT chk_applications_locker_type 
  CHECK (locker_type IN ('standard', 'premium', 'vip', 'mini') OR locker_type IS NULL);

-- 15. Add business logic constraints for applications
ALTER TABLE applications ADD CONSTRAINT chk_applications_approval_logic 
  CHECK (
    (status = 'approved' AND approved_by IS NOT NULL AND approved_at IS NOT NULL) OR 
    (status != 'approved')
  );

-- 16. Add rejection reason constraint
ALTER TABLE applications ADD CONSTRAINT chk_applications_rejection_reason 
  CHECK (
    (status = 'rejected' AND rejection_reason IS NOT NULL) OR 
    (status != 'rejected')
  );

-- 17. Add locker records action validation
ALTER TABLE locker_records ADD CONSTRAINT chk_locker_records_action 
  CHECK (action IN ('assigned', 'store', 'retrieve', 'released', 'maintenance'));

-- 18. Add reminders type validation
ALTER TABLE reminders ADD CONSTRAINT chk_reminders_type 
  CHECK (type IN ('general', 'maintenance', 'urgent', 'system'));

-- 19. Add reminders title length validation
ALTER TABLE reminders ADD CONSTRAINT chk_reminders_title_length 
  CHECK (length(title) >= 1 AND length(title) <= 200);

-- Business Logic Constraints

-- 20. Ensure store admins can only manage their assigned store
CREATE TRIGGER trg_admin_store_constraint
  BEFORE INSERT ON admins
  WHEN NEW.role = 'store_admin' AND NEW.store_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'Store admins must be assigned to a store');
END;

-- 21. Ensure super admins don't need a specific store assignment
CREATE TRIGGER trg_super_admin_store_constraint
  BEFORE INSERT ON admins
  WHEN NEW.role = 'super_admin' AND NEW.store_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'Super admins should not be assigned to a specific store');
END;

-- 22. Ensure locker assignment consistency
CREATE TRIGGER trg_locker_assignment_consistency
  BEFORE UPDATE ON lockers
  WHEN NEW.status = 'occupied' AND NEW.current_user_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'Occupied lockers must have a current_user_id');
END;

-- 23. Ensure locker availability consistency
CREATE TRIGGER trg_locker_availability_consistency
  BEFORE UPDATE ON lockers
  WHEN NEW.status = 'available' AND NEW.current_user_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'Available lockers cannot have a current_user_id');
END;

-- 24. Prevent duplicate active applications per user-store combination
CREATE TRIGGER trg_prevent_duplicate_applications
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

-- 25. Ensure approved applications have assigned lockers
CREATE TRIGGER trg_approved_application_locker
  BEFORE UPDATE ON applications
  WHEN NEW.status = 'approved' AND NEW.assigned_locker_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'Approved applications must have an assigned locker');
END;

-- Enhanced Referential Integrity

-- 26. Cascade delete for user data when user is deleted
-- Note: SQLite foreign keys already handle this, but we add explicit triggers for complex logic

CREATE TRIGGER trg_user_deletion_cleanup
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

-- 27. Handle store deletion properly
CREATE TRIGGER trg_store_deletion_cleanup
  BEFORE DELETE ON stores
BEGIN
  -- Check if store has active users
  SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM users WHERE store_id = OLD.id AND status = 'active')
    THEN RAISE(ABORT, 'Cannot delete store with active users')
  END;
  
  -- Check if store has occupied lockers
  SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM lockers WHERE store_id = OLD.id AND status = 'occupied')
    THEN RAISE(ABORT, 'Cannot delete store with occupied lockers')
  END;
END;

-- Data Quality Triggers

-- 28. Auto-set locker assigned_at when status changes to occupied
CREATE TRIGGER trg_locker_assigned_at
  AFTER UPDATE ON lockers
  WHEN NEW.status = 'occupied' AND OLD.status != 'occupied'
BEGIN
  UPDATE lockers 
  SET assigned_at = datetime('now') 
  WHERE id = NEW.id;
END;

-- 29. Auto-clear locker assigned_at when status changes from occupied
CREATE TRIGGER trg_locker_cleared_at
  AFTER UPDATE ON lockers
  WHEN OLD.status = 'occupied' AND NEW.status != 'occupied'
BEGIN
  UPDATE lockers 
  SET assigned_at = NULL 
  WHERE id = NEW.id;
END;

-- 30. Update user last_active_at on locker operations
CREATE TRIGGER trg_update_user_activity
  AFTER INSERT ON locker_records
BEGIN
  UPDATE users 
  SET last_active_at = datetime('now') 
  WHERE id = NEW.user_id;
END;

-- Logging and Audit Triggers

-- 31. Log application status changes
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

CREATE TRIGGER trg_application_status_audit
  AFTER UPDATE OF status ON applications
  WHEN OLD.status != NEW.status
BEGIN
  INSERT INTO application_audit_log (application_id, old_status, new_status, changed_by, notes)
  VALUES (NEW.id, OLD.status, NEW.status, NEW.approved_by, 
          CASE NEW.status 
            WHEN 'rejected' THEN NEW.rejection_reason
            ELSE NULL 
          END);
END;

-- Performance and Maintenance

-- 32. Add additional indexes for constraint checking performance
CREATE INDEX IF NOT EXISTS idx_applications_user_store_status 
  ON applications(user_id, store_id, status);

CREATE INDEX IF NOT EXISTS idx_lockers_status_user 
  ON lockers(status, current_user_id);

CREATE INDEX IF NOT EXISTS idx_admins_role_store 
  ON admins(role, store_id);

CREATE INDEX IF NOT EXISTS idx_locker_records_action_created 
  ON locker_records(action, created_at DESC);

-- 33. Create views for common business queries
CREATE VIEW IF NOT EXISTS active_user_lockers AS
SELECT 
  u.id as user_id,
  u.name as user_name,
  u.phone as user_phone,
  l.id as locker_id,
  l.number as locker_number,
  s.name as store_name,
  l.assigned_at,
  l.status
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
  DATE(a.created_at) as days_pending
FROM applications a
JOIN users u ON a.user_id = u.id
JOIN stores s ON a.store_id = s.id
WHERE a.status = 'pending'
ORDER BY a.created_at ASC;