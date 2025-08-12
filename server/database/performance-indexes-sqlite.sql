-- Additional performance indexes for YesLocker SQLite Database
-- These indexes target specific query patterns identified in the API

-- Composite indexes for common query combinations
CREATE INDEX IF NOT EXISTS idx_applications_status_store_created 
ON applications(status, store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_applications_user_status 
ON applications(user_id, status);

CREATE INDEX IF NOT EXISTS idx_lockers_store_status 
ON lockers(store_id, status);

-- Index for admin queries filtering by role and status
CREATE INDEX IF NOT EXISTS idx_admins_role_status 
ON admins(role, status);

-- Time-based indexes for performance monitoring queries
CREATE INDEX IF NOT EXISTS idx_users_last_active 
ON users(last_active_at DESC);

CREATE INDEX IF NOT EXISTS idx_locker_records_created_at 
ON locker_records(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_applications_created_at 
ON applications(created_at DESC);

-- Covering index for common user dashboard queries
CREATE INDEX IF NOT EXISTS idx_users_active_with_store 
ON users(status, last_active_at DESC) 
WHERE status = 'active';

-- Index for locker availability queries
CREATE INDEX IF NOT EXISTS idx_lockers_available 
ON lockers(store_id, status, created_at) 
WHERE status = 'available';

-- Performance optimization for admin user management queries
CREATE INDEX IF NOT EXISTS idx_users_store_status_name 
ON users(store_id, status, name);