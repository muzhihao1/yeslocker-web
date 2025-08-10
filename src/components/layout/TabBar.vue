<template>
  <div class="tab-bar">
    <div class="tab-list">
      <router-link
        v-for="tab in tabs"
        :key="tab.name"
        :to="tab.path"
        class="tab-item"
        :class="{ active: isActiveTab(tab.path) }"
      >
        <div class="tab-icon">
          <component :is="getIconComponent(tab.icon)" />
        </div>
        <span class="tab-text">{{ tab.text }}</span>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import HomeIcon from '@/components/icons/HomeIcon.vue'
import LockerIcon from '@/components/icons/LockerIcon.vue'
import ProfileIcon from '@/components/icons/ProfileIcon.vue'

const route = useRoute()

// 标签配置 - 从uni-app pages.json的tabBar迁移
const tabs = [
  {
    name: 'home',
    path: '/',
    text: '首页',
    icon: 'home'
  },
  {
    name: 'lockers',
    path: '/user/lockers',
    text: '我的杆柜',
    icon: 'locker'
  },
  {
    name: 'profile',
    path: '/user/profile',
    text: '我的',
    icon: 'profile'
  }
]

// 判断是否为活跃标签
const isActiveTab = (path: string) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}

// 获取图标组件
const getIconComponent = (iconName: string) => {
  const iconMap = {
    home: HomeIcon,
    locker: LockerIcon,
    profile: ProfileIcon
  }
  return iconMap[iconName as keyof typeof iconMap] || HomeIcon
}
</script>

<style scoped>
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background-color: var(--white);
  border-top: 1px solid var(--border-color);
  padding-bottom: env(safe-area-inset-bottom);
}

.tab-list {
  display: flex;
  height: 50px;
  max-width: 1200px;
  margin: 0 auto;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  text-decoration: none;
  color: #666666;
  transition: color 0.2s;
}

.tab-item.active {
  color: var(--primary-color);
}

.tab-item:hover {
  color: var(--primary-color);
}

.tab-icon {
  width: 24px;
  height: 24px;
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab-text {
  font-size: 10px;
  line-height: 1;
  text-align: center;
}

/* 响应式 */
@media (max-width: 768px) {
  .tab-list {
    height: 48px;
  }
  
  .tab-icon {
    width: 22px;
    height: 22px;
  }
  
  .tab-text {
    font-size: 9px;
  }
}

/* 为有底部安全区的设备添加额外高度 */
@supports (padding: max(0px)) {
  .tab-bar {
    padding-bottom: max(8px, env(safe-area-inset-bottom));
  }
}
</style>