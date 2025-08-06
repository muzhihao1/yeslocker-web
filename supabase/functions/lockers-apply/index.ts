import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LockerApplyRequest {
  store_id: string;
  requested_locker_number?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Simple deployment test - this should show up if deployment works
  console.log('🚀 lockers-apply function called - v4 deployment test')

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // 使用service role key
    )

    // 获取用户认证信息
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing authorization', 
          message: '请先登录' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )
    }

    // 解析简化的access token
    const token = authHeader.replace('Bearer ', '')
    let user_id: string;
    
    // Enhanced debugging for token parsing
    console.log('🔍 JWT Debug Info:')
    console.log('- Token length:', token.length)
    console.log('- Token preview:', token.substring(0, 50) + '...')
    
    try {
      // Step 1: Base64 decode
      let decodedToken: string;
      try {
        decodedToken = atob(token);
        console.log('✅ Base64 decode successful')
        console.log('- Decoded length:', decodedToken.length)
      } catch (base64Error) {
        console.error('❌ Base64 decode failed:', base64Error)
        throw new Error(`Base64 decode failed: ${base64Error.message}`)
      }
      
      // Step 2: JSON parse  
      let tokenData: any;
      try {
        tokenData = JSON.parse(decodedToken)
        console.log('✅ JSON parse successful')
        console.log('- Token data keys:', Object.keys(tokenData))
        console.log('- user_id present:', !!tokenData.user_id)
        console.log('- exp present:', !!tokenData.exp)
      } catch (jsonError) {
        console.error('❌ JSON parse failed:', jsonError)
        throw new Error(`JSON parse failed: ${jsonError.message}`)
      }
      
      // Step 3: Extract user_id
      user_id = tokenData.user_id
      if (!user_id) {
        throw new Error('Missing user_id in token')
      }
      console.log('✅ user_id extracted:', user_id)
      
      // Step 4: Check token expiry
      if (tokenData.exp && tokenData.exp < Math.floor(Date.now() / 1000)) {
        const expDate = new Date(tokenData.exp * 1000)
        const nowDate = new Date()
        console.log('❌ Token expired - exp:', expDate.toISOString(), 'now:', nowDate.toISOString())
        throw new Error('Token expired')
      }
      console.log('✅ Token expiry check passed')
      
    } catch (error) {
      console.error('❌ Token parsing failed:', error.message)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid token', 
          message: '登录已过期，请重新登录',
          debug_info: 'lockers-apply-v3-enhanced-debugging',
          debug_error: error.message,
          debug_token_length: token.length
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )
    }

    const { store_id, requested_locker_number }: LockerApplyRequest = await req.json()

    // 验证必填字段
    if (!store_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields', 
          message: '门店ID为必填项' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )
    }

    // 检查用户是否已有杆柜
    const { data: currentUser, error: userError } = await supabaseClient
      .from('users')
      .select('id, name, phone, locker_id, store_id')
      .eq('id', user_id)
      .single()

    if (userError) {
      return new Response(
        JSON.stringify({ 
          error: 'User not found', 
          message: '用户信息不存在' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )
    }

    if (currentUser.locker_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Already has locker', 
          message: '您已经拥有杆柜，每个用户只能申请一个杆柜' 
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )
    }

    // 检查是否有待审核的申请
    const { data: pendingApplication, error: pendingError } = await supabaseClient
      .from('applications')
      .select('id')
      .eq('user_id', user_id)
      .eq('status', 'pending')
      .single()

    if (pendingApplication) {
      return new Response(
        JSON.stringify({ 
          error: 'Application pending', 
          message: '您已有待审核的申请，请等待处理结果' 
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )
    }

    // 验证门店是否存在且活跃
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

    // 如果指定了杆柜编号，检查是否可用
    if (requested_locker_number) {
      const { data: requestedLocker, error: lockerError } = await supabaseClient
        .from('lockers')
        .select('id, number, status')
        .eq('store_id', store_id)
        .eq('number', requested_locker_number)
        .single()

      if (lockerError || !requestedLocker) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid locker', 
            message: '指定的杆柜不存在' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          },
        )
      }

      if (requestedLocker.status !== 'available') {
        return new Response(
          JSON.stringify({ 
            error: 'Locker unavailable', 
            message: '指定的杆柜不可用' 
          }),
          { 
            status: 409, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          },
        )
      }
    }

    // 创建申请记录
    const { data: application, error: createError } = await supabaseClient
      .from('applications')
      .insert({
        user_id: user_id,
        store_id,
        requested_locker_number: requested_locker_number || null,
        status: 'pending'
      })
      .select(`
        id, status, created_at,
        stores:store_id (
          name
        )
      `)
      .single()

    if (createError) {
      console.error('Application creation error:', createError)
      return new Response(
        JSON.stringify({ 
          error: 'Application failed', 
          message: '申请提交失败，请稍后重试' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )
    }

    // 记录操作日志
    await supabaseClient
      .from('locker_records')
      .insert({
        user_id: user_id,
        locker_id: null,
        store_id,
        action_type: 'apply',
        notes: `用户申请杆柜${requested_locker_number ? ': ' + requested_locker_number : ''}`
      })

    // 发送通知给管理员
    await supabaseClient
      .from('reminders')
      .insert({
        user_id: user_id,
        locker_id: null,
        reminder_type: 'approval_needed',
        message: `新的杆柜申请需要审核 - 用户: ${currentUser.name || currentUser.phone}`,
        status: 'sent'
      })

    return new Response(
      JSON.stringify({
        success: true,
        message: '申请提交成功，请等待管理员审核',
        data: {
          application_id: application.id,
          store_name: application.stores[0]?.name,
          status: application.status,
          created_at: application.created_at
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      },
    )

  } catch (error) {
    console.error('Locker application error:', error)
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