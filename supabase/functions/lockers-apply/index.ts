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

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
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

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid token', 
          message: '登录已过期，请重新登录' 
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
      .select('id, locker_id, store_id')
      .eq('id', user.id)
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
      .eq('user_id', user.id)
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
        user_id: user.id,
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
        user_id: user.id,
        locker_id: null,
        store_id,
        action_type: 'apply',
        notes: `用户申请杆柜${requested_locker_number ? ': ' + requested_locker_number : ''}`
      })

    // 发送通知给管理员
    await supabaseClient
      .from('reminders')
      .insert({
        user_id: user.id,
        locker_id: null,
        reminder_type: 'approval_needed',
        message: `新的杆柜申请需要审核 - 用户: ${user.user_metadata?.name || user.phone}`,
        status: 'sent'
      })

    return new Response(
      JSON.stringify({
        success: true,
        message: '申请提交成功，请等待管理员审核',
        data: {
          application_id: application.id,
          store_name: application.stores.name,
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