import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AdminLoginRequest {
  phone: string;
  password: string;
}

// 简单的密码哈希验证函数 (生产环境应使用bcrypt等安全库)
function verifyPassword(password: string, hash: string): boolean {
  // TODO: 实现实际的密码验证
  // 开发阶段简单比较，生产环境需要使用bcrypt
  if (Deno.env.get('ENVIRONMENT') === 'development') {
    return password === 'admin123' || hash === '$2b$10$dummy.hash.for.dev.only'
  }
  return password === hash // 临时实现
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // 使用service role key获取管理员权限
    )

    const { phone, password }: AdminLoginRequest = await req.json()

    // 验证必填字段
    if (!phone || !password) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields', 
          message: '手机号和密码为必填项' 
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

    // 查找管理员账号
    const { data: admin, error: adminError } = await supabaseClient
      .from('admins')
      .select(`
        id, phone, name, role, password_hash, status,
        stores:store_id (
          id, name, address
        )
      `)
      .eq('phone', phone)
      .eq('status', 'active')
      .single()

    if (adminError || !admin) {
      return new Response(
        JSON.stringify({ 
          error: 'Admin not found', 
          message: '管理员账号不存在或已停用' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )
    }

    // 验证密码
    if (!verifyPassword(password, admin.password_hash)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid password', 
          message: '密码错误' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )
    }

    // 创建管理员会话token
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      phone,
      phone_confirm: true,
      user_metadata: {
        name: admin.name,
        role: admin.role,
        store_id: admin.stores[0]?.id,
        user_type: 'admin'
      }
    })

    if (authError) {
      console.error('Admin auth creation error:', authError)
    }

    // 生成JWT token (简化实现)
    const tokenPayload = {
      admin_id: admin.id,
      phone: admin.phone,
      role: admin.role,
      store_id: admin.stores[0]?.id,
      exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60) // 8小时过期
    }

    // TODO: 使用实际的JWT库生成token
    const token = btoa(JSON.stringify(tokenPayload))

    // 记录登录日志
    await supabaseClient
      .from('admin_login_logs')
      .insert({
        admin_id: admin.id,
        login_time: new Date().toISOString(),
        ip_address: req.headers.get('x-forwarded-for') || 'unknown'
      })

    return new Response(
      JSON.stringify({
        success: true,
        message: '登录成功',
        data: {
          admin: {
            id: admin.id,
            phone: admin.phone,
            name: admin.name,
            role: admin.role
          },
          store: admin.stores,
          token,
          expires_in: 28800 // 8小时
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      },
    )

  } catch (error) {
    console.error('Admin login error:', error)
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