import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RegisterRequest {
  phone: string;
  name: string;
  avatar_url?: string;
  store_id: string;
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

    const { phone, name, avatar_url, store_id }: RegisterRequest = await req.json()

    // 验证必填字段
    if (!phone || !name || !store_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields', 
          message: '手机号、姓名和门店为必填项' 
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

    // 已移除短信验证功能，直接进行注册

    // 检查手机号是否已注册
    const { data: existingUser, error: checkError } = await supabaseClient
      .from('users')
      .select('id')
      .eq('phone', phone)
      .single()

    if (existingUser) {
      return new Response(
        JSON.stringify({ 
          error: 'Phone already registered', 
          message: '该手机号已注册' 
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )
    }

    // 验证门店是否存在
    const { data: store, error: storeError } = await supabaseClient
      .from('stores')
      .select('id, name')
      .eq('id', store_id)
      .eq('status', 'active')
      .single()

    if (storeError || !store) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid store', 
          message: '选择的门店不存在或已停用' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )
    }

    // 创建用户记录
    const { data: user, error: createError } = await supabaseClient
      .from('users')
      .insert({
        phone,
        name,
        avatar_url: avatar_url || null,
        store_id,
        status: 'active'
      })
      .select()
      .single()

    if (createError) {
      console.error('User creation error:', createError)
      return new Response(
        JSON.stringify({ 
          error: 'Registration failed', 
          message: '注册失败，请稍后重试' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )
    }

    // 使用Supabase Auth创建认证用户，使用手机号作为密码
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      phone,
      password: phone, // 使用手机号作为默认密码
      phone_confirmed_at: new Date().toISOString(),
      user_metadata: {
        name,
        store_id,
        user_type: 'customer'
      }
    })

    if (authError) {
      console.error('Auth user creation error:', authError)
      // 如果认证用户创建失败，删除已创建的用户记录
      await supabaseClient.from('users').delete().eq('id', user.id)
      
      return new Response(
        JSON.stringify({ 
          error: 'Authentication setup failed', 
          message: '认证设置失败，请稍后重试' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )
    }

    // 更新数据库用户记录，关联auth用户ID
    await supabaseClient
      .from('users')
      .update({ id: authData.user.id })
      .eq('id', user.id)

    return new Response(
      JSON.stringify({
        success: true,
        message: '注册成功',
        data: {
          user_id: authData.user.id,
          phone: user.phone,
          name: user.name,
          store: store.name
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      },
    )

  } catch (error) {
    console.error('Registration error:', error)
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