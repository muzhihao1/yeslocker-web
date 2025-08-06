-- 启用 pg_cron 扩展用于定时任务
-- 注意：在生产环境中，可能需要通过 Supabase Dashboard 启用此扩展
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 创建定时任务：每天凌晨1点检查提醒
-- 注意：在生产环境部署时，需要替换 PROJECT_REF 和 SERVICE_ROLE_KEY
-- SELECT cron.schedule(
--   'yeslocker-reminder-check',
--   '0 1 * * *',
--   $$SELECT net.http_post(
--     url:='https://PROJECT_REF.supabase.co/functions/v1/reminder-check',
--     headers:=jsonb_build_object(
--       'Authorization', 'Bearer SERVICE_ROLE_KEY',
--       'Content-Type', 'application/json'
--     )
--   ) as request_id;$$
-- );

-- 更新 reminders 表结构，添加更多字段
-- 注意：sent_at 列已经在初始schema中存在，这里只添加新的字段
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT true;

-- 创建提醒统计视图
CREATE OR REPLACE VIEW reminder_stats AS
SELECT 
  DATE_TRUNC('day', sent_at) as date,
  reminder_type,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE success = true) as successful,
  COUNT(*) FILTER (WHERE success = false) as failed
FROM reminders 
WHERE sent_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', sent_at), reminder_type
ORDER BY date DESC;

-- 创建用户活跃度统计视图
CREATE OR REPLACE VIEW user_activity_stats AS
SELECT 
  u.id,
  u.name,
  u.phone,
  u.created_at,
  COALESCE(lr.last_operation, u.created_at) as last_activity,
  EXTRACT(days FROM (NOW() - COALESCE(lr.last_operation, u.created_at))) as days_inactive,
  CASE 
    WHEN EXTRACT(days FROM (NOW() - COALESCE(lr.last_operation, u.created_at))) <= 7 THEN 'active'
    WHEN EXTRACT(days FROM (NOW() - COALESCE(lr.last_operation, u.created_at))) <= 30 THEN 'semi_active'  
    WHEN EXTRACT(days FROM (NOW() - COALESCE(lr.last_operation, u.created_at))) <= 90 THEN 'inactive'
    ELSE 'dormant'
  END as activity_status,
  a.current_applications
FROM users u
LEFT JOIN (
  SELECT 
    user_id,
    MAX(created_at) as last_operation
  FROM locker_records 
  GROUP BY user_id
) lr ON u.id = lr.user_id
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(*) as current_applications
  FROM applications 
  WHERE status = 'approved'
  GROUP BY user_id
) a ON u.id = a.user_id;

-- 添加必需的 application_id 列（如果不存在）
ALTER TABLE locker_records 
ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES applications(id);

-- 添加索引以提高性能（如果不存在）
CREATE INDEX IF NOT EXISTS idx_locker_records_application_created 
ON locker_records(application_id, created_at);

-- 创建长期未使用杆柜的视图
CREATE OR REPLACE VIEW inactive_lockers_view AS
SELECT 
  a.id as application_id,
  a.user_id,
  u.name as user_name,
  u.phone as user_phone,
  l.number as locker_number,
  s.name as store_name,
  a.approved_at,
  COALESCE(
    (SELECT MAX(created_at) FROM locker_records WHERE application_id = a.id),
    a.approved_at
  ) as last_operation_at,
  EXTRACT(days FROM (
    NOW() - COALESCE(
      (SELECT MAX(created_at) FROM locker_records WHERE application_id = a.id),
      a.approved_at
    )
  )) as days_inactive
FROM applications a
JOIN users u ON a.user_id = u.id
JOIN lockers l ON a.store_id = l.store_id AND a.requested_locker_number = l.number  
JOIN stores s ON l.store_id = s.id
WHERE a.status = 'approved'
  AND EXTRACT(days FROM (
    NOW() - COALESCE(
      (SELECT MAX(created_at) FROM locker_records WHERE application_id = a.id),
      a.approved_at
    )
  )) >= 90
ORDER BY days_inactive DESC;

