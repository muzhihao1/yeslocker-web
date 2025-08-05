-- 初始数据

-- 插入示例门店
INSERT INTO stores (id, name, address, contact) VALUES 
('550e8400-e29b-41d4-a716-446655440001', '旗舰店', '北京市朝阳区建国路88号', '010-12345678'),
('550e8400-e29b-41d4-a716-446655440002', '东城分店', '北京市东城区王府井大街1号', '010-87654321'),
('550e8400-e29b-41d4-a716-446655440003', '西城分店', '北京市西城区西单北大街120号', '010-11111111');

-- 插入管理员（密码都是 admin123 的 bcrypt hash）
-- 注意：实际部署时请修改密码
INSERT INTO admins (username, password, name, role, store_id) VALUES 
('admin', '$2b$10$xJI2h6HdKaJfN9GfXzkPxO.5kQcXKYPm4rKG5Hh3.gKxR1SQ1q7hK', '超级管理员', 'super_admin', NULL),
('store1', '$2b$10$xJI2h6HdKaJfN9GfXzkPxO.5kQcXKYPm4rKG5Hh3.gKxR1SQ1q7hK', '旗舰店管理员', 'store_admin', '550e8400-e29b-41d4-a716-446655440001'),
('store2', '$2b$10$xJI2h6HdKaJfN9GfXzkPxO.5kQcXKYPm4rKG5Hh3.gKxR1SQ1q7hK', '东城店管理员', 'store_admin', '550e8400-e29b-41d4-a716-446655440002');

-- 插入示例杆柜（每个门店10个）
INSERT INTO lockers (store_id, number, status) 
SELECT 
  '550e8400-e29b-41d4-a716-446655440001',
  'A' || LPAD(generate_series::text, 3, '0'),
  'available'
FROM generate_series(1, 10);

INSERT INTO lockers (store_id, number, status) 
SELECT 
  '550e8400-e29b-41d4-a716-446655440002',
  'B' || LPAD(generate_series::text, 3, '0'),
  'available'
FROM generate_series(1, 10);

INSERT INTO lockers (store_id, number, status) 
SELECT 
  '550e8400-e29b-41d4-a716-446655440003',
  'C' || LPAD(generate_series::text, 3, '0'),
  'available'
FROM generate_series(1, 10);

-- 插入提醒事项
INSERT INTO reminders (store_id, title, content, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', '欢迎使用杆柜', '请妥善保管您的球杆，定期清洁保养。', true),
('550e8400-e29b-41d4-a716-446655440001', '营业时间', '营业时间：周一至周日 10:00-22:00', true),
('550e8400-e29b-41d4-a716-446655440002', '会员福利', '会员可享受免费杆柜服务，详情请咨询前台。', true);