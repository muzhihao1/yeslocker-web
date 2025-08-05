// Shared Security Utilities for YesLocker Edge Functions

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { requests: number[], windowStart: number }>()

// Security configuration
export const SECURITY_CONFIG = {
  RATE_LIMIT: {
    WINDOW_MS: 60000, // 1 minute
    MAX_REQUESTS: 10,
    LOCKOUT_DURATION: 300000, // 5 minutes
  },
  OTP: {
    LENGTH: 6,
    EXPIRY_MINUTES: 5,
    MAX_ATTEMPTS: 3,
    RESEND_COOLDOWN: 60000, // 1 minute
  },
  JWT: {
    EXPIRY_HOURS: 8,
    ALGORITHM: 'HS256',
  },
  VALIDATION: {
    PHONE_REGEX: /^1[3-9]\d{9}$/,
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 50,
    MAX_REQUEST_SIZE: 1024 * 1024, // 1MB
  }
}

// Security headers for all responses
export function getSecurityHeaders(additionalHeaders: Record<string, string> = {}) {
  const environment = Deno.env.get('ENVIRONMENT') || 'development'
  const allowedOrigins = environment === 'production' 
    ? Deno.env.get('ALLOWED_ORIGINS') || 'https://yourdomain.com'
    : '*' // Allow all origins in development only

  return {
    'Access-Control-Allow-Origin': allowedOrigins,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'",
    'Content-Type': 'application/json',
    ...additionalHeaders
  }
}

// Rate limiting implementation
export function checkRateLimit(identifier: string, customLimit?: number, customWindow?: number): { allowed: boolean, resetTime?: number } {
  const now = Date.now()
  const maxRequests = customLimit || SECURITY_CONFIG.RATE_LIMIT.MAX_REQUESTS
  const windowMs = customWindow || SECURITY_CONFIG.RATE_LIMIT.WINDOW_MS
  
  const current = rateLimitStore.get(identifier)
  
  if (!current) {
    rateLimitStore.set(identifier, {
      requests: [now],
      windowStart: now
    })
    return { allowed: true }
  }
  
  // Clean old requests outside the current window
  const windowStart = now - windowMs
  const recentRequests = current.requests.filter(time => time > windowStart)
  
  if (recentRequests.length >= maxRequests) {
    const oldestRequest = Math.min(...recentRequests)
    const resetTime = oldestRequest + windowMs
    return { allowed: false, resetTime }
  }
  
  // Add current request
  recentRequests.push(now)
  rateLimitStore.set(identifier, {
    requests: recentRequests,
    windowStart: windowStart
  })
  
  return { allowed: true }
}

// Input validation and sanitization
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  sanitizedData?: any
}

export function validatePhoneNumber(phone: string): ValidationResult {
  const errors: string[] = []
  
  if (!phone) {
    errors.push('Phone number is required')
  } else if (!SECURITY_CONFIG.VALIDATION.PHONE_REGEX.test(phone)) {
    errors.push('Invalid phone number format')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: phone?.trim()
  }
}