-- 创建提醒发送函数（用于手动触发）
CREATE OR REPLACE FUNCTION send_manual_reminder(user_id_param UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- 调用 Edge Function
  -- 注意：需要在数据库中设置 app.settings.supabase_url 和 app.settings.service_role_key
  SELECT net.http_post(
    url := 'https://' || COALESCE(current_setting('app.settings.supabase_url', true), 'PROJECT_REF.supabase.co') || '/functions/v1/reminder-check',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || COALESCE(current_setting('app.settings.service_role_key', true), 'SERVICE_ROLE_KEY'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('user_id', user_id_param)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建批量提醒函数
CREATE OR REPLACE FUNCTION send_batch_reminders()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- 调用 Edge Function 进行批量提醒检查
  -- 注意：需要在数据库中设置 app.settings.supabase_url 和 app.settings.service_role_key
  SELECT net.http_post(
    url := 'https://' || COALESCE(current_setting('app.settings.supabase_url', true), 'PROJECT_REF.supabase.co') || '/functions/v1/reminder-check',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || COALESCE(current_setting('app.settings.service_role_key', true), 'SERVICE_ROLE_KEY'),
      'Content-Type', 'application/json'
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建索引以提高性能
CREATE INDEX IF NOT EXISTS idx_reminders_sent_at ON reminders(sent_at);
CREATE INDEX IF NOT EXISTS idx_reminders_user_reminder_type ON reminders(user_id, reminder_type);
CREATE INDEX IF NOT EXISTS idx_applications_status_approved_at ON applications(status, approved_at) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_locker_records_application_created ON locker_records(application_id, created_at);

-- 插入系统配置
INSERT INTO system_config (key, value, description) VALUES 
  ('reminder_frequency_days', '7', '提醒发送频率（天）'),
  ('reminder_threshold_days', '90', '触发提醒的未使用天数阈值'),
  ('reminder_sms_enabled', 'true', '是否启用短信提醒'),
  ('reminder_notification_enabled', 'true', '是否启用应用内通知提醒')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- 添加注释
COMMENT ON VIEW reminder_stats IS '提醒发送统计，显示过去30天的提醒发送情况';
COMMENT ON VIEW user_activity_stats IS '用户活跃度统计，根据最后操作时间计算用户活跃状态';
COMMENT ON VIEW inactive_lockers_view IS '长期未使用杆柜视图，显示90天以上未使用的杆柜';
COMMENT ON FUNCTION send_manual_reminder(UUID) IS '手动发送单个用户提醒';  
COMMENT ON FUNCTION send_batch_reminders() IS '批量发送提醒，通常由定时任务调用';

-- 创建定时任务（需要在生产环境中手动配置）
-- 这里提供配置说明，实际部署时需要通过 Supabase Dashboard 或 CLI 配置

/*
配置定时任务的步骤：

1. 在 Supabase Dashboard 中启用 pg_cron 扩展

2. 执行以下 SQL 来创建定时任务：
   SELECT cron.schedule(
     'yeslocker-reminder-check',
     '0 1 * * *',  -- 每天凌晨1点执行
     'SELECT send_batch_reminders();'
   );

3. 查看定时任务状态：
   SELECT * FROM cron.job;

4. 删除定时任务（如果需要）：
   SELECT cron.unschedule('yeslocker-reminder-check');

5. 手动执行提醒检查：
   SELECT send_batch_reminders();

环境变量配置：
- SUPABASE_URL: Supabase 项目 URL
- SUPABASE_SERVICE_ROLE_KEY: 服务角色密钥
- TENCENT_SECRET_ID: 腾讯云密钥 ID
- TENCENT_SECRET_KEY: 腾讯云密钥 Key
- TENCENT_SMS_APP_ID: 腾讯云短信应用 ID
- TENCENT_SMS_SIGN_NAME: 短信签名
- TENCENT_SMS_TEMPLATE_REGISTER: 注册短信模板 ID
- TENCENT_SMS_TEMPLATE_LOGIN: 登录短信模板 ID  
- TENCENT_SMS_TEMPLATE_REMINDER: 提醒短信模板 ID
*/