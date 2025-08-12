-- Additional performance indexes for YesLocker PostgreSQL Database
-- These indexes target specific query patterns identified in the API

-- Composite indexes for common query combinations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_status_store_created 
ON applications(status, store_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_user_status 
ON applications(user_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lockers_store_status 
ON lockers(store_id, status);

-- Index for admin queries filtering by role and status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admins_role_status 
ON admins(role, status);

-- Time-based indexes for performance monitoring queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_active 
ON users(last_active_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_created_at 
ON applications(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_approved_at 
ON applications(approved_at DESC) WHERE approved_at IS NOT NULL;

-- Partial index for active users (more efficient than full index)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_last_active 
ON users(last_active_at DESC) WHERE status = 'active';

-- Partial index for available lockers (commonly queried)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lockers_available 
ON lockers(store_id, created_at) WHERE status = 'available';

-- Performance optimization for admin user management queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_store_status_name 
ON users(store_id, status, name);

-- Index for pending applications (admin dashboard)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_pending_created 
ON applications(store_id, created_at DESC) WHERE status = 'pending';

-- Index for complex admin queries with multiple filters
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_search_optimization 
ON users(phone, name, status);

-- Index for user locker statistics queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locker_records_user_action_created 
ON locker_records(user_id, action, created_at DESC);