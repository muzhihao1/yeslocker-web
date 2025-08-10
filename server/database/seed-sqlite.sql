-- YesLocker SQLite 测试种子数据

-- 清空现有数据 (开发环境使用)
DELETE FROM locker_records;
DELETE FROM applications;
DELETE FROM lockers;
DELETE FROM users;
DELETE FROM admins;
DELETE FROM stores;
DELETE FROM reminders;

-- 插入门店数据
INSERT INTO stores (id, name, address, phone, status) VALUES 
('store_1', '旗舰店', '北京市朝阳区望京街道SOHO现代城', '010-12345678', 'active'),
('store_2', '分店A', '北京市海淀区中关村大街', '010-87654321', 'active'),
('store_3', '分店B', '北京市东城区王府井大街', '010-11223344', 'active');

-- 插入管理员数据
INSERT INTO admins (id, phone, password, name, role, store_id, status) VALUES 
('admin_1', '13800000001', 'admin123', '超级管理员', 'super_admin', NULL, 'active'),
('admin_2', '13800000002', 'admin123', '门店管理员', 'store_admin', 'store_1', 'active'),
('admin_3', '13800000003', 'admin123', '门店管理员B', 'store_admin', 'store_2', 'active');

-- 插入用户数据
INSERT INTO users (id, phone, name, password, avatar_url, store_id, status) VALUES 
('user_1', '13800000010', '张三', 'user123', NULL, 'store_1', 'active'),
('user_2', '13800000011', '李四', 'user123', NULL, 'store_1', 'active'),
('user_3', '13800000012', '王五', 'user123', NULL, 'store_2', 'active'),
('user_4', '13800000013', '赵六', 'user123', NULL, 'store_1', 'active'),
('user_5', '13800000014', '孙七', 'user123', NULL, 'store_2', 'active');

-- 插入杆柜数据
INSERT INTO lockers (id, store_id, number, status, current_user_id) VALUES 
-- 旗舰店杆柜
('locker_001', 'store_1', 'A-001', 'occupied', 'user_2'),
('locker_002', 'store_1', 'A-002', 'available', NULL),
('locker_003', 'store_1', 'A-003', 'available', NULL),
('locker_004', 'store_1', 'A-004', 'available', NULL),
('locker_005', 'store_1', 'B-001', 'available', NULL),
('locker_006', 'store_1', 'B-002', 'available', NULL),
('locker_007', 'store_1', 'B-003', 'maintenance', NULL),
('locker_008', 'store_1', 'B-004', 'available', NULL),

-- 分店A杆柜
('locker_101', 'store_2', 'A-001', 'occupied', 'user_5'),
('locker_102', 'store_2', 'A-002', 'available', NULL),
('locker_103', 'store_2', 'A-003', 'available', NULL),
('locker_104', 'store_2', 'A-004', 'available', NULL),
('locker_105', 'store_2', 'B-001', 'available', NULL),
('locker_106', 'store_2', 'B-002', 'available', NULL),

-- 分店B杆柜
('locker_201', 'store_3', 'A-001', 'available', NULL),
('locker_202', 'store_3', 'A-002', 'available', NULL),
('locker_203', 'store_3', 'A-003', 'available', NULL),
('locker_204', 'store_3', 'A-004', 'available', NULL);

-- 插入申请数据
INSERT INTO applications (id, user_id, store_id, locker_type, purpose, notes, status, assigned_locker_id, approved_by, approved_at) VALUES 
-- 已批准的申请
('app_1', 'user_2', 'store_1', '标准杆柜', '存放私人球杆', '我是会员，需要长期存放', 'approved', 'locker_001', 'admin_2', datetime('now', '-2 days')),
('app_2', 'user_5', 'store_2', '大型杆柜', '存放多支球杆', '比赛用杆需要专门存放', 'approved', 'locker_101', 'admin_3', datetime('now', '-1 day')),

-- 待审核的申请
('app_3', 'user_1', 'store_1', '标准杆柜', '临时存放', '周末来打球需要存杆', 'pending', NULL, NULL, NULL),
('app_4', 'user_4', 'store_1', '标准杆柜', '长期存放', '每天都来打球', 'pending', NULL, NULL, NULL),
('app_5', 'user_3', 'store_2', '标准杆柜', '存放球杆', '申请存放台球杆', 'pending', NULL, NULL, NULL),

-- 被拒绝的申请
('app_6', 'user_3', 'store_2', '豪华杆柜', '存放多支杆', '杆柜已满', 'rejected', NULL, 'admin_3', datetime('now', '-3 days'));

-- 插入使用记录
INSERT INTO locker_records (id, user_id, locker_id, action, notes) VALUES 
-- 用户2的使用记录
('record_1', 'user_2', 'locker_001', 'assigned', '管理员分配杆柜'),
('record_2', 'user_2', 'locker_001', 'store', '存放球杆'),
('record_3', 'user_2', 'locker_001', 'retrieve', '取出球杆'),
('record_4', 'user_2', 'locker_001', 'store', '存放球杆'),

-- 用户5的使用记录  
('record_5', 'user_5', 'locker_101', 'assigned', '管理员分配杆柜'),
('record_6', 'user_5', 'locker_101', 'store', '存放比赛用杆'),
('record_7', 'user_5', 'locker_101', 'retrieve', '取出球杆参加比赛'),
('record_8', 'user_5', 'locker_101', 'store', '比赛结束存放');

-- 插入提醒事项
INSERT INTO reminders (id, title, content, type, is_active) VALUES 
('reminder_1', '维护通知', '本周六凌晨2:00-4:00进行系统维护，杆柜暂停使用', 'maintenance', 1),
('reminder_2', '新功能上线', '杆柜管理系统新增二维码扫码功能，欢迎体验', 'general', 1),
('reminder_3', '节日优惠', '春节期间杆柜租金8折优惠，先到先得', 'general', 1);

-- 更新已分配杆柜的时间戳
UPDATE lockers SET assigned_at = datetime('now', '-2 days') WHERE id = 'locker_001';
UPDATE lockers SET assigned_at = datetime('now', '-1 day') WHERE id = 'locker_101';