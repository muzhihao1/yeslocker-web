<template>
  <view class="virtual-list-container" ref="containerRef">
    <!-- 可视区域容器 -->
    <scroll-view
      class="virtual-scroll-view"
      :style="{ height: containerHeight }"
      scroll-y
      :scroll-top="scrollTop"
      @scroll="handleScroll"
      :lower-threshold="lowerThreshold"
      @scrolltolower="handleScrollToLower"
      :refresher-enabled="refresherEnabled"
      :refresher-triggered="refresherTriggered"
      @refresherrefresh="handleRefresherRefresh"
    >
      <!-- 上方占位区域 -->
      <view class="virtual-placeholder-top" :style="{ height: topPlaceholderHeight + 'px' }"></view>
      
      <!-- 可视区域渲染的项目 -->
      <view class="virtual-items-container">
        <view
          v-for="(item, index) in visibleItems"
          :key="`${keyField ? item[keyField] : item.id || index}_${startIndex + index}`"
          class="virtual-item"
          :class="itemClass"
          :style="itemStyle"
          @click="handleItemClick(item, startIndex + index)"
        >
          <!-- 使用插槽渲染每个项目 -->
          <slot 
            name="item" 
            :item="item" 
            :index="startIndex + index"
            :isVisible="true"
          >
            <view class="default-item">
              <text>{{ item.title || item.name || JSON.stringify(item) }}</text>
            </view>
          </slot>
        </view>
      </view>
      
      <!-- 下方占位区域 -->
      <view class="virtual-placeholder-bottom" :style="{ height: bottomPlaceholderHeight + 'px' }"></view>
      
      <!-- 加载更多指示器 -->
      <view v-if="loading" class="virtual-loading">
        <slot name="loading">
          <view class="loading-default">
            <view class="loading-spinner"></view>
            <text class="loading-text">{{ loadingText }}</text>
          </view>
        </slot>
      </view>
      
      <!-- 没有更多数据提示 -->
      <view v-if="!hasMore && items.length > 0" class="virtual-no-more">
        <slot name="no-more">
          <text class="no-more-text">{{ noMoreText }}</text>
        </slot>
      </view>
      
      <!-- 空状态 -->
      <view v-if="!loading && items.length === 0" class="virtual-empty">
        <slot name="empty">
          <view class="empty-default">
            <text class="empty-text">{{ emptyText }}</text>
          </view>
        </slot>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
/**
 * 虚拟滚动列表组件
 * 支持大量数据的高性能渲染，只渲染可视区域内的项目
 * 
 * 功能特性：
 * - 虚拟滚动：只渲染可视区域内的项目，支持海量数据
 * - 动态高度：支持固定高度和动态高度
 * - 加载更多：支持上拉加载更多数据
 * - 下拉刷新：支持下拉刷新功能
 * - 性能监控：内置性能监控和优化
 * - 内存管理：智能内存管理，避免内存泄漏
 */

import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

interface VirtualListProps {
  // 数据源
  items: any[]
  
  // 每个项目的高度（像素）
  itemHeight?: number
  
  // 容器高度（rpx或px，如 '600rpx' 或 '400px'）
  height?: string
  
  // 缓冲区大小（渲染额外的项目数量）
  bufferSize?: number
  
  // 项目的唯一键字段
  keyField?: string
  
  // 项目样式类
  itemClass?: string
  
  // 项目内联样式
  itemStyle?: object
  
  // 是否正在加载
  loading?: boolean
  
  // 是否还有更多数据
  hasMore?: boolean
  
  // 加载更多的触发距离
  lowerThreshold?: number
  
  // 是否启用下拉刷新
  refresherEnabled?: boolean
  
  // 刷新状态
  refresherTriggered?: boolean
  
  // 文本配置
  loadingText?: string
  noMoreText?: string
  emptyText?: string
  
  // 性能配置
  enablePerformanceMonitor?: boolean
  throttleMs?: number
}

const props = withDefaults(defineProps<VirtualListProps>(), {
  items: () => [],
  itemHeight: 100,
  height: '100vh',
  bufferSize: 5,
  keyField: 'id',
  itemClass: '',
  itemStyle: () => ({}),
  loading: false,
  hasMore: true,
  lowerThreshold: 50,
  refresherEnabled: false,
  refresherTriggered: false,
  loadingText: '加载中...',
  noMoreText: '没有更多数据了',
  emptyText: '暂无数据',
  enablePerformanceMonitor: true,
  throttleMs: 16
})

const emit = defineEmits<{
  'item-click': [item: any, index: number]
  'load-more': []
  'refresh': []
  'scroll': [scrollTop: number]
  'visible-range-change': [startIndex: number, endIndex: number]
}>()

