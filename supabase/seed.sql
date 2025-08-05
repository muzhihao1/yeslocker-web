-- Seed data for local development

-- Insert test stores
INSERT INTO stores (id, name, address, phone, status) VALUES
  ('11111111-1111-1111-1111-111111111111', '望京店', '北京市朝阳区望京街道', '010-12345678', 'active'),
  ('22222222-2222-2222-2222-222222222222', '三里屯店', '北京市朝阳区三里屯路', '010-23456789', 'active'),
  ('33333333-3333-3333-3333-333333333333', '国贸店', '北京市朝阳区建国门外大街', '010-34567890', 'active'),
  ('44444444-4444-4444-4444-444444444444', '中关村店', '北京市海淀区中关村大街', '010-45678901', 'active'),
  ('55555555-5555-5555-5555-555555555555', '五道口店', '北京市海淀区成府路', '010-56789012', 'active')
ON CONFLICT (id) DO NOTHING;

-- Insert test admins (password: admin123)
INSERT INTO admins (id, phone, password, name, role, store_id, status) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '13800000001', 'admin123', '超级管理员', 'super', NULL, 'active'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '13800000002', 'admin123', '望京店管理员', 'store', '11111111-1111-1111-1111-111111111111', 'active')
ON CONFLICT (id) DO NOTHING;

-- Insert test lockers for each store
DO $$
DECLARE
  store_record RECORD;
  locker_number TEXT;
  i INTEGER;
BEGIN
  FOR store_record IN SELECT id FROM stores WHERE status = 'active'
  LOOP
    FOR i IN 1..20 LOOP
      locker_number := LPAD(i::TEXT, 3, '0');
      INSERT INTO lockers (store_id, locker_number, type, status)
      VALUES (
        store_record.id,
        locker_number,
        CASE 
          WHEN i <= 10 THEN 'small'
          WHEN i <= 15 THEN 'medium'
          ELSE 'large'
        END,
        CASE 
          WHEN i % 3 = 0 THEN 'occupied'
          ELSE 'available'
        END
      ) ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;