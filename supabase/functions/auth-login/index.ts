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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // 使用service role key绕过RLS策略
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
      .select('id, phone, name, avatar_url, status, store_id, locker_id')
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

    // 获取门店信息
    let store = null
    if (user.store_id) {
      const { data: storeData } = await supabaseClient
        .from('stores')
        .select('id, name, address')
        .eq('id', user.store_id)
        .single()
      store = storeData
    }

    // 获取杆柜信息 (如果有)
    let locker = null
    if (user.locker_id) {
      const { data: lockerData } = await supabaseClient
        .from('lockers')
        .select('id, number, status')
        .eq('id', user.locker_id)
        .single()
      locker = lockerData
    }

    // 生成访问令牌 (简化实现，实际生产环境应使用JWT)
    const tokenPayload = {
      user_id: user.id,
      phone: user.phone,
      store_id: user.store_id,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24小时过期
    }
    
    // 简化实现：使用base64编码作为访问令牌
    const access_token = btoa(JSON.stringify(tokenPayload))

    // 记录登录操作
    await supabaseClient
      .from('locker_records')
      .insert({
        user_id: user.id,
        locker_id: user.locker_id,
        store_id: user.store_id,
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
          store,
          locker,
          access_token
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