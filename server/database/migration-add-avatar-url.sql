-- PostgreSQL Migration: Add avatar_url column to users table if it doesn't exist

-- Check and add avatar_url column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE users ADD COLUMN avatar_url TEXT;
        RAISE NOTICE 'Added avatar_url column to users table';
    ELSE
        RAISE NOTICE 'avatar_url column already exists';
    END IF;
END $$;

-- Ensure column can accept NULL values
ALTER TABLE users ALTER COLUMN avatar_url DROP NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_users_avatar_url ON users(avatar_url);

-- Display the table structure after migration
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;