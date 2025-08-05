# SMS 集成配置指南

本指南将帮助您配置腾讯云短信服务，以便在 YesLocker 系统中发送验证码和通知短信。

## 配置概览

YesLocker 使用腾讯云短信服务发送以下类型的短信：
- 用户注册验证码
- 用户登录验证码  
- 杆柜使用提醒通知
- 审核结果通知

## 准备工作

### 1. 注册腾讯云账号
- 访问 [腾讯云官网](https://cloud.tencent.com/)
- 注册并完成实名认证

### 2. 开通短信服务
- 登录腾讯云控制台
- 搜索"短信"服务
- 点击"立即开通"

## 配置步骤

### 步骤 1：创建短信应用

1. 进入[短信控制台](https://console.cloud.tencent.com/smsv2)
2. 点击"应用管理" > "应用列表" > "创建应用"
3. 输入应用名称（如：YesLocker）
4. 创建成功后，记录下 `SDKAppID`

### 步骤 2：获取 API 密钥

1. 进入[访问管理控制台](https://console.cloud.tencent.com/cam/capi)
2. 点击"新建密钥"
3. 记录下生成的 `SecretId` 和 `SecretKey`
4. **重要**：请妥善保管密钥，不要泄露给他人

### 步骤 3：申请短信签名

1. 进入短信控制台 > "国内短信" > "签名管理"
2. 点击"创建签名"
3. 填写签名信息：
   - 签名类型：选择"公司"或"APP"
   - 签名内容：如"YesLocker"或您的品牌名
   - 证明类型：根据实际情况选择
   - 上传证明文件
4. 提交审核（通常需要2小时左右）
5. 审核通过后，记录下签名内容

### 步骤 4：创建短信模板

需要创建以下三个模板：

#### 4.1 验证码模板（注册/登录）
- 模板名称：用户验证码
- 模板内容：`您的验证码为：{1}，该验证码{2}分钟内有效，请勿泄露给他人。`
- 模板类型：验证码
- 提交审核后记录模板ID

#### 4.2 提醒通知模板
- 模板名称：杆柜使用提醒
- 模板内容：`尊敬的{1}，您在本店的{2}号杆柜已超过{3}未使用，请及时前往使用或释放杆柜。`
- 模板类型：通知
- 提交审核后记录模板ID

#### 4.3 审核结果通知模板
- 模板名称：杆柜申请结果通知
- 模板内容：`尊敬的{1}，您的杆柜申请{2}。如有疑问请联系门店。`
- 模板类型：通知
- 提交审核后记录模板ID

### 步骤 5：配置环境变量

#### 开发环境（.env.local）
```bash
# 腾讯云短信配置
TENCENT_SECRET_ID=您的SecretId
TENCENT_SECRET_KEY=您的SecretKey
TENCENT_SMS_APP_ID=您的SDKAppID
TENCENT_SMS_SIGN_NAME=您的签名内容
TENCENT_SMS_TEMPLATE_REGISTER=验证码模板ID
TENCENT_SMS_TEMPLATE_LOGIN=验证码模板ID
TENCENT_SMS_TEMPLATE_REMINDER=提醒模板ID
TENCENT_SMS_TEMPLATE_APPROVAL=审核结果模板ID

# 开发环境标识（开发时设为 development 以使用模拟发送）
ENVIRONMENT=development
```

#### 生产环境（Vercel）
1. 登录 Vercel 控制台
2. 选择您的项目
3. 进入 Settings > Environment Variables
4. 添加以下环境变量：
   - `TENCENT_SECRET_ID`
   - `TENCENT_SECRET_KEY`
   - `TENCENT_SMS_APP_ID`
   - `TENCENT_SMS_SIGN_NAME`
   - `TENCENT_SMS_TEMPLATE_REGISTER`
   - `TENCENT_SMS_TEMPLATE_LOGIN`
   - `TENCENT_SMS_TEMPLATE_REMINDER`
   - `TENCENT_SMS_TEMPLATE_APPROVAL`
   - `ENVIRONMENT` 设为 `production`

#### Supabase Edge Functions
1. 登录 Supabase 控制台
2. 选择您的项目
3. 进入 Edge Functions > Settings
4. 添加相同的环境变量

## 测试配置

### 1. 本地测试
```bash
# 启动本地开发环境
npm run dev
npm run functions:serve

# 测试发送验证码
# 在登录页面输入手机号并点击发送验证码
```

### 2. 生产环境测试
- 部署到生产环境后
- 使用真实手机号测试各类短信发送功能

## 费用说明

腾讯云短信按量计费：
- 国内短信：约 0.045 元/条（具体价格以腾讯云官网为准）
- 首次开通赠送一定免费额度
- 建议设置费用预警

## 常见问题

### Q1: 短信发送失败
- 检查环境变量是否正确配置
- 确认签名和模板已审核通过
- 查看 Supabase Functions 日志排查错误

### Q2: 签名/模板审核不通过
- 确保签名与证明材料一致
- 模板内容不要包含营销性质内容
- 变量使用 {1}、{2} 格式

### Q3: 开发环境如何测试
- 设置 `ENVIRONMENT=development`
- 系统会模拟发送成功，不会真实发送短信
- 验证码统一为 `123456`

## 安全建议

1. **密钥安全**
   - 不要将密钥提交到代码仓库
   - 使用环境变量管理密钥
   - 定期轮换密钥

2. **发送限制**
   - 系统已实现 60 秒发送间隔限制
   - 建议在腾讯云设置日发送量上限
   - 监控异常发送行为

3. **验证码安全**
   - 验证码 5 分钟有效期
   - 使用后立即失效
   - 存储时不记录明文

## 后续优化建议

1. 实现短信发送统计功能
2. 添加多通道备份（如阿里云短信）
3. 实现短信模板动态管理
4. 添加发送失败重试机制
5. 实现更细粒度的发送频率控制

## 技术支持

如遇到问题，可以：
1. 查看腾讯云短信服务文档
2. 查看 Supabase Edge Functions 日志
3. 联系腾讯云技术支持