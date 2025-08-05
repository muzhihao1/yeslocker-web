<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { useAuthStore } from '@/stores/auth'

onLaunch(() => {
  console.log('App Launch - YesLocker 台球杆柜管理系统')
  
  // 初始化认证状态
  const authStore = useAuthStore()
  authStore.loadStoredAuth()
})

onShow(() => {
  console.log('App Show')
})

onHide(() => {
  console.log('App Hide')
})
</script>

<style>
/* 全局样式 */
page {
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Segoe UI, Arial, Roboto, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft Yahei', sans-serif;
}

/* 主题色定义 */
:root {
  --primary-color: #1B5E20; /* 台球绿 */
  --secondary-color: #FFA000; /* 台球黄 */
  --text-color: #333333;
  --text-secondary: #666666;
  --border-color: #e5e5e5;
  --background-color: #f5f5f5;
  --white: #ffffff;
  --success-color: #52c41a;
  --warning-color: #faad14;
  --error-color: #f5222d;
}
</style>