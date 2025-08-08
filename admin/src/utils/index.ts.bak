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
  uni.showToast({
    title,
    icon: icon as any,
    duration,
    mask: true
  })
}

/**
 * 显示模态对话框
 * @param options 对话框选项
 * @returns Promise<UniApp.ShowModalRes>
 */
export const showModal = (options: UniApp.ShowModalOptions): Promise<UniApp.ShowModalRes> => {
  return new Promise((resolve) => {
    uni.showModal({
      ...options,
      success: (res) => resolve(res),
      fail: () => resolve({ confirm: false, cancel: true })
    })
  })
}

/**
 * 显示Loading
 * @param title 加载提示文字
 */
export const showLoading = (title: string = '加载中...') => {
  uni.showLoading({
    title,
    mask: true
  })
}

/**
 * 隐藏Loading
 */
export const hideLoading = () => {
  uni.hideLoading()
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