/**
 * UI组件统一导出
 * 提供通用的UI组件和工具
 */

export { default as LoadingSpinner } from './LoadingSpinner.vue'
export { default as ErrorBoundary } from './ErrorBoundary.vue'

// 导出组件类型
export type LoadingSpinnerType = 'spinner' | 'pulse' | 'wave' | 'skeleton'
export type LoadingSpinnerSize = 'small' | 'medium' | 'large'
export type ErrorType = 'network' | 'server' | 'client' | 'unknown'
