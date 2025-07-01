/**
 * AI功能组件统一导出
 */

export { default as AIFeatures } from './AIFeatures.vue'
export { default as SummaryView } from './SummaryView.vue'
export { default as MindmapView } from './MindmapView.vue'
export { default as ChatInterface } from './ChatInterface.vue'
export { default as EvaluationView } from './EvaluationView.vue'

// 导出AI相关组合式函数
export { useStreamingResponse } from '@/composables/useStreamingResponse'
export type { StreamingOptions, StreamingResponse } from '@/composables/useStreamingResponse'
