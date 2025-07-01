/**
 * 文件上传组合式函数
 * 提供文件上传的核心逻辑，包括分片上传、断点续传、进度跟踪等功能
 */

import { ref, computed } from 'vue'
import { useFilesStore } from '@/stores/files'
import { TranscriptionAPI } from '@/services/transcription'
import { useTaskManager } from './useTaskManager'
import { useMessage } from 'naive-ui'
import type { UploadTranscriptionResponse } from '@/types'

// 支持的文件类型
const SUPPORTED_AUDIO_TYPES = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg']
const SUPPORTED_VIDEO_TYPES = ['.mp4', '.avi', '.mov', '.mkv', '.flv', '.webm', '.wmv']
const SUPPORTED_TYPES = [...SUPPORTED_AUDIO_TYPES, ...SUPPORTED_VIDEO_TYPES]

// 文件大小限制 (10GB) - 分片上传支持大文件
const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024

// 分片大小 (5MB)
const CHUNK_SIZE = 5 * 1024 * 1024

// 上传状态
interface UploadState {
  fileId: string
  file: File
  chunks: Blob[]
  uploadedChunks: Set<number>
  currentChunk: number
  totalChunks: number
  progress: number
  speed: number
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'error'
  error?: string
  startTime?: number
  uploadedBytes: number
}

