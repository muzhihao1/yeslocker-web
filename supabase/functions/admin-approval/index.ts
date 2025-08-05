import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ApprovalRequest {
  application_id: string;
  action: 'approve' | 'reject';
  assigned_locker_id?: string;
  rejection_reason?: string;
}

// 发送审核通知短信
async function sendApprovalSMS(phone: string, userName: string, approved: boolean, details: string): Promise<boolean> {
  try {
    const smsResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/sms-send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify({
        phone,
        type: approved ? 'approval' : 'rejection',
        templateParams: [userName, details]
      })
    })
    
    if (!smsResponse.ok) {
      console.error('Failed to send approval SMS:', await smsResponse.text())
      return false
    }
    
    const result = await smsResponse.json()
    return result.success
  } catch (error) {
    console.error('Error sending approval SMS:', error)
    return false
  }
}

// 创建应用内通知
async function createNotification(
  supabaseClient: any,
  userId: string,
  title: string,
  content: string,
  type: string = 'approval'
): Promise<boolean> {
  try {
    const { error } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        content,
        type,
        read: false
      })
    
    if (error) {
      console.error('Failed to create notification:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error creating notification:', error)
    return false
  }
}

// 验证管理员权限
async function verifyAdminAuth(supabaseClient: any, authHeader: string) {
  if (!authHeader) {
    throw new Error('Missing authorization')
  }

  // 简化的管理员验证 (生产环境需要更严格的JWT验证)
  const token = authHeader.replace('Bearer ', '')
  
  try {
    const tokenData = JSON.parse(atob(token))
    const { data: admin } = await supabaseClient
      .from('admins')
      .select('id, role, store_id')
      .eq('id', tokenData.admin_id)
      .eq('status', 'active')
      .single()

    return admin
  } catch (error) {
    throw new Error('Invalid admin token')
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // 使用service role key
    )

    const authHeader = req.headers.get('Authorization')
    const admin = await verifyAdminAuth(supabaseClient, authHeader || '')

    if (req.method === 'GET') {
      // 获取待审核的申请列表
      const url = new URL(req.url)
      const status = url.searchParams.get('status') || 'pending'
      const limit = parseInt(url.searchParams.get('limit') || '20')
      const offset = parseInt(url.searchParams.get('offset') || '0')

      let query = supabaseClient
        .from('applications')
        .select(`
          id, status, requested_locker_number, created_at, approved_at, rejection_reason,
          users:user_id (
            id, name, phone, avatar_url
          ),
          stores:store_id (
            id, name
          ),
          approvers:approved_by (
            name
          )
        `)

      // 门店管理员只能看到自己门店的申请
      if (admin.role === 'store_admin' && admin.store_id) {
        query = query.eq('store_id', admin.store_id)
      }

      if (status !== 'all') {
        query = query.eq('status', status)
      }

      const { data: applications, error: applicationsError } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (applicationsError) {
        return new Response(
          JSON.stringify({ 
            error: 'Failed to fetch applications', 
            message: '获取申请列表失败' 
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
          data: {
            applications,
            pagination: {
              limit,
              offset,
              total: applications.length
            }
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )

    } else if (req.method === 'POST') {
      const { application_id, action, assigned_locker_id, rejection_reason }: ApprovalRequest = await req.json()

      // 验证必填字段
      if (!application_id || !action || !['approve', 'reject'].includes(action)) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid request', 
            message: '申请ID和操作类型为必填项' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          },
        )
      }

      if (action === 'approve' && !assigned_locker_id) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing locker assignment', 
            message: '批准申请时必须指定杆柜' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          },
        )
      }

      if (action === 'reject' && !rejection_reason) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing rejection reason', 
            message: '拒绝申请时必须提供原因' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          },
        )
      }

      // 获取申请信息
      const { data: application, error: appError } = await supabaseClient
        .from('applications')
        .select(`
          id, user_id, store_id, status,
          users:user_id (
            name, phone
          )
        `)
        .eq('id', application_id)
        .single()

      if (appError || !application) {
        return new Response(
          JSON.stringify({ 
            error: 'Application not found', 
            message: '申请不存在' 
          }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          },
        )
      }

      if (application.status !== 'pending') {
        return new Response(
          JSON.stringify({ 
            error: 'Application already processed', 
            message: '申请已经处理过了' 
          }),
          { 
            status: 409, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          },
        )
      }

      // 权限检查：门店管理员只能处理自己门店的申请
      if (admin.role === 'store_admin' && admin.store_id !== application.store_id) {
        return new Response(
          JSON.stringify({ 
            error: 'Permission denied', 
            message: '无权处理其他门店的申请' 
          }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          },
        )
      }

      if (action === 'approve') {
        // 验证杆柜是否可用
        const { data: locker, error: lockerError } = await supabaseClient
          .from('lockers')
          .select('id, number, status')
          .eq('id', assigned_locker_id)
          .eq('store_id', application.store_id)
          .single()

        if (lockerError || !locker) {
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

        if (locker.status !== 'available') {
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

        // 开始事务：批准申请并分配杆柜
        const { error: updateError } = await supabaseClient.rpc('approve_locker_application', {
          p_application_id: application_id,
          p_user_id: application.user_id,
          p_locker_id: assigned_locker_id,
          p_approved_by: admin.id
        })

        if (updateError) {
          console.error('Approval transaction error:', updateError)
          return new Response(
            JSON.stringify({ 
              error: 'Approval failed', 
              message: '批准申请失败，请稍后重试' 
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
            user_id: application.user_id,
            locker_id: assigned_locker_id,
            store_id: application.store_id,
            action_type: 'approve',
            notes: `管理员批准杆柜申请，分配杆柜: ${locker.number}`
          })

        // 发送审核通过通知
        const notificationTitle = '杆柜申请已通过'
        const notificationContent = `您好${application.users.name || ''}，您的杆柜申请已通过审核，分配的杆柜号为: ${locker.number}`
        
        // 发送短信通知
        const smsSuccess = await sendApprovalSMS(
          application.users.phone,
          application.users.name || '用户',
          true,
          `杆柜号: ${locker.number}`
        )
        
        if (smsSuccess) {
          console.log(`Approval SMS sent successfully to ${application.users.phone}`)
        } else {
          console.log(`Failed to send approval SMS to ${application.users.phone}`)
        }
        
        // 创建应用内通知
        const notificationSuccess = await createNotification(
          supabaseClient,
          application.user_id,
          notificationTitle,
          notificationContent,
          'approval'
        )
        
        if (notificationSuccess) {
          console.log(`Approval notification created for user ${application.user_id}`)
        } else {
          console.log(`Failed to create approval notification for user ${application.user_id}`)
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: '申请已批准，杆柜分配成功',
            data: {
              application_id,
              locker_number: locker.number,
              user_name: application.users.name
            }
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          },
        )

      } else if (action === 'reject') {
        // 拒绝申请
        const { error: rejectError } = await supabaseClient
          .from('applications')
          .update({
            status: 'rejected',
            rejection_reason,
            approved_by: admin.id,
            approved_at: new Date().toISOString()
          })
          .eq('id', application_id)

        if (rejectError) {
          console.error('Rejection error:', rejectError)
          return new Response(
            JSON.stringify({ 
              error: 'Rejection failed', 
              message: '拒绝申请失败，请稍后重试' 
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
            user_id: application.user_id,
            locker_id: null,
            store_id: application.store_id,
            action_type: 'reject',
            notes: `管理员拒绝杆柜申请，原因: ${rejection_reason}`
          })

        // 发送审核拒绝通知
        const notificationTitle = '杆柜申请未通过'
        const notificationContent = `您好${application.users.name || ''}，您的杆柜申请未通过审核。原因: ${rejection_reason}`
        
        // 发送短信通知
        const smsSuccess = await sendApprovalSMS(
          application.users.phone,
          application.users.name || '用户',
          false,
          `原因: ${rejection_reason}`
        )
        
        if (smsSuccess) {
          console.log(`Rejection SMS sent successfully to ${application.users.phone}`)
        } else {
          console.log(`Failed to send rejection SMS to ${application.users.phone}`)
        }
        
        // 创建应用内通知
        const notificationSuccess = await createNotification(
          supabaseClient,
          application.user_id,
          notificationTitle,
          notificationContent,
          'rejection'
        )
        
        if (notificationSuccess) {
          console.log(`Rejection notification created for user ${application.user_id}`)
        } else {
          console.log(`Failed to create rejection notification for user ${application.user_id}`)
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: '申请已拒绝',
            data: {
              application_id,
              rejection_reason,
              user_name: application.users.name
            }
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          },
        )
      }
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
    console.error('Admin approval error:', error)
    
    if (error.message === 'Missing authorization' || error.message === 'Invalid admin token') {
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized', 
          message: '管理员登录已过期，请重新登录' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )
    }

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