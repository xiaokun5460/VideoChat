/**
 * 文件管理状态store
 * 管理文件上传、下载、处理状态等
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FileInfo, VideoDownloadRequest, VideoDownloadProgress } from '@/types'
import { FileStatus } from '@/types'
import { FilesAPI } from '@/services/files'

export const useFilesStore = defineStore('files', () => {
  // 状态定义
  const files = ref<Map<string, FileInfo>>(new Map())
  const uploadQueue = ref<FileInfo[]>([])
  const downloadQueue = ref<VideoDownloadProgress[]>([])
  const currentFile = ref<FileInfo | null>(null)

  // 上传状态
  const isUploading = ref(false)
  const uploadProgress = ref(0)
  const uploadError = ref<string | null>(null)

  // 下载状态
  const isDownloading = ref(false)
  const downloadError = ref<string | null>(null)

  // 文件过滤和排序
  const fileFilter = ref({
    type: 'all' as 'all' | 'audio' | 'video',
    status: 'all' as 'all' | 'pending' | 'uploading' | 'completed' | 'error',
    sortBy: 'createdAt' as 'name' | 'size' | 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc',
  })

  // 计算属性
  const fileCount = computed(() => files.value.size)
  const uploadingFiles = computed(() =>
    Array.from(files.value.values()).filter((file) => file.status === FileStatus.PROCESSING),
  )
  const completedFiles = computed(() =>
    Array.from(files.value.values()).filter((file) =>
      file.status === FileStatus.COMPLETED || file.status === FileStatus.UPLOADED
    ),
  )
  const errorFiles = computed(() =>
    Array.from(files.value.values()).filter((file) => file.status === FileStatus.ERROR),
  )

  const filteredFiles = computed(() => {
    let fileList = Array.from(files.value.values())

    // 按类型过滤
    if (fileFilter.value.type !== 'all') {
      fileList = fileList.filter((file) => {
        if (fileFilter.value.type === 'audio') {
          return file.type.startsWith('audio/')
        } else if (fileFilter.value.type === 'video') {
          return file.type.startsWith('video/')
        }
        return true
      })
    }

    // 按状态过滤
    if (fileFilter.value.status !== 'all') {
      fileList = fileList.filter((file) => file.status === fileFilter.value.status)
    }

    // 排序
    fileList.sort((a, b) => {
      const { sortBy, sortOrder } = fileFilter.value
      let comparison = 0

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'size':
          comparison = a.size - b.size
          break
        case 'createdAt':
          comparison = (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0)
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return fileList
  })

  const totalUploadProgress = computed(() => {
    const uploadingFilesList = uploadingFiles.value
    if (uploadingFilesList.length === 0) return 0

    const totalProgress = uploadingFilesList.reduce(
      (sum, file) => sum + (file.uploadProgress || 0),
      0,
    )
    return Math.round(totalProgress / uploadingFilesList.length)
  })

  // Actions

  /**
   * 添加文件到上传队列
   */
  const addFileToQueue = (file: File): string => {
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const fileInfo: FileInfo = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      hash: '',
      status: FileStatus.UPLOADED,
      upload_time: new Date().toISOString(),
      url: '',
      uploadProgress: 0,
      createdAt: new Date(),
    }

    files.value.set(fileId, fileInfo)
    uploadQueue.value.push(fileInfo)

    return fileId
  }

  /**
   * 开始上传文件
   */
  const startFileUpload = (fileId: string) => {
    const file = files.value.get(fileId)
    if (!file) return

    file.status = FileStatus.PROCESSING
    file.uploadProgress = 0
    files.value.set(fileId, { ...file })

    isUploading.value = true
    uploadError.value = null
  }

  /**
   * 更新上传进度
   */
  const updateUploadProgress = (fileId: string, progress: number) => {
    const file = files.value.get(fileId)
    if (!file) return

    file.uploadProgress = progress
    files.value.set(fileId, { ...file })

    // 更新全局上传进度
    uploadProgress.value = totalUploadProgress.value
  }

  /**
   * 完成文件上传
   */
  const completeFileUpload = (fileId: string, uploadResponse?: any) => {
    const file = files.value.get(fileId)
    if (!file) return

    // 如果有后端返回的完整文件信息，使用它更新文件
    if (uploadResponse) {
      const updatedFile: FileInfo = {
        ...file,
        id: uploadResponse.id || fileId,
        hash: uploadResponse.hash,
        status: uploadResponse.status || 'completed',
        upload_time: uploadResponse.upload_time,
        url: uploadResponse.url,
        description: uploadResponse.description,
        tags: uploadResponse.tags,
        uploadProgress: 100
      }
      files.value.set(updatedFile.id, updatedFile)

      // 如果ID发生了变化，删除旧的记录
      if (uploadResponse.id && uploadResponse.id !== fileId) {
        files.value.delete(fileId)
      }
    } else {
      // 兼容旧的方式
      file.status = FileStatus.COMPLETED
      file.uploadProgress = 100
      files.value.set(fileId, { ...file })
    }

    // 从上传队列中移除
    uploadQueue.value = uploadQueue.value.filter((f) => f.id !== fileId)

    // 检查是否还有上传中的文件
    if (uploadingFiles.value.length === 0) {
      isUploading.value = false
      uploadProgress.value = 0
    }
  }

  /**
   * 上传失败
   */
  const failFileUpload = (fileId: string, error: string) => {
    const file = files.value.get(fileId)
    if (!file) return

    file.status = FileStatus.ERROR
    files.value.set(fileId, { ...file })

    uploadError.value = error

    // 从上传队列中移除
    uploadQueue.value = uploadQueue.value.filter((f) => f.id !== fileId)

    // 检查是否还有上传中的文件
    if (uploadingFiles.value.length === 0) {
      isUploading.value = false
    }
  }

  /**
   * 设置当前文件
   */
  const setCurrentFile = (fileId: string | null) => {
    if (fileId) {
      const file = files.value.get(fileId)
      currentFile.value = file || null
    } else {
      currentFile.value = null
    }
  }

  /**
   * 删除文件
   */
  const deleteFile = (fileId: string) => {
    files.value.delete(fileId)

    // 从上传队列中移除
    uploadQueue.value = uploadQueue.value.filter((f) => f.id !== fileId)

    // 如果删除的是当前文件，清除当前文件状态
    if (currentFile.value?.id === fileId) {
      currentFile.value = null
    }
  }

  /**
   * 开始视频下载
   */
  const startVideoDownload = (request: VideoDownloadRequest): string => {
    const downloadId = `download_${Date.now()}`

    const downloadProgress: VideoDownloadProgress = {
      id: downloadId,
      url: request.url,
      progress: 0,
      status: 'pending',
    }

    downloadQueue.value.push(downloadProgress)
    isDownloading.value = true
    downloadError.value = null

    return downloadId
  }

  /**
   * 更新下载进度
   */
  const updateDownloadProgress = (downloadId: string, progress: number) => {
    const download = downloadQueue.value.find((d) => d.id === downloadId)
    if (download) {
      download.progress = progress
      download.status = 'downloading'
    }
  }

  /**
   * 完成视频下载
   */
  const completeVideoDownload = (downloadId: string, filename: string) => {
    const download = downloadQueue.value.find((d) => d.id === downloadId)
    if (download) {
      download.progress = 100
      download.status = 'completed'
      download.filename = filename
    }

    // 检查是否还有下载中的任务
    const hasDownloading = downloadQueue.value.some((d) => d.status === 'downloading')
    if (!hasDownloading) {
      isDownloading.value = false
    }
  }

  /**
   * 下载失败
   */
  const failVideoDownload = (downloadId: string, error: string) => {
    const download = downloadQueue.value.find((d) => d.id === downloadId)
    if (download) {
      download.status = 'error'
      download.error = error
    }

    downloadError.value = error

    // 检查是否还有下载中的任务
    const hasDownloading = downloadQueue.value.some((d) => d.status === 'downloading')
    if (!hasDownloading) {
      isDownloading.value = false
    }
  }

  /**
   * 更新文件过滤器
   */
  const updateFileFilter = (filter: Partial<typeof fileFilter.value>) => {
    fileFilter.value = { ...fileFilter.value, ...filter }
  }

  /**
   * 清除上传错误
   */
  const clearUploadError = () => {
    uploadError.value = null
  }

  /**
   * 清除下载错误
   */
  const clearDownloadError = () => {
    downloadError.value = null
  }

  /**
   * 重试文件上传
   */
  const retryFileUpload = (fileId: string) => {
    const file = files.value.get(fileId)
    if (!file) return

    file.status = FileStatus.UPLOADED
    file.uploadProgress = 0
    files.value.set(fileId, { ...file })

    uploadQueue.value.push(file)
    clearUploadError()
  }

  /**
   * 获取文件统计信息
   */
  const getFileStats = () => {
    const stats = {
      total: fileCount.value,
      completed: completedFiles.value.length,
      uploading: uploadingFiles.value.length,
      error: errorFiles.value.length,
      totalSize: 0,
      audioFiles: 0,
      videoFiles: 0,
    }

    Array.from(files.value.values()).forEach((file) => {
      stats.totalSize += file.size
      if (file.type.startsWith('audio/')) {
        stats.audioFiles++
      } else if (file.type.startsWith('video/')) {
        stats.videoFiles++
      }
    })

    return stats
  }

  /**
   * 清理已完成的下载记录
   */
  const clearCompletedDownloads = () => {
    downloadQueue.value = downloadQueue.value.filter((d) => d.status !== 'completed')
  }

  /**
   * 设置文件转录结果
   */
  const setTranscriptionResult = (
    fileId: string,
    transcription: {
      segments: any[]
      taskId?: string | undefined
      status: 'processing' | 'completed' | 'error'
    },
  ) => {
    const file = files.value.get(fileId)
    if (!file) return

    file.transcription = transcription
    files.value.set(fileId, { ...file })
  }

  /**
   * 从后端获取文件列表
   */
  const fetchFileList = async (
    page = 1,
    pageSize = 100,
    filters?: {
      type?: 'audio' | 'video'
      status?: 'pending' | 'uploading' | 'completed' | 'error'
    }
  ) => {
    try {
      const response = await FilesAPI.getFileList(page, pageSize, filters)

      // 清空现有文件列表
      files.value.clear()

      // 添加从后端获取的文件
      if (response.items) {
        response.items.forEach((fileData: any) => {
          const fileInfo: FileInfo = {
            id: fileData.id,
            name: fileData.name,
            size: fileData.size,
            type: fileData.type,
            hash: fileData.hash,
            status: fileData.status,
            upload_time: fileData.upload_time,
            url: fileData.url,
            description: fileData.description,
            tags: fileData.tags,
            // 转换为前端兼容格式
            uploadProgress: 100, // 已上传完成
            createdAt: new Date(fileData.upload_time)
          }
          files.value.set(fileInfo.id, fileInfo)
        })
      }

      return response
    } catch (error) {
      console.error('获取文件列表失败:', error)
      throw error
    }
  }

  /**
   * 刷新文件列表（获取音频和视频文件）
   */
  const refreshFileList = async () => {
    try {
      // 获取音频文件
      await fetchFileList(1, 50, { type: 'audio' })
      // 获取视频文件
      await fetchFileList(1, 50, { type: 'video' })
    } catch (error) {
      console.error('刷新文件列表失败:', error)
    }
  }

  /**
   * 重置文件状态
   */
  const resetFileState = () => {
    isUploading.value = false
    isDownloading.value = false
    uploadProgress.value = 0
    uploadError.value = null
    downloadError.value = null
    currentFile.value = null
  }

  return {
    // 状态
    files,
    uploadQueue,
    downloadQueue,
    currentFile,
    isUploading,
    uploadProgress,
    uploadError,
    isDownloading,
    downloadError,
    fileFilter,

    // 计算属性
    fileCount,
    uploadingFiles,
    completedFiles,
    errorFiles,
    filteredFiles,
    totalUploadProgress,

    // Actions
    addFileToQueue,
    startFileUpload,
    updateUploadProgress,
    completeFileUpload,
    failFileUpload,
    setCurrentFile,
    deleteFile,
    startVideoDownload,
    updateDownloadProgress,
    completeVideoDownload,
    failVideoDownload,
    updateFileFilter,
    clearUploadError,
    clearDownloadError,
    retryFileUpload,
    getFileStats,
    clearCompletedDownloads,
    setTranscriptionResult,
    resetFileState,
    fetchFileList,
    refreshFileList,
  }
})

// 类型导出
export type FilesStore = ReturnType<typeof useFilesStore>
