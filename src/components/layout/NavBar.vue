<template>
  <nav class="nav-bar">
    <div class="nav-content">
      <!-- 返回按钮 -->
      <button 
        v-if="showBack" 
        class="nav-back"
        @click="goBack"
        aria-label="返回"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
        </svg>
      </button>
      
      <!-- 页面标题 -->
      <h1 class="nav-title">{{ title }}</h1>
      
      <!-- 右侧操作 -->
      <div class="nav-actions">
        <slot name="actions" />
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// 从路由meta获取标题
const title = computed(() => {
  return route.meta?.title as string || 'YesLocker'
})

// 控制返回按钮显示
const showBack = computed(() => {
  return route.name !== 'Home'
})

// 返回上一页
const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}
</script>

<style scoped>
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 1000;
  background-color: var(--primary-color);
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.nav-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 44px;
}

.nav-back {
  background: none;
  border: none;
  color: white;
  padding: 8px;
  margin-left: -8px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.nav-back:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.nav-back svg {
  width: 24px;
  height: 24px;
}

.nav-title {
  flex: 1;
  font-size: 18px;
  font-weight: 600;
  text-align: center;
  margin: 0 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 响应式 */
@media (max-width: 768px) {
  .nav-content {
    padding: 10px 12px;
  }
  
  .nav-title {
    font-size: 16px;
    margin: 0 12px;
  }
}
</style>