export const useFileUpload = () => {
  const filesStore = useFilesStore()
  const { startPolling } = useTaskManager()
  const message = useMessage()

  // 上传状态管理
  const uploadStates = ref<Map<string, UploadState>>(new Map())
  const isDragging = ref(false)
  const dragCounter = ref(0)

  // 计算属性
  const isUploading = computed(() => {
    return Array.from(uploadStates.value.values()).some((state) => state.status === 'uploading')
  })

  const totalProgress = computed(() => {
    const states = Array.from(uploadStates.value.values())
    if (states.length === 0) return 0

    const totalProgress = states.reduce((sum, state) => sum + state.progress, 0)
    return Math.round(totalProgress / states.length)
  })

  /**
   * 验证文件类型
   */
  const validateFileType = (file: File): boolean => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    return SUPPORTED_TYPES.includes(extension)
  }

  /**
   * 验证文件大小
   */
  const validateFileSize = (file: File): boolean => {
    return file.size <= MAX_FILE_SIZE
  }

  /**
   * 获取文件类型分类
   */
  const getFileCategory = (file: File): 'audio' | 'video' => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    return SUPPORTED_AUDIO_TYPES.includes(extension) ? 'audio' : 'video'
  }

  /**
   * 将文件分片
   */
  const createFileChunks = (file: File): Blob[] => {
    const chunks: Blob[] = []
    let start = 0

    while (start < file.size) {
      const end = Math.min(start + CHUNK_SIZE, file.size)
      chunks.push(file.slice(start, end))
      start = end
    }

    return chunks
  }

  /**
   * 计算文件哈希值（简化版）
   */
  const calculateFileHash = async (file: File): Promise<string> => {
    // 简化的哈希计算，实际项目中可以使用更复杂的算法
    const firstChunk = file.slice(0, Math.min(CHUNK_SIZE, file.size))
    const arrayBuffer = await firstChunk.arrayBuffer()
    const hashArray = Array.from(new Uint8Array(arrayBuffer))
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
    return `${file.name}_${file.size}_${hashHex.slice(0, 16)}`
  }

  /**
   * 开始文件上传
   */
  const startUpload = async (file: File): Promise<string> => {
    // 验证文件
    if (!validateFileType(file)) {
      throw new Error(`不支持的文件类型。支持的格式：${SUPPORTED_TYPES.join(', ')}`)
    }

    if (!validateFileSize(file)) {
      throw new Error(
        `文件大小超过限制。最大支持 ${Math.round(MAX_FILE_SIZE / 1024 / 1024 / 1024)}GB`,
      )
    }

    // 创建文件ID
    const fileId = await calculateFileHash(file)

    // 检查是否已经在上传
    if (uploadStates.value.has(fileId)) {
      throw new Error('文件已在上传队列中')
    }

    // 创建分片
    const chunks = createFileChunks(file)

    // 初始化上传状态
    const uploadState: UploadState = {
      fileId,
      file,
      chunks,
      uploadedChunks: new Set(),
      currentChunk: 0,
      totalChunks: chunks.length,
      progress: 0,
      speed: 0,
      status: 'pending',
      uploadedBytes: 0,
    }

    uploadStates.value.set(fileId, uploadState)

    // 添加到文件store
    filesStore.addFileToQueue(file)

    // 开始上传
    await uploadFile(fileId)

    return fileId
  }

  /**
   * 上传文件 - 使用真实API
   */
  const uploadFile = async (fileId: string) => {
    const state = uploadStates.value.get(fileId)
    if (!state) return

    state.status = 'uploading'
    state.startTime = Date.now()
    filesStore.startFileUpload(fileId)

    try {
      // 直接调用后端API上传文件并开始转录
      const result = (await TranscriptionAPI.uploadAndTranscribe(state.file, (progress) => {
        state.progress = progress
        state.uploadedBytes = (progress / 100) * state.file.size
        filesStore.updateUploadProgress(fileId, progress)
      })) as UploadTranscriptionResponse

      // 完成上传
      state.status = 'completed'
      state.progress = 100
      filesStore.completeFileUpload(fileId)

      // 保存转录结果和任务ID
      if (result.transcription && result.transcription.length > 0) {
        // 如果转录已完成，保存结果
        filesStore.setTranscriptionResult(fileId, {
          segments: result.transcription,
          taskId: result.task_id || undefined,
          status: 'completed',
        })
        message.success('文件上传和转录已完成！')
      } else if (result.task_id) {
        // 如果转录正在进行，保存任务ID用于跟踪
        filesStore.setTranscriptionResult(fileId, {
          segments: [],
          taskId: result.task_id,
          status: 'processing',
        })
        message.success('文件上传完成，正在进行转录...')
        startPolling() // 启动全局任务轮询
      }

      console.log('文件上传完成，转录状态:', result)
    } catch (error) {
      state.status = 'error'
      state.error = error instanceof Error ? error.message : '上传失败'
      filesStore.failFileUpload(fileId, state.error)
      throw error
    }
  }

  // /**
  //  * 检查已上传的分片
  //  */
  // const checkUploadedChunks = async (_fileId: string): Promise<number[]> => {
  //   try {
  //     // 这里应该调用后端API检查已上传的分片
  //     // const response = await filesAPI.checkUploadedChunks(fileId)
  //     // return response.uploadedChunks

  //     // 暂时返回空数组，表示没有已上传的分片
  //     return []
  //   } catch (error) {
  //     console.warn('检查已上传分片失败:', error)
  //     return []
  //   }
  // }

  // /**
  //  * 上传分片
  //  */
  // const uploadChunks = async (fileId: string) => {
  //   const state = uploadStates.value.get(fileId)
  //   if (!state) return

  //   const concurrency = 3 // 并发上传数量
  //   const uploadPromises: Promise<void>[] = []

  //   for (let i = state.currentChunk; i < state.totalChunks; i++) {
  //     if (state.uploadedChunks.has(i)) continue

  //     const uploadPromise = uploadChunk(fileId, i)
  //     uploadPromises.push(uploadPromise)

  //     // 控制并发数量
  //     if (uploadPromises.length >= concurrency) {
  //       await Promise.race(uploadPromises)
  //       // 移除已完成的Promise
  //       for (let j = uploadPromises.length - 1; j >= 0; j--) {
  //         if ((await Promise.race([uploadPromises[j], Promise.resolve('pending')])) !== 'pending') {
  //           uploadPromises.splice(j, 1)
  //         }
  //       }
  //     }
  //   }

  //   // 等待所有分片上传完成
  //   await Promise.all(uploadPromises)
  // }

  // /**
  //  * 上传单个分片
  //  */
  // const uploadChunk = async (fileId: string, chunkIndex: number) => {
  //   const state = uploadStates.value.get(fileId)
  //   if (!state) return

  //   const chunk = state.chunks[chunkIndex]
  //   const formData = new FormData()
  //   formData.append('file', chunk)
  //   formData.append('fileId', fileId)
  //   formData.append('chunkIndex', chunkIndex.toString())
  //   formData.append('totalChunks', state.totalChunks.toString())
  //   formData.append('fileName', state.file.name)

  //   try {
  //     // 这里应该调用后端API上传分片
  //     // await filesAPI.uploadChunk(formData)

  //     // 模拟上传延迟
  //     await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 200))

  //     // 更新状态
  //     state.uploadedChunks.add(chunkIndex)
  //     state.uploadedBytes += chunk.size

  //     // 计算进度和速度
  //     updateProgress(fileId)
  //   } catch (error) {
  //     throw new Error(`分片 ${chunkIndex} 上传失败: ${error}`)
  //   }
  // }

  // /**
  //  * 合并分片
  //  */
  // const mergeChunks = async (fileId: string) => {
  //   const state = uploadStates.value.get(fileId)
  //   if (!state) return

  //   try {
  //     // 这里应该调用后端API合并分片
  //     // const response = await filesAPI.mergeChunks(fileId, state.file.name)
  //     // return response.fileUrl

  //     // 模拟合并延迟
  //     await new Promise((resolve) => setTimeout(resolve, 1000))

  //     return `/uploads/${fileId}/${state.file.name}`
  //   } catch (error) {
  //     throw new Error(`文件合并失败: ${error}`)
  //   }
  // }

  // /**
  //  * 更新上传进度
  //  */
  // const updateProgress = (fileId: string) => {
  //   const state = uploadStates.value.get(fileId)
  //   if (!state) return

  //   // 计算进度
  //   const uploadedChunks = state.uploadedChunks.size
  //   state.progress = Math.round((uploadedChunks / state.totalChunks) * 100)

  //   // 计算上传速度
  //   if (state.startTime) {
  //     const elapsed = (Date.now() - state.startTime) / 1000 // 秒
  //     state.speed = elapsed > 0 ? state.uploadedBytes / elapsed : 0
  //   }

  //   // 更新文件store
  //   filesStore.updateUploadProgress(fileId, state.progress)
  // }

  /**
   * 暂停上传
   */
  const pauseUpload = (fileId: string) => {
    const state = uploadStates.value.get(fileId)
    if (state && state.status === 'uploading') {
      state.status = 'paused'
    }
  }

  /**
   * 恢复上传
   */
  const resumeUpload = async (fileId: string) => {
    const state = uploadStates.value.get(fileId)
    if (state && state.status === 'paused') {
      await uploadFile(fileId)
    }
  }

  /**
   * 取消上传
   */
  const cancelUpload = (fileId: string) => {
    const state = uploadStates.value.get(fileId)
    if (state) {
      state.status = 'error'
      state.error = '用户取消上传'
      uploadStates.value.delete(fileId)
      filesStore.failFileUpload(fileId, '用户取消上传')
    }
  }

  /**
   * 重试上传
   */
  const retryUpload = async (fileId: string) => {
    const state = uploadStates.value.get(fileId)
    if (state && state.status === 'error') {
      state.status = 'pending'
      delete state.error
      state.uploadedChunks.clear()
      state.currentChunk = 0
      state.progress = 0
      state.uploadedBytes = 0

      await uploadFile(fileId)
    }
  }

  /**
   * 格式化文件大小
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'

    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * 格式化上传速度
   */
  const formatSpeed = (bytesPerSecond: number): string => {
    return formatFileSize(bytesPerSecond) + '/s'
  }

  /**
   * 拖拽事件处理
   */
  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault()
    dragCounter.value++
    isDragging.value = true
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    dragCounter.value--
    if (dragCounter.value === 0) {
      isDragging.value = false
    }
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault()
    isDragging.value = false
    dragCounter.value = 0

    const files = Array.from(e.dataTransfer?.files || [])
    for (const file of files) {
      try {
        await startUpload(file)
      } catch (error) {
        console.error('文件上传失败:', error)
      }
    }
  }

  return {
    // 状态
    uploadStates,
    isDragging,
    isUploading,
    totalProgress,

    // 方法
    startUpload,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    retryUpload,
    validateFileType,
    validateFileSize,
    getFileCategory,
    formatFileSize,
    formatSpeed,

    // 拖拽事件
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,

    // 常量
    SUPPORTED_TYPES,
    MAX_FILE_SIZE,
  }
}