// 响应式状态
const containerRef = ref<HTMLElement>()
const scrollTop = ref(0)
const containerHeight = ref('100vh')

// 虚拟滚动计算状态
const visibleStartIndex = ref(0)
const visibleEndIndex = ref(0)
const itemHeightCache = ref<Map<number, number>>(new Map())

// 性能监控
const performanceMetrics = ref({
  renderTime: 0,
  scrollTime: 0,
  lastRenderTime: Date.now(),
  averageRenderTime: 0,
  renderCount: 0
})

// 节流控制
let scrollTimer: number | null = null
let renderTimer: number | null = null

// 计算属性
const containerHeightPx = computed(() => {
  if (props.height.includes('rpx')) {
    return parseInt(props.height) / 2 // rpx转px的简单转换
  } else if (props.height.includes('px')) {
    return parseInt(props.height)
  } else if (props.height.includes('vh')) {
    const vh = parseInt(props.height)
    return (window.innerHeight * vh) / 100
  }
  return 400 // 默认高度
})

const totalHeight = computed(() => {
  if (itemHeightCache.value.size > 0) {
    // 使用缓存的高度计算总高度
    let total = 0
    for (let i = 0; i < props.items.length; i++) {
      total += itemHeightCache.value.get(i) || props.itemHeight
    }
    return total
  }
  return props.items.length * props.itemHeight
})

const startIndex = computed(() => {
  return Math.max(0, visibleStartIndex.value - props.bufferSize)
})

const endIndex = computed(() => {
  return Math.min(props.items.length - 1, visibleEndIndex.value + props.bufferSize)
})

const visibleItems = computed(() => {
  const start = startIndex.value
  const end = endIndex.value
  
  if (props.enablePerformanceMonitor) {
    const renderStart = Date.now()
    const items = props.items.slice(start, end + 1)
    const renderTime = Date.now() - renderStart
    
    performanceMetrics.value.renderTime = renderTime
    performanceMetrics.value.renderCount++
    performanceMetrics.value.averageRenderTime = 
      (performanceMetrics.value.averageRenderTime * (performanceMetrics.value.renderCount - 1) + renderTime) / 
      performanceMetrics.value.renderCount
    
    if (renderTime > 16) {
      console.warn(`VirtualList 渲染耗时: ${renderTime}ms, 项目数量: ${items.length}`)
    }
    
    return items
  }
  
  return props.items.slice(start, end + 1)
})

const topPlaceholderHeight = computed(() => {
  let height = 0
  for (let i = 0; i < startIndex.value; i++) {
    height += itemHeightCache.value.get(i) || props.itemHeight
  }
  return height
})

const bottomPlaceholderHeight = computed(() => {
  let height = 0
  for (let i = endIndex.value + 1; i < props.items.length; i++) {
    height += itemHeightCache.value.get(i) || props.itemHeight
  }
  return height
})

// 计算可视区域的索引范围
const calculateVisibleRange = (scrollTop: number) => {
  const containerHeight = containerHeightPx.value
  let accumulatedHeight = 0
  let startIdx = 0
  let endIdx = 0
  
  // 找到开始索引
  for (let i = 0; i < props.items.length; i++) {
    const itemHeight = itemHeightCache.value.get(i) || props.itemHeight
    if (accumulatedHeight + itemHeight > scrollTop) {
      startIdx = i
      break
    }
    accumulatedHeight += itemHeight
  }
  
  // 找到结束索引
  const visibleHeight = scrollTop + containerHeight
  for (let i = startIdx; i < props.items.length; i++) {
    const itemHeight = itemHeightCache.value.get(i) || props.itemHeight
    accumulatedHeight += itemHeight
    if (accumulatedHeight >= visibleHeight) {
      endIdx = i
      break
    }
  }
  
  endIdx = Math.min(endIdx, props.items.length - 1)
  
  return { startIdx, endIdx }
}

// 节流处理滚动事件
const handleScroll = (e: any) => {
  const currentScrollTop = e.detail.scrollTop
  
  if (scrollTimer) {
    clearTimeout(scrollTimer)
  }
  
  scrollTimer = setTimeout(() => {
    const performanceStart = Date.now()
    
    scrollTop.value = currentScrollTop
    const { startIdx, endIdx } = calculateVisibleRange(currentScrollTop)
    
    // 只在范围变化时更新
    if (startIdx !== visibleStartIndex.value || endIdx !== visibleEndIndex.value) {
      visibleStartIndex.value = startIdx
      visibleEndIndex.value = endIdx
      
      emit('visible-range-change', startIdx, endIdx)
    }
    
    emit('scroll', currentScrollTop)
    
    if (props.enablePerformanceMonitor) {
      performanceMetrics.value.scrollTime = Date.now() - performanceStart
    }
  }, props.throttleMs)
}

