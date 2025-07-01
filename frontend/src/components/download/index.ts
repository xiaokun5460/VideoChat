/**
 * 下载功能组件统一导出
 */

export { default as VideoDownload } from './VideoDownload.vue'

// 导出下载相关组合式函数
export { useVideoDownload } from '@/composables/useVideoDownload'
export type { VideoDownloadComposable } from '@/composables/useVideoDownload'
