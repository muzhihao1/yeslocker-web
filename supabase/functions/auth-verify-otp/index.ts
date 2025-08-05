// Secure Authentication: Verify OTP and Complete Login/Registration
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { 
  validateRequest, 
  validatePhoneNumber,
  validateName,
  checkRateLimit,
  verifyOTP, 
  generateSecureJWT,
  getSecurityHeaders,
  createErrorResponse,
  createSuccessResponse,
  logSecurityEvent,
  SECURITY_CONFIG
} from '../_shared/security.ts'

interface OTPVerifyRequest {
  phone: string;
  otp: string;
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { phone, otp }: OTPVerifyRequest = await req.json()

    // Validate inputs
    const phoneValidation = validatePhoneNumber(phone)
    if (!phoneValidation.isValid) {
      return createErrorResponse(
        'Invalid phone number',
        phoneValidation.errors.join(', '),
        400
      )
    }

    if (!otp || otp.length !== SECURITY_CONFIG.OTP.LENGTH) {
      return createErrorResponse(
        'Invalid OTP',
        '请输入6位验证码',
        400
      )
    }

    const sanitizedPhone = phoneValidation.sanitizedData

    // Rate limiting for OTP verification attempts
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitKey = `verify_${ip}_${sanitizedPhone}`
    const rateLimit = checkRateLimit(rateLimitKey, 5, 60000) // 5 attempts per minute
    
    if (!rateLimit.allowed) {
      logSecurityEvent('OTP_VERIFY_RATE_LIMIT_EXCEEDED', { phone: sanitizedPhone, ip }, 'high')
      return createErrorResponse(
        'Rate limit exceeded',
        '验证尝试过于频繁，请稍后再试',
        429
      )
    }

    // Get OTP record from database
    const { data: otpRecord, error: otpError } = await supabaseClient
      .from('otp_codes')
      .select('*')
      .eq('phone', sanitizedPhone)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (otpError || !otpRecord) {
      logSecurityEvent('OTP_NOT_FOUND', { phone: sanitizedPhone }, 'medium')
      return createErrorResponse(
        'OTP not found',
        '验证码不存在或已过期，请重新获取',
        404
      )
    }

    // Check maximum attempts
    if (otpRecord.attempts >= SECURITY_CONFIG.OTP.MAX_ATTEMPTS) {
      // Mark OTP as used to prevent further attempts
      await supabaseClient
        .from('otp_codes')
        .update({ used: true })
        .eq('id', otpRecord.id)

      logSecurityEvent('OTP_MAX_ATTEMPTS_EXCEEDED', { phone: sanitizedPhone }, 'high')
      return createErrorResponse(
        'Too many attempts',
        '验证码尝试次数过多，请重新获取',
        429
      )
    }

    // Verify OTP
    const isValidOTP = await verifyOTP(otp, otpRecord.code_hash)
    
    if (!isValidOTP) {
      // Increment attempt counter
      await supabaseClient
        .from('otp_codes')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('id', otpRecord.id)

      logSecurityEvent('OTP_INVALID', { phone: sanitizedPhone, attempts: otpRecord.attempts + 1 }, 'medium')
      
      const remainingAttempts = SECURITY_CONFIG.OTP.MAX_ATTEMPTS - (otpRecord.attempts + 1)
      return createErrorResponse(
        'Invalid OTP',
        `验证码错误，还有 ${remainingAttempts} 次尝试机会`,
        400
      )
    }

    // Mark OTP as used
    await supabaseClient
      .from('otp_codes')
      .update({ used: true, verified_at: new Date().toISOString() })
      .eq('id', otpRecord.id)

    // Handle based on OTP type
    let userData: any
    let isNewUser = false

    if (otpRecord.type === 'register') {
      // Registration flow
      const metadata = otpRecord.metadata as any
      
      if (!metadata?.name || !metadata?.store_id) {
        return createErrorResponse(
          'Invalid registration data',
          '注册信息不完整',
          400
        )
      }

      // Validate name
      const nameValidation = validateName(metadata.name)
      if (!nameValidation.isValid) {
        return createErrorResponse(
          'Invalid name',
          nameValidation.errors.join(', '),
          400
        )
      }

      // Create new user
      const { data: newUser, error: createError } = await supabaseClient
        .from('users')
        .insert({
          phone: sanitizedPhone,
          name: nameValidation.sanitizedData,
          store_id: metadata.store_id,
          status: 'active',
          created_at: new Date().toISOString()
        })
        .select(`
          id, phone, name, status, created_at,
          stores:store_id (
            id, name, address
          )
        `)
        .single()

      if (createError) {
        console.error('User creation error:', createError)
        logSecurityEvent('USER_CREATION_FAILED', { phone: sanitizedPhone, error: createError.message }, 'high')
        return createErrorResponse(
          'Registration failed',
          '注册失败，请稍后重试',
          500
        )
      }

      userData = newUser
      isNewUser = true
      
      logSecurityEvent('USER_REGISTERED', { phone: sanitizedPhone, user_id: newUser.id }, 'low')

    } else {
      // Login flow - get existing user
      const { data: existingUser, error: userError } = await supabaseClient
        .from('users')
        .select(`
          id, phone, name, status, created_at,
          stores:store_id (
            id, name, address
          )
        `)
        .eq('phone', sanitizedPhone)
        .eq('status', 'active')
        .single()

      if (userError || !existingUser) {
        logSecurityEvent('USER_NOT_FOUND', { phone: sanitizedPhone }, 'medium')
        return createErrorResponse(
          'User not found',
          '用户不存在或已被停用',
          404
        )
      }

      userData = existingUser
      
      logSecurityEvent('USER_LOGGED_IN', { phone: sanitizedPhone, user_id: existingUser.id }, 'low')
    }

    // Generate secure JWT token
    const tokenPayload = {
      user_id: userData.id,
      phone: userData.phone,
      name: userData.name,
      store_id: userData.stores[0]?.id,
      user_type: 'customer'
    }

    const token = await generateSecureJWT(tokenPayload)

    // Update last login time
    await supabaseClient
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userData.id)

    // Prepare response data
    const responseData = {
      user: {
        id: userData.id,
        phone: userData.phone,
        name: userData.name,
        status: userData.status,
        created_at: userData.created_at
      },
      store: userData.stores,
      token,
      expires_in: SECURITY_CONFIG.JWT.EXPIRY_HOURS * 3600, // seconds
      is_new_user: isNewUser
    }

    return createSuccessResponse(
      responseData,
      isNewUser ? '注册成功！' : '登录成功！'
    )

  } catch (error) {
    console.error('OTP verification error:', error)
    logSecurityEvent('OTP_VERIFY_ERROR', { error: error.message }, 'high')
    
    return createErrorResponse(
      'Internal server error',
      '服务器内部错误，请稍后重试',
      500
    )
  }
})