import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  
  // 路径解析
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      '@/components': resolve(__dirname, './components'),
      '@/pages': resolve(__dirname, './pages'),
      '@/stores': resolve(__dirname, './stores'),
      '@/services': resolve(__dirname, './services'),
      '@/types': resolve(__dirname, './types'),
      '@/utils': resolve(__dirname, './utils'),
      '@/assets': resolve(__dirname, './assets')
    }
  },
  
  // 开发服务器配置
  server: {
    port: 3000,
    host: true,
    open: true,
    proxy: {
      // 代理API请求到本地Express服务器
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      },
      // 代理其他后端端点
      '/auth-register': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/auth-login': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/admin-login': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/stores-lockers': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/lockers-apply': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/locker-operations': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  
  // 构建配置
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'ui-components': ['@/components/common', '@/components/business']
        }
      }
    }
  },
  
  // 环境变量前缀
  envPrefix: ['VITE_', 'VUE_APP_'],
  
  // CSS预处理器
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    }
  },
  
  // 定义全局常量
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
})