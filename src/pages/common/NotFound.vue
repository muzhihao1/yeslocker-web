<template>
  <div class="not-found">
    <div class="content">
      <div class="icon">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,17A1.5,1.5 0 0,1 10.5,15.5A1.5,1.5 0 0,1 12,14A1.5,1.5 0 0,1 13.5,15.5A1.5,1.5 0 0,1 12,17M12,13A1,1 0 0,1 11,12V8A1,1 0 0,1 12,7A1,1 0 0,1 13,8V12A1,1 0 0,1 12,13Z" />
        </svg>
      </div>
      
      <h1 class="title">页面未找到</h1>
      <p class="description">抱歉，您访问的页面不存在</p>
      
      <div class="actions">
        <button class="btn-primary" @click="goHome">
          返回首页
        </button>
        <button class="btn-secondary" @click="goBack">
          返回上页
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/')
}

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}
</script>

<style scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background-color: var(--background-color);
}

.content {
  text-align: center;
  max-width: 400px;
}

.icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  color: var(--text-secondary);
}

.title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 12px;
}

.description {
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: 32px;
  line-height: 1.5;
}

.actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.btn-primary,
.btn-secondary {
  padding: 12px 24px;
  border: none;
  border-radius: var(--border-radius);
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background-color: #0d4f16;
}

.btn-secondary {
  background-color: white;
  color: var(--text-color);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background-color: #f9f9f9;
}

/* 响应式 */
@media (max-width: 768px) {
  .content {
    padding: 20px;
  }
  
  .actions {
    flex-direction: column;
  }
  
  .btn-primary,
  .btn-secondary {
    width: 100%;
  }
}
</style>