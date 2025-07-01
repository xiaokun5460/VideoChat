/**
 * 转录状态管理store
 * 管理音视频转录的状态、进度、结果等
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TranscriptionResult, TranscriptionSegment, FileInfo } from '@/types'

export const useTranscriptionStore = defineStore('transcription', () => {
  // 状态定义
  const currentFile = ref<FileInfo | null>(null)
  const transcriptionResults = ref<Map<string, TranscriptionResult>>(new Map())
  const activeTranscription = ref<TranscriptionResult | null>(null)
  const isTranscribing = ref(false)
  const transcriptionProgress = ref(0)
  const transcriptionError = ref<string | null>(null)
  
  // 转录配置
  const transcriptionConfig = ref({
    language: 'auto', // 自动检测语言
    enableSpeakerDiarization: true, // 说话人识别
    enableTimestamps: true, // 时间戳
    model: 'whisper-large-v3', // 模型选择
    deviceType: 'auto' // CPU/GPU自动选择
  })
  
  // 计算属性
  const hasActiveTranscription = computed(() => activeTranscription.value !== null)
  const transcriptionCount = computed(() => transcriptionResults.value.size)
  const completedTranscriptions = computed(() => {
    return Array.from(transcriptionResults.value.values())
      .filter(result => result.status === 'completed')
  })
  
  // Actions
  
  /**
   * 设置当前文件
   */
  const setCurrentFile = (file: FileInfo | null) => {
    currentFile.value = file
  }
  
  /**
   * 开始转录
   */
  const startTranscription = async (fileId: string) => {
    const file = currentFile.value
    if (!file || file.id !== fileId) {
      throw new Error('File not found or mismatch')
    }
    
    // 创建转录结果对象
    const transcriptionResult: TranscriptionResult = {
      id: `transcription_${Date.now()}`,
      fileId,
      segments: [],
      language: transcriptionConfig.value.language,
      duration: 0,
      status: 'processing',
      progress: 0,
      createdAt: new Date()
    }
    
    // 保存到状态
    transcriptionResults.value.set(transcriptionResult.id, transcriptionResult)
    activeTranscription.value = transcriptionResult
    isTranscribing.value = true
    transcriptionProgress.value = 0
    transcriptionError.value = null
    
    return transcriptionResult.id
  }
  
  /**
   * 更新转录进度
   */
  const updateTranscriptionProgress = (transcriptionId: string, progress: number) => {
    const result = transcriptionResults.value.get(transcriptionId)
    if (result) {
      result.progress = progress
      transcriptionProgress.value = progress
      
      // 更新Map中的值
      transcriptionResults.value.set(transcriptionId, { ...result })
    }
  }
  
  /**
   * 添加转录片段
   */
  const addTranscriptionSegment = (transcriptionId: string, segment: TranscriptionSegment) => {
    const result = transcriptionResults.value.get(transcriptionId)
    if (result) {
      result.segments.push(segment)
      // 更新Map中的值
      transcriptionResults.value.set(transcriptionId, { ...result })
    }
  }
  
  /**
   * 完成转录
   */
  const completeTranscription = (transcriptionId: string, segments: TranscriptionSegment[], language: string, duration: number) => {
    const result = transcriptionResults.value.get(transcriptionId)
    if (result) {
      result.segments = segments
      result.language = language
      result.duration = duration
      result.status = 'completed'
      result.progress = 100
      
      // 更新状态
      transcriptionResults.value.set(transcriptionId, { ...result })
      isTranscribing.value = false
      transcriptionProgress.value = 100
      
      // 如果是当前活跃的转录，更新活跃状态
      if (activeTranscription.value?.id === transcriptionId) {
        activeTranscription.value = { ...result }
      }
    }
  }
  
  /**
   * 转录失败
   */
  const failTranscription = (transcriptionId: string, error: string) => {
    const result = transcriptionResults.value.get(transcriptionId)
    if (result) {
      result.status = 'error'
      transcriptionError.value = error
      
      // 更新状态
      transcriptionResults.value.set(transcriptionId, { ...result })
      isTranscribing.value = false
      
      // 如果是当前活跃的转录，更新活跃状态
      if (activeTranscription.value?.id === transcriptionId) {
        activeTranscription.value = { ...result }
      }
    }
  }
  
  /**
   * 设置活跃转录
   */
  const setActiveTranscription = (transcriptionId: string | null) => {
    if (transcriptionId) {
      const result = transcriptionResults.value.get(transcriptionId)
      activeTranscription.value = result || null
    } else {
      activeTranscription.value = null
    }
  }
  
  /**
   * 删除转录结果
   */
  const deleteTranscription = (transcriptionId: string) => {
    transcriptionResults.value.delete(transcriptionId)
    
    // 如果删除的是当前活跃转录，清除活跃状态
    if (activeTranscription.value?.id === transcriptionId) {
      activeTranscription.value = null
    }
  }
  
  /**
   * 更新转录配置
   */
  const updateTranscriptionConfig = (config: Partial<typeof transcriptionConfig.value>) => {
    transcriptionConfig.value = { ...transcriptionConfig.value, ...config }
    
    // 保存配置到localStorage
    localStorage.setItem('videochat-transcription-config', JSON.stringify(transcriptionConfig.value))
  }
  
  /**
   * 获取转录文本
   */
  const getTranscriptionText = (transcriptionId: string): string => {
    const result = transcriptionResults.value.get(transcriptionId)
    if (!result) return ''
    
    return result.segments.map(segment => segment.text).join(' ')
  }
  
  /**
   * 根据时间查找转录片段
   */
  const findSegmentByTime = (transcriptionId: string, time: number): TranscriptionSegment | null => {
    const result = transcriptionResults.value.get(transcriptionId)
    if (!result) return null
    
    return result.segments.find(segment => 
      time >= segment.start && time <= segment.end
    ) || null
  }
  
  /**
   * 清除转录错误
   */
  const clearTranscriptionError = () => {
    transcriptionError.value = null
  }
  
  /**
   * 重置转录状态
   */
  const resetTranscriptionState = () => {
    activeTranscription.value = null
    isTranscribing.value = false
    transcriptionProgress.value = 0
    transcriptionError.value = null
  }
  
  /**
   * 初始化转录配置
   */
  const initializeTranscriptionConfig = () => {
    const savedConfig = localStorage.getItem('videochat-transcription-config')
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig)
        transcriptionConfig.value = { ...transcriptionConfig.value, ...parsed }
      } catch (error) {
        console.warn('Failed to parse saved transcription config:', error)
      }
    }
  }
  
  return {
    // 状态
    currentFile,
    transcriptionResults,
    activeTranscription,
    isTranscribing,
    transcriptionProgress,
    transcriptionError,
    transcriptionConfig,
    
    // 计算属性
    hasActiveTranscription,
    transcriptionCount,
    completedTranscriptions,
    
    // Actions
    setCurrentFile,
    startTranscription,
    updateTranscriptionProgress,
    addTranscriptionSegment,
    completeTranscription,
    failTranscription,
    setActiveTranscription,
    deleteTranscription,
    updateTranscriptionConfig,
    getTranscriptionText,
    findSegmentByTime,
    clearTranscriptionError,
    resetTranscriptionState,
    initializeTranscriptionConfig
  }
})

// 类型导出
export type TranscriptionStore = ReturnType<typeof useTranscriptionStore>