import { RouteRecordRaw } from 'vue-router'

// 路由配置 - 从uni-app pages.json迁移
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/pages/index/index-vue.vue'),
    meta: {
      title: 'YesLocker',
      requiresAuth: false
    }
  },
  {
    path: '/auth/login',
    name: 'Login',
    component: () => import('@/pages/auth/login-vue.vue'),
    meta: {
      title: '登录',
      requiresAuth: false
    }
  },
  {
    path: '/auth/register',
    name: 'Register',
    component: () => import('@/pages/auth/register-vue.vue'),
    meta: {
      title: '注册',
      requiresAuth: false
    }
  },
  {
    path: '/user/profile',
    name: 'Profile',
    component: () => import('@/pages/user/profile-vue.vue'),
    meta: {
      title: '个人资料',
      requiresAuth: true
    }
  },
  {
    path: '/user/lockers',
    name: 'MyLockers',
    component: () => import('@/pages/user/lockers-vue.vue'),
    meta: {
      title: '我的杆柜',
      requiresAuth: true
    }
  },
  {
    path: '/user/records',
    name: 'Records',
    component: () => import('@/pages/user/records-vue.vue'),
    meta: {
      title: '使用记录',
      requiresAuth: true
    }
  },
  {
    path: '/user/history',
    name: 'History',
    component: () => import('@/pages/user/history.vue'),
    meta: {
      title: '历史记录',
      requiresAuth: true
    }
  },
  {
    path: '/user/apply',
    name: 'Apply',
    component: () => import('@/pages/user/apply-vue.vue'),
    meta: {
      title: '申请杆柜',
      requiresAuth: true
    }
  },
  {
    path: '/user/notifications',
    name: 'Notifications',
    component: () => import('@/pages/user/notifications-vue.vue'),
    meta: {
      title: '消息通知',
      requiresAuth: true
    }
  },
  {
    path: '/locker/qrcode',
    name: 'QRCode',
    component: () => import('@/pages/locker/qrcode-vue.vue'),
    meta: {
      title: '电子凭证',
      requiresAuth: true
    }
  },
  {
    path: '/locker/action',
    name: 'LockerAction',
    component: () => import('@/pages/locker/action-vue.vue'),
    meta: {
      title: '存取操作',
      requiresAuth: true
    }
  },
  // 404页面
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/pages/common/NotFound.vue'),
    meta: {
      title: '页面未找到',
      requiresAuth: false
    }
  }
]

export default routes