// 处理滚动到底部
const handleScrollToLower = () => {
  if (props.hasMore && !props.loading) {
    emit('load-more')
  }
}

// 处理下拉刷新
const handleRefresherRefresh = () => {
  emit('refresh')
}

// 处理项目点击
const handleItemClick = (item: any, index: number) => {
  emit('item-click', item, index)
}

// 初始化容器高度
const initializeContainer = () => {
  containerHeight.value = props.height
  
  // 初始计算可视区域
  const { startIdx, endIdx } = calculateVisibleRange(0)
  visibleStartIndex.value = startIdx
  visibleEndIndex.value = endIdx
}

// 缓存项目高度（用于动态高度支持）
const cacheItemHeight = (index: number, height: number) => {
  itemHeightCache.value.set(index, height)
}

// 重置滚动位置
const scrollToTop = () => {
  scrollTop.value = 0
  visibleStartIndex.value = 0
  const { endIdx } = calculateVisibleRange(0)
  visibleEndIndex.value = endIdx
}

// 滚动到指定项目
const scrollToIndex = (index: number) => {
  if (index < 0 || index >= props.items.length) return
  
  let scrollPosition = 0
  for (let i = 0; i < index; i++) {
    scrollPosition += itemHeightCache.value.get(i) || props.itemHeight
  }
  
  scrollTop.value = scrollPosition
  const { startIdx, endIdx } = calculateVisibleRange(scrollPosition)
  visibleStartIndex.value = startIdx
  visibleEndIndex.value = endIdx
}

// 获取性能指标
const getPerformanceMetrics = () => {
  return {
    ...performanceMetrics.value,
    visibleItemsCount: visibleItems.value.length,
    totalItemsCount: props.items.length,
    cacheSize: itemHeightCache.value.size
  }
}

// 清理缓存
const clearCache = () => {
  itemHeightCache.value.clear()
  performanceMetrics.value = {
    renderTime: 0,
    scrollTime: 0,
    lastRenderTime: Date.now(),
    averageRenderTime: 0,
    renderCount: 0
  }
}

// 监听数据变化
watch(() => props.items, (newItems, oldItems) => {
  // 数据变化时重新计算可视区域
  if (newItems.length !== oldItems?.length) {
    nextTick(() => {
      const { startIdx, endIdx } = calculateVisibleRange(scrollTop.value)
      visibleStartIndex.value = startIdx
      visibleEndIndex.value = endIdx
    })
  }
}, { deep: true })

// 监听高度变化
watch(() => props.height, () => {
  initializeContainer()
})

// 暴露方法给父组件
defineExpose({
  scrollToTop,
  scrollToIndex,
  getPerformanceMetrics,
  clearCache,
  cacheItemHeight
})

// 生命周期
onMounted(() => {
  initializeContainer()
  
  // 性能监控日志
  if (props.enablePerformanceMonitor) {
    console.log('VirtualList 已初始化', {
      totalItems: props.items.length,
      itemHeight: props.itemHeight,
      bufferSize: props.bufferSize
    })
  }
})

onUnmounted(() => {
  if (scrollTimer) {
    clearTimeout(scrollTimer)
  }
  if (renderTimer) {
    clearTimeout(renderTimer)
  }
  clearCache()
})
</script>

<style lang="scss" scoped>
.virtual-list-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.virtual-scroll-view {
  width: 100%;
  overflow: hidden;
}

.virtual-placeholder-top,
.virtual-placeholder-bottom {
  width: 100%;
  flex-shrink: 0;
}

.virtual-items-container {
  width: 100%;
}

.virtual-item {
  width: 100%;
  box-sizing: border-box;
}

.default-item {
  padding: 20rpx;
  border-bottom: 1rpx solid #eee;
  
  text {
    font-size: 28rpx;
    color: #333;
  }
}

.virtual-loading {
  padding: 40rpx 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.loading-default {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.loading-spinner {
  width: 40rpx;
  height: 40rpx;
  border: 4rpx solid #f3f3f3;
  border-top: 4rpx solid #007aff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 24rpx;
  color: #999;
}

.virtual-no-more {
  padding: 40rpx 0;
  text-align: center;
}

.no-more-text {
  font-size: 24rpx;
  color: #999;
}

.virtual-empty {
  padding: 200rpx 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.empty-default {
  text-align: center;
}

.empty-text {
  font-size: 32rpx;
  color: #999;
}
</style>