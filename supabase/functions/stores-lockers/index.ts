import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const url = new URL(req.url)
    const storeId = url.searchParams.get('store_id')

    if (req.method === 'GET' && storeId) {
      // 获取指定门店的杆柜列表
      const { data: lockers, error: lockersError } = await supabaseClient
        .from('lockers')
        .select(`
          id, number, status, assigned_at,
          users:user_id (
            id, name, phone
          )
        `)
        .eq('store_id', storeId)
        .order('number')

      if (lockersError) {
        return new Response(
          JSON.stringify({ 
            error: 'Failed to fetch lockers', 
            message: '获取杆柜列表失败' 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          },
        )
      }

      // 获取门店信息
      const { data: store, error: storeError } = await supabaseClient
        .from('stores')
        .select('id, name, address, phone')
        .eq('id', storeId)
        .eq('status', 'active')
        .single()

      if (storeError || !store) {
        return new Response(
          JSON.stringify({ 
            error: 'Store not found', 
            message: '门店不存在' 
          }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          },
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            store,
            lockers,
            statistics: {
              total: lockers.length,
              available: lockers.filter(l => l.status === 'available').length,
              occupied: lockers.filter(l => l.status === 'occupied').length,
              maintenance: lockers.filter(l => l.status === 'maintenance').length
            }
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )

    } else if (req.method === 'GET') {
      // 获取所有门店列表
      const { data: stores, error: storesError } = await supabaseClient
        .from('stores')
        .select(`
          id, name, address, phone, created_at,
          admins:admin_id (
            name, phone
          ),
          _count:lockers(count)
        `)
        .eq('status', 'active')
        .order('created_at')

      if (storesError) {
        return new Response(
          JSON.stringify({ 
            error: 'Failed to fetch stores', 
            message: '获取门店列表失败' 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          },
        )
      }

      // 为每个门店获取杆柜统计信息
      const storesWithStats = await Promise.all(
        stores.map(async (store) => {
          const { data: lockers } = await supabaseClient
            .from('lockers')
            .select('status')
            .eq('store_id', store.id)

          const stats = {
            total: lockers?.length || 0,
            available: lockers?.filter(l => l.status === 'available').length || 0,
            occupied: lockers?.filter(l => l.status === 'occupied').length || 0,
            maintenance: lockers?.filter(l => l.status === 'maintenance').length || 0
          }

          return {
            ...store,
            locker_stats: stats
          }
        })
      )

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            stores: storesWithStats,
            total_stores: storesWithStats.length
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )

    } else if (req.method === 'POST') {
      // 创建新门店 (仅管理员权限)
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

      // Admin permission validation pending - placeholder implementation
      const { name, address, phone } = await req.json()

      if (!name || !address) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing required fields', 
            message: '门店名称和地址为必填项' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          },
        )
      }

      const { data: store, error: createError } = await supabaseClient
        .from('stores')
        .insert({
          name,
          address,
          phone: phone || null,
          status: 'active'
        })
        .select()
        .single()

      if (createError) {
        console.error('Store creation error:', createError)
        return new Response(
          JSON.stringify({ 
            error: 'Store creation failed', 
            message: '门店创建失败' 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          },
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: '门店创建成功',
          data: store
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
    console.error('Stores/Lockers API error:', error)
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