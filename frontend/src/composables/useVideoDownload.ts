/**
 * 视频下载组合式函数
 * 处理在线视频下载功能，支持YouTube、Bilibili等平台
 */

import { ref, computed, onUnmounted } from 'vue'
import { useMessage } from 'naive-ui'
import type { VideoDownloadRequest, VideoDownloadProgress } from '@/types'

export const useVideoDownload = () => {
  const message = useMessage()

  // 响应式状态
  const downloads = ref<Map<string, VideoDownloadProgress>>(new Map())
  const isDownloading = ref(false)
  const downloadError = ref<string | null>(null)
  const pollingIntervals = ref<Map<string, number>>(new Map())

  // 计算属性
  const downloadList = computed(() => Array.from(downloads.value.values()))
  const activeDownloads = computed(() =>
    downloadList.value.filter((d) => d.status === 'downloading' || d.status === 'pending'),
  )
  const completedDownloads = computed(() =>
    downloadList.value.filter((d) => d.status === 'completed'),
  )
  const hasActiveDownloads = computed(() => activeDownloads.value.length > 0)
  const hasError = computed(() => downloadError.value !== null)

  /**
   * 检测视频平台
   */
  const detectPlatform = (url: string): 'youtube' | 'bilibili' | 'other' => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube'
    }
    if (url.includes('bilibili.com') || url.includes('b23.tv')) {
      return 'bilibili'
    }
    return 'other'
  }

  /**
   * 验证视频URL
   */
  const validateUrl = (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  /**
   * 开始下载视频
   */
  const startDownload = async (request: VideoDownloadRequest) => {
    if (!validateUrl(request.url)) {
      message.error('请输入有效的视频URL')
      return null
    }

    try {
      isDownloading.value = true
      downloadError.value = null

      // 发起下载请求
      const response = await fetch('/api/download-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: request.url,
          filename: request.filename || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || '下载启动失败')
      }

      const result = await response.json()
      const taskId = result.task_id

      // 创建下载进度对象
      const downloadProgress: VideoDownloadProgress = {
        id: taskId,
        url: request.url,
        progress: 0,
        status: 'pending',
        ...(request.filename && { filename: request.filename }),
      }

      downloads.value.set(taskId, downloadProgress)

      // 开始轮询进度
      startProgressPolling(taskId)

      message.success('下载任务已开始')
      return taskId
    } catch (error: any) {
      downloadError.value = error.message || '下载启动失败'
      message.error(error.message || '下载启动失败')
      console.error('下载启动错误:', error)
      return null
    } finally {
      isDownloading.value = false
    }
  }

  /**
   * 开始进度轮询
   */
  const startProgressPolling = (taskId: string) => {
    const interval = setInterval(async () => {
      try {
        const progress = await getDownloadProgress(taskId)
        if (progress) {
          downloads.value.set(taskId, progress)

          // 如果下载完成或失败，停止轮询
          if (progress.status === 'completed' || progress.status === 'error') {
            stopProgressPolling(taskId)

            if (progress.status === 'completed') {
              message.success(`视频下载完成: ${progress.filename || '未知文件'}`)
            } else if (progress.status === 'error') {
              message.error(`下载失败: ${progress.error || '未知错误'}`)
            }
          }
        }
      } catch (error) {
        console.error('获取下载进度失败:', error)
        stopProgressPolling(taskId)
      }
    }, 2000) // 每2秒轮询一次

    pollingIntervals.value.set(taskId, interval)
  }

  /**
   * 停止进度轮询
   */
  const stopProgressPolling = (taskId: string) => {
    const interval = pollingIntervals.value.get(taskId)
    if (interval) {
      clearInterval(interval)
      pollingIntervals.value.delete(taskId)
    }
  }

  /**
   * 获取下载进度
   */
  const getDownloadProgress = async (taskId: string): Promise<VideoDownloadProgress | null> => {
    try {
      const response = await fetch(`/api/download-progress/${taskId}`)

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`获取进度失败: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('获取下载进度错误:', error)
      return null
    }
  }

  /**
   * 取消下载
   */
  const cancelDownload = async (taskId: string) => {
    try {
      const response = await fetch(`/api/cancel-download/${taskId}`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error(`取消下载失败: ${response.status}`)
      }

      // 停止轮询
      stopProgressPolling(taskId)

      // 更新状态
      const download = downloads.value.get(taskId)
      if (download) {
        download.status = 'error'
        download.error = '用户取消'
        downloads.value.set(taskId, download)
      }

      message.info('下载已取消')
    } catch (error: any) {
      message.error(error.message || '取消下载失败')
      console.error('取消下载错误:', error)
    }
  }

  /**
   * 删除下载记录
   */
  const removeDownload = (taskId: string) => {
    stopProgressPolling(taskId)
    downloads.value.delete(taskId)
  }

  /**
   * 清空所有下载记录
   */
  const clearDownloads = () => {
    // 停止所有轮询
    pollingIntervals.value.forEach((interval) => {
      clearInterval(interval)
    })
    pollingIntervals.value.clear()

    // 清空下载记录
    downloads.value.clear()
  }

  /**
   * 重试下载
   */
  const retryDownload = async (taskId: string) => {
    const download = downloads.value.get(taskId)
    if (!download) return

    // 移除旧记录
    removeDownload(taskId)

    // 重新开始下载
    const downloadRequest: VideoDownloadRequest = {
      url: download.url,
      platform: detectPlatform(download.url),
    }
    if (download.filename) {
      downloadRequest.filename = download.filename
    }
    await startDownload(downloadRequest)
  }

  /**
   * 获取下载列表
   */
  const refreshDownloadList = async () => {
    try {
      const response = await fetch('/api/download-list')

      if (!response.ok) {
        throw new Error(`获取下载列表失败: ${response.status}`)
      }

      const result = await response.json()
      const downloadList = result.downloads || []

      // 更新下载状态
      downloadList.forEach((download: VideoDownloadProgress) => {
        downloads.value.set(download.id, download)

        // 如果是活跃下载，开始轮询
        if (download.status === 'downloading' || download.status === 'pending') {
          if (!pollingIntervals.value.has(download.id)) {
            startProgressPolling(download.id)
          }
        }
      })
    } catch (error) {
      console.error('刷新下载列表错误:', error)
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
   * 格式化下载速度
   */
  const formatSpeed = (bytesPerSecond: number): string => {
    return formatFileSize(bytesPerSecond) + '/s'
  }

  // 清理函数
  onUnmounted(() => {
    clearDownloads()
  })

  return {
    // 状态
    downloads,
    isDownloading,
    downloadError,

    // 计算属性
    downloadList,
    activeDownloads,
    completedDownloads,
    hasActiveDownloads,
    hasError,

    // 方法
    detectPlatform,
    validateUrl,
    startDownload,
    cancelDownload,
    removeDownload,
    clearDownloads,
    retryDownload,
    refreshDownloadList,
    formatFileSize,
    formatSpeed,
  }
}

// 导出类型
export type VideoDownloadComposable = ReturnType<typeof useVideoDownload>
