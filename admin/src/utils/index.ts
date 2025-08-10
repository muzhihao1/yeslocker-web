import dayjs from 'dayjs'

/**
 * 格式化日期时间
 * @param date 日期
 * @param format 格式类型 'date' | 'datetime' | 'time' | 自定义格式
 * @returns 格式化后的日期字符串
 */
export const formatDate = (date: string | Date, format: string = 'datetime'): string => {
  if (!date) return '-'
  
  const formats: Record<string, string> = {
    date: 'YYYY-MM-DD',
    datetime: 'YYYY-MM-DD HH:mm:ss',
    time: 'HH:mm:ss',
    shortdate: 'MM-DD',
    shortdatetime: 'MM-DD HH:mm'
  }
  
  return dayjs(date).format(formats[format] || format)
}

/**
 * 格式化日期时间（formatDate的别名，为了兼容性）
 */
export const formatDateTime = (date: string | Date): string => {
  return formatDate(date, 'datetime')
}

/**
 * 显示Toast提示
 * @param title 提示内容
 * @param icon 图标类型
 * @param duration 持续时间
 */
export const showToast = (title: string, icon: 'success' | 'loading' | 'none' | 'error' = 'none', duration: number = 2000) => {
  // 创建toast元素
  const toast = document.createElement('div')
  toast.textContent = title
  
  // 根据图标类型设置样式
  let backgroundColor = '#333'
  if (icon === 'success') backgroundColor = '#4CAF50'
  if (icon === 'error') backgroundColor = '#f44336'
  if (icon === 'loading') backgroundColor = '#2196F3'
  
  toast.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 12px 24px;
    border-radius: 8px;
    color: white;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    background-color: ${backgroundColor};
    opacity: 0;
    transition: opacity 0.3s ease;
    min-width: 120px;
    text-align: center;
  `
  
  document.body.appendChild(toast)
  
  // 显示动画
  requestAnimationFrame(() => {
    toast.style.opacity = '1'
  })
  
  // 持续时间后移除
  setTimeout(() => {
    toast.style.opacity = '0'
    setTimeout(() => {
      if (toast.parentNode) {
        document.body.removeChild(toast)
      }
    }, 300)
  }, duration)
}

/**
 * 显示模态对话框
 * @param options 对话框选项
 * @returns Promise<{confirm: boolean, cancel: boolean}>
 */
export const showModal = (options: {title?: string, content: string, confirmText?: string, cancelText?: string}): Promise<{confirm: boolean, cancel: boolean}> => {
  return new Promise((resolve) => {
    // 使用浏览器原生confirm对话框或者自定义模态框
    if (options.title) {
      const result = window.confirm(`${options.title}\n\n${options.content}`)
      resolve({ confirm: result, cancel: !result })
    } else {
      const result = window.confirm(options.content)
      resolve({ confirm: result, cancel: !result })
    }
  })
}

let loadingElement: HTMLElement | null = null

/**
 * 显示Loading
 * @param title 加载提示文字
 */
export const showLoading = (title: string = '加载中...') => {
  // 移除已存在的loading
  if (loadingElement) {
    hideLoading()
  }
  
  // 创建loading元素
  loadingElement = document.createElement('div')
  loadingElement.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px;
        border-radius: 8px;
        text-align: center;
        min-width: 120px;
      ">
        <div style="
          width: 24px;
          height: 24px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 12px auto;
        "></div>
        <div style="font-size: 14px;">${title}</div>
      </div>
    </div>
  `
  
  // 添加旋转动画样式
  if (!document.getElementById('loading-styles')) {
    const style = document.createElement('style')
    style.id = 'loading-styles'
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `
    document.head.appendChild(style)
  }
  
  document.body.appendChild(loadingElement)
}

/**
 * 隐藏Loading
 */
export const hideLoading = () => {
  if (loadingElement && loadingElement.parentNode) {
    document.body.removeChild(loadingElement)
    loadingElement = null
  }
}

/**
 * 深拷贝对象
 * @param obj 要拷贝的对象
 * @returns 深拷贝后的对象
 */
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as any
  if (obj instanceof Array) {
    const cloneArr: any[] = []
    for (const item of obj) {
      cloneArr.push(deepClone(item))
    }
    return cloneArr as any
  }
  if (obj instanceof Object) {
    const cloneObj: any = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloneObj[key] = deepClone(obj[key])
      }
    }
    return cloneObj
  }
  return obj
}

/**
 * 防抖函数
 * @param func 要防抖的函数
 * @param wait 等待时间
 * @returns 防抖后的函数
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: any
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(this, args), wait)
  }
}

/**
 * 节流函数
 * @param func 要节流的函数
 * @param wait 等待时间
 * @returns 节流后的函数
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let previous = 0
  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now()
    if (now - previous > wait) {
      func.apply(this, args)
      previous = now
    }
  }
}

/**
 * 格式化金额
 * @param amount 金额（分）
 * @returns 格式化后的金额字符串
 */
export const formatMoney = (amount: number): string => {
  return (amount / 100).toFixed(2)
}

/**
 * 格式化手机号（隐藏中间四位）
 * @param phone 手机号
 * @returns 格式化后的手机号
 */
export const formatPhone = (phone: string): string => {
  if (!phone || phone.length !== 11) return phone
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
}

/**
 * 获取文件扩展名
 * @param filename 文件名
 * @returns 扩展名
 */
export const getFileExt = (filename: string): string => {
  const index = filename.lastIndexOf('.')
  return index > -1 ? filename.slice(index + 1).toLowerCase() : ''
}

/**
 * 生成UUID
 * @returns UUID字符串
 */
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}