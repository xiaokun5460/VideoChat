/**
 * 转录功能组合式函数
 * 提供音视频转录的核心逻辑，包括转录启动、进度跟踪、结果管理等功能
 */

import { ref, computed, watch } from 'vue'
import { useTranscriptionStore } from '@/stores/transcription'
import { TranscriptionAPI } from '@/services/transcription'
import type { TranscriptionResult, TranscriptionSegment, FileInfo } from '@/types'

// 转录配置选项
export interface TranscriptionOptions {
  language?: string
  enableSpeakerDiarization?: boolean
  enableTimestamps?: boolean
  model?: string
  deviceType?: 'cpu' | 'gpu' | 'auto'
}

// 搜索过滤选项
export interface SearchFilters {
  keyword?: string | undefined
  speaker?: string | undefined
  startTime?: number | undefined
  endTime?: number | undefined
  confidence?: number | undefined
}

export const useTranscription = () => {
  const transcriptionStore = useTranscriptionStore()

  // 响应式状态
  const isTranscribing = ref(false)
  const transcriptionProgress = ref(0)
  const currentTranscription = ref<TranscriptionResult | null>(null)
  const searchFilters = ref<SearchFilters>({})
  const selectedSegment = ref<TranscriptionSegment | null>(null)
  const editingSegment = ref<TranscriptionSegment | null>(null)

  // 轮询相关
  const progressTimer = ref<number | null>(null)
  const POLL_INTERVAL = 1000 // 1秒轮询一次

  // 计算属性
  const hasTranscription = computed(() => currentTranscription.value !== null)
  const transcriptionText = computed(() => {
    if (!currentTranscription.value) return ''
    return currentTranscription.value.segments.map((segment) => segment.text).join(' ')
  })

  const filteredSegments = computed(() => {
    if (!currentTranscription.value) return []

    let segments = currentTranscription.value.segments
    const filters = searchFilters.value

    // 关键词搜索
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase()
      segments = segments.filter((segment) => segment.text.toLowerCase().includes(keyword))
    }

    // 说话人过滤
    if (filters.speaker) {
      segments = segments.filter((segment) => segment.speaker === filters.speaker)
    }

    // 时间范围过滤
    if (filters.startTime !== undefined) {
      segments = segments.filter((segment) => segment.start >= filters.startTime!)
    }

    if (filters.endTime !== undefined) {
      segments = segments.filter((segment) => segment.end <= filters.endTime!)
    }

    // 置信度过滤
    if (filters.confidence !== undefined) {
      segments = segments.filter((segment) => (segment.confidence || 1) >= filters.confidence!)
    }

    return segments
  })

  const speakers = computed(() => {
    if (!currentTranscription.value) return []
    const speakerSet = new Set(
      currentTranscription.value.segments
        .map((segment) => segment.speaker)
        .filter((speaker): speaker is string => Boolean(speaker)),
    )
    return Array.from(speakerSet)
  })

  const transcriptionStats = computed(() => {
    if (!currentTranscription.value) {
      return {
        totalSegments: 0,
        totalDuration: 0,
        averageConfidence: 0,
        speakerCount: 0,
        wordCount: 0,
      }
    }

    const segments = currentTranscription.value.segments
    const totalWords = segments.reduce((sum, segment) => sum + segment.text.split(' ').length, 0)
    const totalConfidence = segments.reduce((sum, segment) => sum + (segment.confidence || 1), 0)

    return {
      totalSegments: segments.length,
      totalDuration: currentTranscription.value.duration,
      averageConfidence: segments.length > 0 ? totalConfidence / segments.length : 0,
      speakerCount: speakers.value.length,
      wordCount: totalWords,
    }
  })

  // 工具函数
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds)) return '00:00'

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
  }

  const formatDuration = (start: number, end: number): string => {
    const duration = end - start
    return formatTime(duration)
  }

  // 转录控制方法
  const startTranscription = async (file: FileInfo, _options: TranscriptionOptions = {}) => {
    try {
      isTranscribing.value = true
      transcriptionProgress.value = 0

      // 设置当前文件
      transcriptionStore.setCurrentFile(file)

      // 启动转录
      const transcriptionId = await transcriptionStore.startTranscription(file.id)

      // 注意：文件上传和转录已经在文件上传时自动开始
      // 这里只需要开始轮询进度
      startProgressPolling(transcriptionId)

      return transcriptionId
    } catch (error) {
      isTranscribing.value = false
      throw error
    }
  }

  const stopTranscription = async (transcriptionId: string) => {
    try {
      // TODO: 实现停止转录API调用
      stopProgressPolling()
      isTranscribing.value = false
      transcriptionStore.failTranscription(transcriptionId, '用户取消转录')
    } catch (error) {
      console.error('停止转录失败:', error)
    }
  }

  const startProgressPolling = (transcriptionId: string) => {
    if (progressTimer.value) {
      clearInterval(progressTimer.value)
    }

    progressTimer.value = window.setInterval(async () => {
      try {
        const progressData = await TranscriptionAPI.getTranscriptionProgress(transcriptionId)

        // 更新进度
        transcriptionProgress.value = progressData.progress || 0
        transcriptionStore.updateTranscriptionProgress(transcriptionId, progressData.progress || 0)

        // 检查是否完成
        if (progressData.status === 'completed') {
          stopProgressPolling()
          isTranscribing.value = false

          // 获取完整结果
          // TODO: 实现获取转录结果API
          const segments = progressData.segments || []

          transcriptionStore.completeTranscription(transcriptionId, segments, 'auto', 0)

          // 创建完整的转录结果对象
          const result: TranscriptionResult = {
            id: transcriptionId,
            fileId: transcriptionId,
            segments,
            language: 'auto',
            duration: 0,
            status: 'completed',
            createdAt: new Date(),
          }

          // 设置当前转录结果
          currentTranscription.value = result
        } else if (progressData.status === 'error') {
          stopProgressPolling()
          isTranscribing.value = false
          transcriptionStore.failTranscription(transcriptionId, progressData.error || '转录失败')
        }
      } catch (error) {
        console.error('获取转录进度失败:', error)
      }
    }, POLL_INTERVAL)
  }

  const stopProgressPolling = () => {
    if (progressTimer.value) {
      clearInterval(progressTimer.value)
      progressTimer.value = null
    }
  }

  // 转录结果管理
  const loadTranscription = async (transcriptionId: string) => {
    try {
      // TODO: 实现获取转录结果API
      const result = null
      currentTranscription.value = result
      transcriptionStore.setActiveTranscription(transcriptionId)
      return result
    } catch (error) {
      console.error('加载转录结果失败:', error)
      throw error
    }
  }

  const deleteTranscription = async (transcriptionId: string) => {
    try {
      // TODO: 实现删除转录API
      transcriptionStore.deleteTranscription(transcriptionId)

      if (currentTranscription.value?.id === transcriptionId) {
        currentTranscription.value = null
      }
    } catch (error) {
      console.error('删除转录结果失败:', error)
      throw error
    }
  }

  // 搜索和过滤
  const updateSearchFilters = (filters: Partial<SearchFilters>) => {
    searchFilters.value = { ...searchFilters.value, ...filters }
  }

  const clearSearchFilters = () => {
    searchFilters.value = {}
  }

  const searchByKeyword = (keyword: string) => {
    updateSearchFilters({ keyword })
  }

  const filterBySpeaker = (speaker: string) => {
    updateSearchFilters({ speaker })
  }

  const filterByTimeRange = (startTime: number, endTime: number) => {
    updateSearchFilters({ startTime, endTime })
  }

  // 片段操作
  const selectSegment = (segment: TranscriptionSegment) => {
    selectedSegment.value = segment
  }

  const clearSelection = () => {
    selectedSegment.value = null
  }

  const startEditingSegment = (segment: TranscriptionSegment) => {
    editingSegment.value = { ...segment }
  }

  const saveSegmentEdit = async (updatedSegment: TranscriptionSegment) => {
    if (!currentTranscription.value) return

    // 更新本地状态
    const segmentIndex = currentTranscription.value.segments.findIndex(
      (s) => s.id === updatedSegment.id,
    )

    if (segmentIndex !== -1) {
      currentTranscription.value.segments[segmentIndex] = updatedSegment
    }

    editingSegment.value = null

    // TODO: 调用后端API保存修改
    // await transcriptionAPI.updateSegment(updatedSegment)
  }

  const cancelSegmentEdit = () => {
    editingSegment.value = null
  }

  // 导出功能
  const exportTranscription = async (
    transcriptionId: string,
    format: 'vtt' | 'srt' | 'txt' | 'json',
    options?: {
      includeTimestamps?: boolean
      includeSpeakers?: boolean
      includeConfidence?: boolean
    },
  ) => {
    try {
      // TODO: 实现导出转录API
      console.log('导出转录:', transcriptionId, format, options)
      return ''
    } catch (error) {
      console.error('导出转录结果失败:', error)
      throw error
    }
  }

  // 搜索转录内容
  const searchTranscriptions = async (query: string, fileId?: string, page = 1, pageSize = 20) => {
    try {
      // TODO: 实现搜索转录API
      console.log('搜索转录:', query, fileId, page, pageSize)
      return { results: [], total: 0, page, pageSize }
    } catch (error) {
      console.error('搜索转录内容失败:', error)
      throw error
    }
  }

  // 获取转录历史
  const getTranscriptionHistory = async (page = 1, pageSize = 20) => {
    try {
      // TODO: 实现获取转录历史API
      console.log('获取转录历史:', page, pageSize)
      return { transcriptions: [], total: 0, page, pageSize }
    } catch (error) {
      console.error('获取转录历史失败:', error)
      throw error
    }
  }

  // 监听器
  watch(
    () => transcriptionStore.activeTranscription,
    (newTranscription) => {
      currentTranscription.value = newTranscription
    },
  )

  // 清理函数
  const cleanup = () => {
    stopProgressPolling()
    isTranscribing.value = false
    currentTranscription.value = null
    selectedSegment.value = null
    editingSegment.value = null
    clearSearchFilters()
  }

  return {
    // 状态
    isTranscribing,
    transcriptionProgress,
    currentTranscription,
    searchFilters,
    selectedSegment,
    editingSegment,

    // 计算属性
    hasTranscription,
    transcriptionText,
    filteredSegments,
    speakers,
    transcriptionStats,

    // 转录控制
    startTranscription,
    stopTranscription,
    loadTranscription,
    deleteTranscription,

    // 搜索和过滤
    updateSearchFilters,
    clearSearchFilters,
    searchByKeyword,
    filterBySpeaker,
    filterByTimeRange,

    // 片段操作
    selectSegment,
    clearSelection,
    startEditingSegment,
    saveSegmentEdit,
    cancelSegmentEdit,

    // 导出和搜索
    exportTranscription,
    searchTranscriptions,
    getTranscriptionHistory,

    // 工具函数
    formatTime,
    formatDuration,

    // 清理
    cleanup,
  }
}
