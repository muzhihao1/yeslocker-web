import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OperationRequest {
  action_type: 'store' | 'retrieve';
  notes?: string;
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

    if (req.method === 'POST') {
      const { action_type, notes }: OperationRequest = await req.json()

      // 验证必填字段
      if (!action_type || !['store', 'retrieve'].includes(action_type)) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid action type', 
            message: '操作类型必须是 store 或 retrieve' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          },
        )
      }

      // 获取用户和杆柜信息
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select(`
          id, name, phone, locker_id, store_id,
          lockers:locker_id (
            id, number, status
          ),
          stores:store_id (
            id, name, address
          )
        `)
        .eq('id', user.id)
        .single()

      if (userError || !userData) {
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

      if (!userData.locker_id || !userData.lockers) {
        return new Response(
          JSON.stringify({ 
            error: 'No locker assigned', 
            message: '您还没有分配杆柜，请先申请杆柜' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          },
        )
      }

      // 检查杆柜状态
      if (userData.lockers[0]?.status !== 'occupied') {
        return new Response(
          JSON.stringify({ 
            error: 'Locker not available', 
            message: '杆柜状态异常，请联系管理员' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          },
        )
      }

      // 记录操作
      const { data: record, error: recordError } = await supabaseClient
        .from('locker_records')
        .insert({
          user_id: user.id,
          locker_id: userData.locker_id,
          store_id: userData.store_id,
          action_type,
          notes: notes || `用户${action_type === 'store' ? '存放' : '取出'}台球杆`
        })
        .select()
        .single()

      if (recordError) {
        console.error('Record creation error:', recordError)
        return new Response(
          JSON.stringify({ 
            error: 'Operation recording failed', 
            message: '操作记录失败，请稍后重试' 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          },
        )
      }

      // 发送提醒 (归还钥匙)
      await supabaseClient
        .from('reminders')
        .insert({
          user_id: user.id,
          locker_id: userData.locker_id,
          reminder_type: 'return_key',
          message: `请记得将杆柜钥匙归还到前台`,
          status: 'sent'
        })

      return new Response(
        JSON.stringify({
          success: true,
          message: `${action_type === 'store' ? '存杆' : '取杆'}操作记录成功，请记得将钥匙归还到前台`,
          data: {
            record_id: record.id,
            action_type,
            locker_number: userData.lockers[0]?.number,
            store_name: userData.stores[0]?.name,
            timestamp: record.created_at
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )

    } else if (req.method === 'GET') {
      // 获取用户的操作记录历史
      const url = new URL(req.url)
      const limit = parseInt(url.searchParams.get('limit') || '20')
      const offset = parseInt(url.searchParams.get('offset') || '0')

      const { data: records, error: recordsError } = await supabaseClient
        .from('locker_records')
        .select(`
          id, action_type, notes, created_at,
          lockers:locker_id (
            number
          ),
          stores:store_id (
            name
          )
        `)
        .eq('user_id', user.id)
        .in('action_type', ['store', 'retrieve'])
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (recordsError) {
        return new Response(
          JSON.stringify({ 
            error: 'Failed to fetch records', 
            message: '获取操作记录失败' 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          },
        )
      }

      // 获取总数
      const { count, error: countError } = await supabaseClient
        .from('locker_records')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('action_type', ['store', 'retrieve'])

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            records,
            pagination: {
              total: count || 0,
              limit,
              offset,
              has_more: (count || 0) > offset + limit
            }
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )
    }

    return new Response(
      JSON.stringify({ 
        error: 'Method not allowed', 
        message: '不支持的请求方法' 
      }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      },
    )

  } catch (error) {
    console.error('Locker operations error:', error)
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