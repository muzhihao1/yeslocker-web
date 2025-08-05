import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LoginRequest {
  phone: string;
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

    const { phone }: LoginRequest = await req.json()

    // 验证必填字段
    if (!phone) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields', 
          message: '手机号为必填项' 
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

    // 已移除短信验证功能

    // 检查用户是否存在
    const { data: user, error: userError } = await supabaseClient
      .from('users')
      .select(`
        id, phone, name, avatar_url, status,
        stores:store_id (
          id, name, address
        ),
        lockers:locker_id (
          id, number, status
        )
      `)
      .eq('phone', phone)
      .eq('status', 'active')
      .single()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ 
          error: 'User not found', 
          message: '用户不存在或已停用，请先注册' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )
    }

    // 使用Supabase Auth进行登录，使用手机号作为密码
    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
      phone,
      password: phone // 使用手机号作为密码
    })

    if (authError) {
      console.error('Auth login error:', authError)
      return new Response(
        JSON.stringify({ 
          error: 'Login failed', 
          message: '登录失败，请稍后重试' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )
    }

    // 记录登录操作
    await supabaseClient
      .from('locker_records')
      .insert({
        user_id: user.id,
        locker_id: user.lockers?.id || null,
        store_id: user.stores.id,
        action_type: 'login',
        notes: 'User login via mobile app'
      })

    return new Response(
      JSON.stringify({
        success: true,
        message: '登录成功',
        data: {
          user: {
            id: user.id,
            phone: user.phone,
            name: user.name,
            avatar_url: user.avatar_url
          },
          store: user.stores,
          locker: user.lockers,
          session: authData.session
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      },
    )

  } catch (error) {
    console.error('Login error:', error)
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