// Secure Authentication: Request OTP for Login/Registration
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { 
  validateRequest, 
  validatePhoneNumber, 
  checkRateLimit,
  generateOTP, 
  hashOTP, 
  sendSMS,
  getSecurityHeaders,
  createErrorResponse,
  createSuccessResponse,
  logSecurityEvent,
  SECURITY_CONFIG
} from '../_shared/security.ts'

interface OTPRequest {
  phone: string;
  type: 'login' | 'register';
  name?: string; // Required for registration
  store_id?: string; // Required for registration
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getSecurityHeaders() })
  }

  try {
    // Validate request security
    const requestValidation = await validateRequest(req)
    if (!requestValidation.isValid) {
      return createErrorResponse(
        'Request validation failed',
        requestValidation.errors.join(', '),
        400
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role for admin operations
    )

    const { phone, type, name, store_id }: OTPRequest = await req.json()

    // Validate phone number
    const phoneValidation = validatePhoneNumber(phone)
    if (!phoneValidation.isValid) {
      return createErrorResponse(
        'Invalid phone number',
        phoneValidation.errors.join(', '),
        400
      )
    }

    const sanitizedPhone = phoneValidation.sanitizedData

    // Additional validation for registration
    if (type === 'register') {
      if (!name || !store_id) {
        return createErrorResponse(
          'Missing required fields',
          '注册需要提供姓名和门店信息',
          400
        )
      }

      // Check if phone already exists
      const { data: existingUser } = await supabaseClient
        .from('users')
        .select('id')
        .eq('phone', sanitizedPhone)
        .single()

      if (existingUser) {
        return createErrorResponse(
          'Phone already registered',
          '该手机号已注册，请直接登录',
          409
        )
      }

      // Validate store exists
      const { data: store, error: storeError } = await supabaseClient
        .from('stores')
        .select('id, name')
        .eq('id', store_id)
        .eq('status', 'active')
        .single()

      if (storeError || !store) {
        return createErrorResponse(
          'Invalid store',
          '选择的门店不存在或已停用',
          400
        )
      }
    } else if (type === 'login') {
      // Check if user exists
      const { data: user, error: userError } = await supabaseClient
        .from('users')
        .select('id, status')
        .eq('phone', sanitizedPhone)
        .single()

      if (userError || !user) {
        return createErrorResponse(
          'User not found',
          '用户不存在，请先注册',
          404
        )
      }

      if (user.status !== 'active') {
        return createErrorResponse(
          'Account disabled',
          '账户已被停用，请联系客服',
          403
        )
      }
    }

    // Rate limiting for OTP requests (stricter limit)
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitKey = `otp_${ip}_${sanitizedPhone}`
    const rateLimit = checkRateLimit(rateLimitKey, 3, 60000) // 3 requests per minute per phone
    
    if (!rateLimit.allowed) {
      logSecurityEvent('OTP_RATE_LIMIT_EXCEEDED', { phone: sanitizedPhone, ip }, 'high')
      return createErrorResponse(
        'Rate limit exceeded',
        '验证码请求过于频繁，请稍后再试',
        429
      )
    }

    // Check for existing unexpired OTP
    const { data: existingOTP } = await supabaseClient
      .from('otp_codes')
      .select('id, created_at')
      .eq('phone', sanitizedPhone)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .single()

    if (existingOTP) {
      const cooldownEnd = new Date(existingOTP.created_at).getTime() + SECURITY_CONFIG.OTP.RESEND_COOLDOWN
      if (Date.now() < cooldownEnd) {
        const waitSeconds = Math.ceil((cooldownEnd - Date.now()) / 1000)
        return createErrorResponse(
          'OTP cooldown active',
          `请等待 ${waitSeconds} 秒后再次请求验证码`,
          429
        )
      }
    }

    // Generate new OTP
    const otp = generateOTP()
    const hashedOTP = await hashOTP(otp)
    const expiresAt = new Date(Date.now() + SECURITY_CONFIG.OTP.EXPIRY_MINUTES * 60 * 1000)

    // Store OTP in database
    const { error: otpError } = await supabaseClient
      .from('otp_codes')
      .insert({
        phone: sanitizedPhone,
        code_hash: hashedOTP,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
        used: false,
        type,
        metadata: type === 'register' ? { name, store_id } : {}
      })

    if (otpError) {
      console.error('OTP storage error:', otpError)
      return createErrorResponse(
        'OTP generation failed',
        '验证码生成失败，请稍后重试',
        500
      )
    }

    // Send SMS OTP
    const smsMessage = `【YesLocker】您的验证码是：${otp}，${SECURITY_CONFIG.OTP.EXPIRY_MINUTES}分钟内有效。请勿泄露给他人。`
    const smsResult = await sendSMS(sanitizedPhone, smsMessage)

    if (!smsResult.success) {
      // Delete the OTP record if SMS failed
      await supabaseClient
        .from('otp_codes')
        .delete()
        .eq('phone', sanitizedPhone)
        .eq('code_hash', hashedOTP)

      logSecurityEvent('SMS_SEND_FAILED', { phone: sanitizedPhone, error: smsResult.error }, 'high')
      
      return createErrorResponse(
        'SMS sending failed',
        '短信发送失败，请检查手机号码或稍后重试',
        500
      )
    }

    // Log successful OTP generation
    logSecurityEvent('OTP_GENERATED', { phone: sanitizedPhone, type }, 'low')

    return createSuccessResponse(
      {
        phone: sanitizedPhone,
        expires_in: SECURITY_CONFIG.OTP.EXPIRY_MINUTES * 60, // seconds
        resend_cooldown: SECURITY_CONFIG.OTP.RESEND_COOLDOWN / 1000 // seconds
      },
      `验证码已发送至 ${sanitizedPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}`
    )

  } catch (error) {
    console.error('OTP request error:', error)
    logSecurityEvent('OTP_REQUEST_ERROR', { error: error.message }, 'high')
    
    return createErrorResponse(
      'Internal server error',
      '服务器内部错误，请稍后重试',
      500
    )
  }
})