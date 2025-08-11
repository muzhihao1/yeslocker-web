<template>
  <div id="app">
    <!-- 导航栏 -->
    <nav-bar v-if="showNavBar" />
    
    <!-- 路由视图 -->
    <main class="main-content">
      <router-view />
    </main>
    
    <!-- 底部标签栏 -->
    <tab-bar v-if="showTabBar" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth-vue'
import NavBar from '@/components/layout/NavBar.vue'
import TabBar from '@/components/layout/TabBar.vue'

const route = useRoute()
const authStore = useAuthStore()

// 控制导航栏和标签栏显示
const showNavBar = computed(() => {
  // 登录、注册页面不显示导航栏
  return !['Login', 'Register'].includes(route.name as string)
})

const showTabBar = computed(() => {
  // 只有主要页面显示标签栏
  return ['Home', 'MyLockers', 'Profile'].includes(route.name as string)
})

onMounted(() => {
  console.log('YesLocker Vue App 启动')
  
  // 初始化认证状态
  authStore.loadStoredAuth()
  
  // 更新页面标题
  if (route.meta?.title) {
    document.title = `${route.meta.title} - YesLocker`
  }
})
</script>

<style>
/* 全局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, 
    Segoe UI, Arial, Roboto, 'PingFang SC', 'Hiragino Sans GB', 
    'Microsoft Yahei', sans-serif;
  line-height: 1.6;
  color: #333;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding-bottom: env(safe-area-inset-bottom);
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
  --border-radius: 8px;
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 响应式断点 */
@media (max-width: 768px) {
  .main-content {
    padding: 0;
  }
}

/* 通用工具类 */
.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }

.flex { display: flex; }
.flex-column { flex-direction: column; }
.flex-center { justify-content: center; align-items: center; }
.flex-between { justify-content: space-between; }

.mb-1 { margin-bottom: 8px; }
.mb-2 { margin-bottom: 16px; }
.mb-3 { margin-bottom: 24px; }
.mt-1 { margin-top: 8px; }
.mt-2 { margin-top: 16px; }
.mt-3 { margin-top: 24px; }

.p-1 { padding: 8px; }
.p-2 { padding: 16px; }
.p-3 { padding: 24px; }

.rounded { border-radius: var(--border-radius); }
.shadow { box-shadow: var(--shadow); }
</style>