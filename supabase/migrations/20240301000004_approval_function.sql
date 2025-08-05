-- 批准杆柜申请的原子操作函数
-- Terminal 2: Admin Approval Transaction

CREATE OR REPLACE FUNCTION approve_locker_application(
    p_application_id UUID,
    p_user_id UUID,
    p_locker_id UUID,
    p_approved_by UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- 开始事务
    -- 1. 更新申请状态
    UPDATE applications 
    SET 
        status = 'approved',
        approved_by = p_approved_by,
        approved_at = CURRENT_TIMESTAMP
    WHERE id = p_application_id AND status = 'pending';

    -- 检查申请是否更新成功
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found or already processed';
    END IF;

    -- 2. 分配杆柜给用户
    UPDATE lockers 
    SET 
        status = 'occupied',
        user_id = p_user_id,
        assigned_at = CURRENT_TIMESTAMP
    WHERE id = p_locker_id AND status = 'available';

    -- 检查杆柜是否分配成功
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Locker not available or not found';
    END IF;

    -- 3. 更新用户的杆柜绑定
    UPDATE users 
    SET 
        locker_id = p_locker_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;

    -- 检查用户更新是否成功
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- 如果所有操作都成功，函数正常结束，事务会自动提交
END;
$$;

-- 回收杆柜的函数
CREATE OR REPLACE FUNCTION release_locker(
    p_user_id UUID,
    p_locker_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- 1. 更新杆柜状态
    UPDATE lockers 
    SET 
        status = 'available',
        user_id = NULL,
        assigned_at = NULL
    WHERE id = p_locker_id AND user_id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Locker not found or not assigned to user';
    END IF;

    -- 2. 清除用户的杆柜绑定
    UPDATE users 
    SET 
        locker_id = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
END;
$$;