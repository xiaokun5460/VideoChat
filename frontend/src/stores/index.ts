/**
 * Pinia stores 统一入口
 * 导出所有store和相关类型
 */

// 导出所有stores
export { useAppStore, type AppStore } from './app'
export { useTranscriptionStore, type TranscriptionStore } from './transcription'
export { useAIStore, type AIStore } from './ai'
export { useFilesStore, type FilesStore } from './files'

// 导出store初始化函数
import { useAppStore } from './app'
import { useTranscriptionStore } from './transcription'
import { useAIStore } from './ai'
import { useFilesStore } from './files'

/**
 * 初始化所有stores
 * 在应用启动时调用
 */
export const initializeStores = () => {
  const appStore = useAppStore()
  const transcriptionStore = useTranscriptionStore()
  const aiStore = useAIStore()
  const filesStore = useFilesStore()
  
  // 初始化各个store
  appStore.initializeApp()
  transcriptionStore.initializeTranscriptionConfig()
  aiStore.initializeAIConfig()
  
  console.log('All stores initialized successfully')
  
  return {
    appStore,
    transcriptionStore,
    aiStore,
    filesStore
  }
}

/**
 * 重置所有stores状态
 * 用于用户登出或重置应用状态
 */
export const resetAllStores = () => {
  const appStore = useAppStore()
  const transcriptionStore = useTranscriptionStore()
  const aiStore = useAIStore()
  const filesStore = useFilesStore()
  
  appStore.resetAppState()
  transcriptionStore.resetTranscriptionState()
  aiStore.resetAIState()
  filesStore.resetFileState()
  
  console.log('All stores reset successfully')
}

/**
 * 获取所有stores的实例
 * 便于在组合式函数中使用
 */
export const useStores = () => {
  return {
    app: useAppStore(),
    transcription: useTranscriptionStore(),
    ai: useAIStore(),
    files: useFilesStore()
  }
}