/**
 * 转录组件统一导出
 */

export { default as TranscriptionProgress } from './TranscriptionProgress.vue'
export { default as TranscriptionView } from './TranscriptionView.vue'
export { default as TranscriptionSegment } from './TranscriptionSegment.vue'

// 导出转录相关类型和组合式函数
export { useTranscription } from '@/composables/useTranscription'
export type { TranscriptionOptions, SearchFilters } from '@/composables/useTranscription'