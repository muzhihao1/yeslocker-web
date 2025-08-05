import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserReminder {
  id: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  locker_number: string;
  store_name: string;
  last_operation_at: string;
  days_inactive: number;
}

// 发送提醒短信
async function sendReminderSMS(phone: string, userName: string, lockerNumber: string): Promise<boolean> {
  try {
    const smsResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/sms-send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify({
        phone,
        type: 'reminder',
        templateParams: [userName, lockerNumber, '3个月']
      })
    })
    
    if (!smsResponse.ok) {
      console.error('Failed to send reminder SMS:', await smsResponse.text())
      return false
    }
    
    const result = await smsResponse.json()
    return result.success
  } catch (error) {
    console.error('Error sending reminder SMS:', error)
    return false
  }
}

// 创建应用内通知
async function createInAppNotification(
  supabaseClient: any,
  userId: string,
  title: string,
  content: string
): Promise<boolean> {
  try {
    const { error } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        content,
        type: 'reminder',
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

// 更新用户提醒记录
async function updateReminderRecord(
  supabaseClient: any,
  userId: string,
  type: 'sms' | 'notification',
  success: boolean
): Promise<void> {
  try {
    await supabaseClient
      .from('reminders')
      .insert({
        user_id: userId,
        type,
        sent_at: new Date().toISOString(),
        success
      })
  } catch (error) {
    console.error('Error updating reminder record:', error)
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // 使用服务角色密钥以获取完整权限
    )

    console.log('Starting reminder check process...')

    // 获取3个月未操作的用户杆柜
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    
    const { data: inactiveLockers, error: fetchError } = await supabaseClient
      .from('applications')
      .select(`
        id,
        user_id,
        users(id, name, phone),
        lockers(id, number, stores(name)),
        approved_at,
        last_operation_at
      `)
      .eq('status', 'approved')
      .or(`last_operation_at.is.null,last_operation_at.lt.${threeMonthsAgo}`)
      .order('last_operation_at', { ascending: true })

    if (fetchError) {
      console.error('Error fetching inactive lockers:', fetchError)
      return new Response(
        JSON.stringify({ 
          error: 'Database query failed', 
          message: fetchError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!inactiveLockers || inactiveLockers.length === 0) {
      console.log('No inactive lockers found')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No reminders needed',
          processed: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Found ${inactiveLockers.length} inactive lockers`)

    // 检查是否已经发送过提醒 (避免重复发送)
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentReminders } = await supabaseClient
      .from('reminders')
      .select('user_id, type')
      .gte('sent_at', oneWeekAgo)
      .eq('success', true)

    const recentReminderMap = new Map()
    recentReminders?.forEach(reminder => {
      const key = `${reminder.user_id}_${reminder.type}`
      recentReminderMap.set(key, true)
    })

    let processedCount = 0
    let successCount = 0

    // 处理每个用户的提醒
    for (const locker of inactiveLockers) {
      try {
        const user = locker.users[0]
        const lockerInfo = locker.lockers[0]
        const store = lockerInfo?.stores[0]
        
        if (!user || !lockerInfo || !store) {
          console.log('Skipping incomplete record:', locker.id)
          continue
        }

        // 计算未操作天数
        const lastOperationDate = locker.last_operation_at ? 
          new Date(locker.last_operation_at) : 
          new Date(locker.approved_at)
        const daysInactive = Math.floor((Date.now() - lastOperationDate.getTime()) / (1000 * 60 * 60 * 24))

        console.log(`Processing user ${user?.phone}: ${daysInactive} days inactive`)

        // 只处理超过90天的用户
        if (daysInactive < 90) {
          continue
        }

        processedCount++

        // 准备提醒内容
        const reminderTitle = '杆柜使用提醒'
        const reminderContent = `您好${user?.name || ''}，您在${store?.name}的${lockerInfo?.number}号杆柜已经${daysInactive}天未使用，请及时使用或释放杆柜。`

        let smsSuccess = false
        let notificationSuccess = false

        // 发送短信提醒 (如果一周内未发送过)
        const smsKey = `${user?.id}_sms`
        if (!recentReminderMap.has(smsKey)) {
          console.log(`Sending SMS reminder to ${user?.phone}`)
          smsSuccess = await sendReminderSMS(
            user?.phone, 
            user?.name || '用户', 
            lockerInfo?.number
          )
          
          await updateReminderRecord(supabaseClient, user?.id, 'sms', smsSuccess)
          
          if (smsSuccess) {
            console.log(`SMS reminder sent successfully to ${user?.phone}`)
          } else {
            console.log(`Failed to send SMS reminder to ${user?.phone}`)
          }
        } else {
          console.log(`Skipping SMS for ${user?.phone} (sent recently)`)
          smsSuccess = true // 标记为成功，因为最近已发送
        }

        // 创建应用内通知 (如果一周内未发送过)
        const notificationKey = `${user?.id}_notification`
        if (!recentReminderMap.has(notificationKey)) {
          console.log(`Creating in-app notification for user ${user?.id}`)
          notificationSuccess = await createInAppNotification(
            supabaseClient,
            user?.id,
            reminderTitle,
            reminderContent
          )
          
          await updateReminderRecord(supabaseClient, user?.id, 'notification', notificationSuccess)
          
          if (notificationSuccess) {
            console.log(`Notification created successfully for user ${user?.id}`)
          } else {
            console.log(`Failed to create notification for user ${user?.id}`)
          }
        } else {
          console.log(`Skipping notification for user ${user?.id} (sent recently)`)
          notificationSuccess = true // 标记为成功，因为最近已发送
        }

        if (smsSuccess || notificationSuccess) {
          successCount++
        }

        // 添加延迟避免API限制
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error('Error processing reminder for locker:', locker.id, error)
      }
    }

    console.log(`Reminder check completed. Processed: ${processedCount}, Success: ${successCount}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Reminder check completed',
        processed: processedCount,
        successful: successCount,
        total_found: inactiveLockers.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Reminder check error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})