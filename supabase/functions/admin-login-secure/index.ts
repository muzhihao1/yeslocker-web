// Secure Admin Authentication with Password Hashing and Security Features
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { 
  validateRequest, 
  validatePhoneNumber,
  checkRateLimit,
  generateSecureJWT,
  getSecurityHeaders,
  createErrorResponse,
  createSuccessResponse,
  logSecurityEvent,
  SECURITY_CONFIG
} from '../_shared/security.ts'

interface AdminLoginRequest {
  phone: string;
  password: string;
}

// Password hashing utilities
async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + salt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const computedHash = await hashPassword(password, salt)
  return computedHash === hash
}

function generateSalt(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
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

    const { phone, password }: AdminLoginRequest = await req.json()

    // Validate inputs
    const phoneValidation = validatePhoneNumber(phone)
    if (!phoneValidation.isValid) {
      return createErrorResponse(
        'Invalid phone number',
        phoneValidation.errors.join(', '),
        400
      )
    }

    if (!password || password.length < 6) {
      return createErrorResponse(
        'Invalid password',
        '密码不能为空且长度至少6位',
        400
      )
    }

    const sanitizedPhone = phoneValidation.sanitizedData
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = req.headers.get('user-agent') || ''

    // Rate limiting for admin login attempts (stricter than user login)
    const rateLimitKey = `admin_login_${ip}`
    const rateLimit = checkRateLimit(rateLimitKey, 3, 300000) // 3 attempts per 5 minutes
    
    if (!rateLimit.allowed) {
      logSecurityEvent('ADMIN_LOGIN_RATE_LIMIT_EXCEEDED', { phone: sanitizedPhone, ip }, 'high')
      return createErrorResponse(
        'Rate limit exceeded',
        '登录尝试过于频繁，请5分钟后再试',
        429
      )
    }

    // Get admin record with security info
    const { data: admin, error: adminError } = await supabaseClient
      .from('admins')
      .select(`
        id, phone, name, role, password_hash, password_salt, status,
        failed_login_attempts, locked_until, last_login_at,
        stores:store_id (
          id, name, address
        )
      `)
      .eq('phone', sanitizedPhone)
      .single()

    if (adminError || !admin) {
      logSecurityEvent('ADMIN_LOGIN_NOT_FOUND', { phone: sanitizedPhone, ip }, 'medium')
      
      return createErrorResponse(
        'Admin not found',
        '管理员账号不存在',
        404
      )
    }

    // Check if admin account is active
    if (admin.status !== 'active') {
      logSecurityEvent('ADMIN_LOGIN_INACTIVE_ACCOUNT', { phone: sanitizedPhone, admin_id: admin.id }, 'high')
      
      return createErrorResponse(
        'Account inactive',
        '管理员账号已被停用，请联系系统管理员',
        403
      )
    }

    // Check if account is locked
    if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
      const unlockTime = new Date(admin.locked_until).toLocaleString('zh-CN')
      logSecurityEvent('ADMIN_LOGIN_ACCOUNT_LOCKED', { phone: sanitizedPhone, admin_id: admin.id }, 'high')
      
      return createErrorResponse(
        'Account locked',
        `账号已被锁定，解锁时间：${unlockTime}`,
        423
      )
    }

    // Handle legacy passwords (for migration from old system)
    let isPasswordValid = false
    
    if (admin.password_salt) {
      // New secure password system
      isPasswordValid = await verifyPassword(password, admin.password_hash, admin.password_salt)
    } else {
      // Legacy system check (for backward compatibility during migration)
      const environment = Deno.env.get('ENVIRONMENT') || 'development'
      if (environment === 'development' && password === 'admin123') {
        isPasswordValid = true
        
        // Migrate to secure password system
        const newSalt = generateSalt()
        const newHash = await hashPassword(password, newSalt)
        
        await supabaseClient
          .from('admins')
          .update({ 
            password_hash: newHash, 
            password_salt: newSalt,
            password_changed_at: new Date().toISOString()
          })
          .eq('id', admin.id)
          
        logSecurityEvent('ADMIN_PASSWORD_MIGRATED', { admin_id: admin.id }, 'medium')
      }
    }

    if (!isPasswordValid) {
      // Increment failed login attempts
      const newFailedAttempts = (admin.failed_login_attempts || 0) + 1
      const maxAttempts = 5
      const lockoutDuration = 15 * 60 * 1000 // 15 minutes
      
      let updateData: any = { failed_login_attempts: newFailedAttempts }
      
      if (newFailedAttempts >= maxAttempts) {
        updateData.locked_until = new Date(Date.now() + lockoutDuration).toISOString()
        
        logSecurityEvent('ADMIN_ACCOUNT_LOCKED', { 
          phone: sanitizedPhone, 
          admin_id: admin.id, 
          failed_attempts: newFailedAttempts 
        }, 'high')
      }
      
      await supabaseClient
        .from('admins')
        .update(updateData)
        .eq('id', admin.id)

      // Log failed login attempt
      await supabaseClient
        .from('admin_login_logs')
        .insert({
          admin_id: admin.id,
          login_time: new Date().toISOString(),
          ip_address: ip,
          user_agent: userAgent,
          success: false,
          failure_reason: 'Invalid password'
        })

      logSecurityEvent('ADMIN_LOGIN_FAILED', { 
        phone: sanitizedPhone, 
        admin_id: admin.id, 
        failed_attempts: newFailedAttempts 
      }, 'medium')

      const remainingAttempts = maxAttempts - newFailedAttempts
      return createErrorResponse(
        'Invalid password',
        remainingAttempts > 0 
          ? `密码错误，还有 ${remainingAttempts} 次尝试机会`
          : '密码错误次数过多，账号已被锁定15分钟',
        401
      )
    }

    // Successful login - reset failed attempts and update last login
    await supabaseClient
      .from('admins')
      .update({
        failed_login_attempts: 0,
        locked_until: null,
        last_login_at: new Date().toISOString()
      })
      .eq('id', admin.id)

    // Generate secure JWT token for admin
    const tokenPayload = {
      admin_id: admin.id,
      phone: admin.phone,
      name: admin.name,
      role: admin.role,
      store_id: admin.stores?.id,
      user_type: 'admin'
    }

    const token = await generateSecureJWT(tokenPayload)

    // Log successful login
    const loginLogId = crypto.randomUUID()
    await supabaseClient
      .from('admin_login_logs')
      .insert({
        id: loginLogId,
        admin_id: admin.id,
        login_time: new Date().toISOString(),
        ip_address: ip,
        user_agent: userAgent,
        success: true
      })

    logSecurityEvent('ADMIN_LOGIN_SUCCESS', { 
      phone: sanitizedPhone, 
      admin_id: admin.id,
      session_id: loginLogId
    }, 'low')

    // Prepare response data
    const responseData = {
      admin: {
        id: admin.id,
        phone: admin.phone,
        name: admin.name,
        role: admin.role,
        last_login_at: admin.last_login_at
      },
      store: admin.stores,
      token,
      expires_in: SECURITY_CONFIG.JWT.EXPIRY_HOURS * 3600,
      session_id: loginLogId,
      permissions: getAdminPermissions(admin.role)
    }

    return createSuccessResponse(responseData, '登录成功')

  } catch (error) {
    console.error('Admin login error:', error)
    logSecurityEvent('ADMIN_LOGIN_ERROR', { error: error.message }, 'high')
    
    return createErrorResponse(
      'Internal server error',
      '服务器内部错误，请稍后重试',
      500
    )
  }
})

// Helper function to get admin permissions based on role
function getAdminPermissions(role: string): string[] {
  const permissions: Record<string, string[]> = {
    'super_admin': [
      'user.view', 'user.manage', 'user.delete',
      'admin.view', 'admin.manage', 'admin.create', 'admin.delete',
      'store.view', 'store.manage', 'store.create', 'store.delete',
      'locker.view', 'locker.manage', 'locker.create', 'locker.delete',
      'application.view', 'application.approve', 'application.reject',
      'statistics.view', 'statistics.export',
      'security.view', 'security.manage',
      'system.configure'
    ],
    'store_admin': [
      'user.view', 'user.manage',
      'locker.view', 'locker.manage',
      'application.view', 'application.approve', 'application.reject',
      'statistics.view'
    ],
    'operator': [
      'user.view',
      'locker.view',
      'application.view', 'application.approve'
    ]
  }
  
  return permissions[role] || permissions['operator']
}