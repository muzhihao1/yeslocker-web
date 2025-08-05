import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SMSRequest {
  phone: string;
  type: 'register' | 'login' | 'reminder';
}

// 腾讯云SMS配置 (需要在环境变量中设置)
const SMS_CONFIG = {
  secretId: Deno.env.get('TENCENT_SECRET_ID') ?? '',
  secretKey: Deno.env.get('TENCENT_SECRET_KEY') ?? '',
  sdkAppId: Deno.env.get('TENCENT_SMS_APP_ID') ?? '',
  signName: Deno.env.get('TENCENT_SMS_SIGN_NAME') ?? '',
  templateId: {
    register: Deno.env.get('TENCENT_SMS_TEMPLATE_REGISTER') ?? '',
    login: Deno.env.get('TENCENT_SMS_TEMPLATE_LOGIN') ?? '',
    reminder: Deno.env.get('TENCENT_SMS_TEMPLATE_REMINDER') ?? ''
  }
}

// 生成6位数字验证码
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// 计算SHA256哈希
async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// 计算HMAC-SHA256
async function hmacSha256(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(key)
  const messageData = encoder.encode(message)
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
  const signatureArray = Array.from(new Uint8Array(signature))
  return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// 生成腾讯云API v3签名
async function generateTencentSignature(
  secretId: string,
  secretKey: string,
  service: string,
  version: string,
  action: string,
  payload: string,
  timestamp: number
): Promise<string> {
  const date = new Date(timestamp * 1000).toISOString().split('T')[0]
  const host = `${service}.tencentcloudapi.com`
  
  // 1. 拼接规范请求串
  const httpRequestMethod = 'POST'
  const canonicalUri = '/'
  const canonicalQueryString = ''
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\n`
  const signedHeaders = 'content-type;host'
  const hashedRequestPayload = await sha256(payload)
  
  const canonicalRequest = [
    httpRequestMethod,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    hashedRequestPayload
  ].join('\n')
  
  // 2. 拼接待签名字符串
  const algorithm = 'TC3-HMAC-SHA256'
  const requestTimestamp = timestamp
  const credentialScope = `${date}/${service}/tc3_request`
  const hashedCanonicalRequest = await sha256(canonicalRequest)
  
  const stringToSign = [
    algorithm,
    requestTimestamp,
    credentialScope,
    hashedCanonicalRequest
  ].join('\n')
  
  // 3. 计算签名
  const secretDate = await hmacSha256(`TC3${secretKey}`, date)
  const secretService = await hmacSha256(secretDate, service)
  const secretSigning = await hmacSha256(secretService, 'tc3_request')
  const signature = await hmacSha256(secretSigning, stringToSign)
  
  // 4. 拼接Authorization
  const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  
  return authorization
}

// 发送腾讯云短信
async function sendTencentSMS(phone: string, templateParams: string[], type: string): Promise<boolean> {
  try {
    // 开发环境模拟发送成功
    if (Deno.env.get('ENVIRONMENT') === 'development') {
      console.log(`Development mode: SMS sending simulated to ${phone} with params:`, templateParams)
      return true
    }

    // 检查必要的配置
    if (!SMS_CONFIG.secretId || !SMS_CONFIG.secretKey || !SMS_CONFIG.sdkAppId || !SMS_CONFIG.signName) {
      console.error('SMS configuration missing')
      return false
    }

    // 根据类型选择模板ID  
    const templateId = SMS_CONFIG.templateId[type] || SMS_CONFIG.templateId.login
    if (!templateId) {
      console.error('SMS template ID not configured for type:', type)
      return false
    }

    // 构建API请求参数
    const timestamp = Math.floor(Date.now() / 1000)
    const payload = {
      PhoneNumberSet: [`+86${phone}`],
      TemplateID: templateId,
      TemplateParamSet: templateParams,
      SmsSdkAppid: SMS_CONFIG.sdkAppId,
      Sign: SMS_CONFIG.signName
    }
    
    const payloadString = JSON.stringify(payload)
    
    // 生成签名
    const authorization = await generateTencentSignature(
      SMS_CONFIG.secretId,
      SMS_CONFIG.secretKey,
      'sms',
      '2021-01-11',
      'SendSms',
      payloadString,
      timestamp
    )
    
    // 发送API请求
    const response = await fetch('https://sms.tencentcloudapi.com/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Host': 'sms.tencentcloudapi.com',
        'Authorization': authorization,
        'X-TC-Action': 'SendSms',
        'X-TC-Version': '2021-01-11',
        'X-TC-Timestamp': timestamp.toString(),
        'X-TC-Region': 'ap-guangzhou'
      },
      body: payloadString
    })

    if (!response.ok) {
      console.error('SMS API request failed:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('Error response:', errorText)
      return false
    }

    const result = await response.json()
    
    // 检查API响应
    if (result.Response?.Error) {
      console.error('SMS API error:', result.Response.Error)
      return false
    }
    
    if (result.Response?.SendStatusSet) {
      const sendStatus = result.Response.SendStatusSet[0]
      if (sendStatus?.Code === 'Ok') {
        console.log('SMS sent successfully to:', phone)
        return true
      } else {
        console.error('SMS sending failed:', sendStatus)
        return false
      }
    }
    
    console.error('Unexpected SMS API response:', result)
    return false

  } catch (error) {
    console.error('SMS sending error:', error)
    return false
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const { phone, type }: SMSRequest = await req.json()

    // 验证必填字段
    if (!phone || !type) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields', 
          message: '手机号和类型为必填项' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(phone)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid phone number', 
          message: '请输入有效的手机号码' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )
    }

    // 检查发送频率限制 (60秒内只能发送一次)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
    const { data: recentSMS, error: checkError } = await supabaseClient
      .from('sms_logs')
      .select('created_at')
      .eq('phone', phone)
      .gte('created_at', oneMinuteAgo)
      .limit(1)

    if (recentSMS && recentSMS.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Too frequent', 
          message: '发送过于频繁，请稍后再试' 
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )
    }

    // 生成验证码
    const verificationCode = generateVerificationCode()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5分钟后过期

    // 保存验证码到数据库
    const { error: saveError } = await supabaseClient
      .from('sms_verification_codes')
      .insert({
        phone,
        code: verificationCode,
        type,
        expires_at: expiresAt.toISOString(),
        used: false
      })

    if (saveError) {
      console.error('Save verification code error:', saveError)
      return new Response(
        JSON.stringify({ 
          error: 'Database error', 
          message: '验证码保存失败' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )
    }

    // 发送短信
    const smsSuccess = await sendTencentSMS(phone, [verificationCode, '5'], type)

    // 记录短信发送日志
    await supabaseClient
      .from('sms_logs')
      .insert({
        phone,
        type,
        success: smsSuccess,
        content: `验证码: ${verificationCode}`
      })

    if (!smsSuccess) {
      return new Response(
        JSON.stringify({ 
          error: 'SMS sending failed', 
          message: '短信发送失败，请稍后重试' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: '验证码发送成功',
        data: {
          phone,
          expires_in: 300 // 5分钟
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      },
    )

  } catch (error) {
    console.error('SMS sending error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: '服务器内部错误' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      },
    )
  }
})