export function validateName(name: string): ValidationResult {
  const errors: string[] = []
  
  if (!name) {
    errors.push('Name is required')
  } else {
    const trimmedName = name.trim()
    if (trimmedName.length < SECURITY_CONFIG.VALIDATION.NAME_MIN_LENGTH) {
      errors.push(`Name must be at least ${SECURITY_CONFIG.VALIDATION.NAME_MIN_LENGTH} characters`)
    } else if (trimmedName.length > SECURITY_CONFIG.VALIDATION.NAME_MAX_LENGTH) {
      errors.push(`Name must be no more than ${SECURITY_CONFIG.VALIDATION.NAME_MAX_LENGTH} characters`)
    }
    
    // Remove potentially harmful characters
    const sanitized = trimmedName.replace(/[<>\"'&\x00-\x1F\x7F]/g, '')
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: sanitized
    }
  }
  
  return { isValid: false, errors }
}

// Request validation middleware
export async function validateRequest(req: Request): Promise<ValidationResult> {
  const errors: string[] = []
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  const userAgent = req.headers.get('user-agent') || ''
  const contentLength = parseInt(req.headers.get('content-length') || '0')
  
  // Check rate limiting
  const rateLimitResult = checkRateLimit(ip)
  if (!rateLimitResult.allowed) {
    return {
      isValid: false,
      errors: [`Rate limit exceeded. Try again at ${new Date(rateLimitResult.resetTime!).toISOString()}`]
    }
  }
  
  // Check request size
  if (contentLength > SECURITY_CONFIG.VALIDATION.MAX_REQUEST_SIZE) {
    errors.push('Request too large')
  }
  
  // Basic bot detection
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i
  ]
  
  if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
    errors.push('Automated requests not allowed')
  }
  
  // Content-Type validation for POST requests
  if (req.method === 'POST') {
    const contentType = req.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      errors.push('Invalid content type. Expected application/json')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// OTP generation and management
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function hashOTP(otp: string): Promise<string> {
  const salt = Deno.env.get('OTP_SALT') || 'yeslocker-default-salt'
  const encoder = new TextEncoder()
  const data = encoder.encode(otp + salt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyOTP(otp: string, hashedOTP: string): Promise<boolean> {
  const computedHash = await hashOTP(otp)
  return computedHash === hashedOTP
}

// JWT token generation and verification
export async function generateSecureJWT(payload: any): Promise<string> {
  const secret = Deno.env.get('JWT_SECRET') || 'your-very-secure-jwt-secret-change-in-production'
  const header = {
    alg: SECURITY_CONFIG.JWT.ALGORITHM,
    typ: 'JWT'
  }
  
  const now = Math.floor(Date.now() / 1000)
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + (SECURITY_CONFIG.JWT.EXPIRY_HOURS * 3600),
    iss: 'yeslocker-api',
    aud: 'yeslocker-app'
  }
  
  const encoder = new TextEncoder()
  const headerEncoded = btoa(JSON.stringify(header)).replace(/=/g, '')
  const payloadEncoded = btoa(JSON.stringify(tokenPayload)).replace(/=/g, '')
  
  const signatureInput = `${headerEncoded}.${payloadEncoded}`
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signatureInput))
  const signatureArray = Array.from(new Uint8Array(signature))
  const signatureEncoded = btoa(String.fromCharCode(...signatureArray)).replace(/=/g, '')
  
  return `${headerEncoded}.${payloadEncoded}.${signatureEncoded}`
}

export async function verifyJWT(token: string): Promise<{ valid: boolean, payload?: any, error?: string }> {
  try {
    const [headerEncoded, payloadEncoded, signatureEncoded] = token.split('.')
    
    if (!headerEncoded || !payloadEncoded || !signatureEncoded) {
      return { valid: false, error: 'Invalid token format' }
    }
    
    const payload = JSON.parse(atob(payloadEncoded))
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token expired' }
    }
    
    // Verify signature
    const secret = Deno.env.get('JWT_SECRET') || 'your-very-secure-jwt-secret-change-in-production'
    const encoder = new TextEncoder()
    const signatureInput = `${headerEncoded}.${payloadEncoded}`
    
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    
    const expectedSignature = await crypto.subtle.sign('HMAC', key, encoder.encode(signatureInput))
    const expectedSignatureArray = Array.from(new Uint8Array(expectedSignature))
    const expectedSignatureEncoded = btoa(String.fromCharCode(...expectedSignatureArray)).replace(/=/g, '')
    
    if (signatureEncoded !== expectedSignatureEncoded) {
      return { valid: false, error: 'Invalid signature' }
    }
    
    return { valid: true, payload }
  } catch (error) {
    return { valid: false, error: 'Token verification failed' }
  }
}

// SMS sending utility (mock implementation - replace with actual SMS service)
export async function sendSMS(phone: string, message: string): Promise<{ success: boolean, error?: string }> {
  try {
    // Mock implementation - replace with actual SMS service
    console.log(`[SMS Mock] Sending to ${phone}: ${message}`)
    
    // In production, implement actual SMS sending:
    // const tencentSMS = new TencentSMSService()
    // return await tencentSMS.send(phone, message)
    
    return { success: true }
  } catch (error) {
    console.error('SMS sending failed:', error)
    return { success: false, error: 'Failed to send SMS' }
  }
}

// Logging and monitoring utilities
export function logSecurityEvent(event: string, details: any, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    severity,
    details,
    source: 'yeslocker-security'
  }
  
  console.log(`[SECURITY-${severity.toUpperCase()}]`, JSON.stringify(logEntry))
  
  // In production, send to monitoring service
  // await sendToMonitoringService(logEntry)
}

// Error response helper
export function createErrorResponse(
  error: string, 
  message: string, 
  statusCode: number = 400,
  additionalHeaders: Record<string, string> = {}
): Response {
  logSecurityEvent('API_ERROR', { error, message, statusCode }, 'medium')
  
  return new Response(
    JSON.stringify({ error, message }),
    { 
      status: statusCode, 
      headers: getSecurityHeaders(additionalHeaders)
    }
  )
}

// Success response helper
export function createSuccessResponse(
  data: any,
  message: string = 'Success',
  additionalHeaders: Record<string, string> = {}
): Response {
  return new Response(
    JSON.stringify({ success: true, message, data }),
    { 
      status: 200, 
      headers: getSecurityHeaders(additionalHeaders)
    }
  )
}