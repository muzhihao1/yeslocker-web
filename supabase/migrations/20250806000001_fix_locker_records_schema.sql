-- 修复 locker_records 表缺少 application_id 列的问题
-- 这个迁移添加必需的列来支持 inactive_lockers_view 视图

-- 添加 application_id 列
ALTER TABLE locker_records 
ADD COLUMN application_id UUID REFERENCES applications(id);

-- 添加索引以提高性能  
CREATE INDEX IF NOT EXISTS idx_locker_records_application_created 
ON locker_records(application_id, created_at);

-- 添加注释
COMMENT ON COLUMN locker_records.application_id IS '关联的申请记录ID，用于跟踪操作与申请的关系';