-- Fix User-Store Association for Existing Approved Applications
-- This script updates the store_id for users who have approved locker applications
-- but their store_id is still NULL (due to the bug fixed in commit 342fefe)

-- Step 1: Check current state of user 3134
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.store_id as user_store_id,
    a.id as application_id,
    a.store_id as application_store_id,
    a.status as application_status,
    a.assigned_locker_id,
    l.number as locker_number,
    l.store_id as locker_store_id,
    s.name as store_name
FROM users u
LEFT JOIN applications a ON a.user_id = u.id AND a.status = 'approved'
LEFT JOIN lockers l ON a.assigned_locker_id = l.id
LEFT JOIN stores s ON a.store_id = s.id
WHERE u.id = '51c733d7-b7de-48b2-8650-b47668797e3d';

-- Step 2: Update all users with approved applications but NULL store_id
UPDATE users u
SET 
    store_id = a.store_id,
    updated_at = NOW()
FROM applications a
WHERE 
    u.id = a.user_id 
    AND a.status = 'approved'
    AND u.store_id IS NULL
    AND a.store_id IS NOT NULL;

-- Step 3: Verify the fix for user 3134
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.store_id as user_store_id,
    s.name as store_name,
    l.number as locker_number,
    l.status as locker_status
FROM users u
LEFT JOIN stores s ON u.store_id = s.id
LEFT JOIN applications a ON a.user_id = u.id AND a.status = 'approved'
LEFT JOIN lockers l ON a.assigned_locker_id = l.id
WHERE u.id = '51c733d7-b7de-48b2-8650-b47668797e3d';

-- Step 4: Check if there's a "测试门店" in the database
SELECT * FROM stores WHERE name LIKE '%测试%' OR address LIKE '%测试%';

-- Step 5: List all stores to see what's actually in the database
SELECT id, name, address, status FROM stores ORDER BY name;