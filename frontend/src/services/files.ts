/**
 * 文件管理相关API服务
 * 处理文件上传、下载、管理等API请求
 */

import { apiClient } from './api'
import type { FileInfo, VideoDownloadRequest, ExportOptions } from '@/types'

// 文件上传响应
export interface FileUploadResponse {
  fileId: string
  filename: string
  size: number
  type: string
  url: string
  uploadedAt: Date
}

// 视频下载响应
export interface VideoDownloadResponse {
  downloadId: string
  status: 'pending' | 'downloading' | 'completed' | 'error'
  progress: number
  filename?: string
  fileSize?: number
  error?: string
}

// 文件列表响应
export interface FileListResponse {
  files: FileInfo[]
  total: number
  page: number
  pageSize: number
}

/**
 * 文件管理API服务类
 */
export class FilesAPI {
  /**
   * 上传文件
   */
  static async uploadFile(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<FileUploadResponse> {
    const formData = new FormData()
    formData.append('file', file)
    
    return apiClient.upload('/files/upload', formData, {
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      }
    })
  }
  
  /**
   * 批量上传文件
   */
  static async uploadMultipleFiles(
    files: File[],
    onProgress?: (fileIndex: number, progress: number) => void
  ): Promise<FileUploadResponse[]> {
    const uploadPromises = files.map((file, index) => 
      this.uploadFile(file, (progress) => {
        onProgress?.(index, progress)
      })
    )
    
    return Promise.all(uploadPromises)
  }
  
  /**
   * 获取文件信息
   */
  static async getFileInfo(fileId: string): Promise<FileInfo> {
    return apiClient.get(`/files/${fileId}`)
  }
  
  /**
   * 获取文件列表
   */
  static async getFileList(
    page = 1,
    pageSize = 20,
    filters?: {
      type?: 'audio' | 'video'
      status?: 'pending' | 'uploading' | 'completed' | 'error'
      sortBy?: 'name' | 'size' | 'createdAt'
      sortOrder?: 'asc' | 'desc'
    }
  ): Promise<FileListResponse> {
    return apiClient.get('/files', {
      params: { page, pageSize, ...filters }
    })
  }
  
  /**
   * 删除文件
   */
  static async deleteFile(fileId: string): Promise<{ success: boolean }> {
    return apiClient.delete(`/files/${fileId}`)
  }
  
  /**
   * 批量删除文件
   */
  static async deleteMultipleFiles(fileIds: string[]): Promise<{
    success: boolean
    deletedCount: number
    errors: Array<{ fileId: string; error: string }>
  }> {
    return apiClient.post('/files/batch-delete', { fileIds })
  }
  
  /**
   * 重命名文件
   */
  static async renameFile(fileId: string, newName: string): Promise<{ success: boolean }> {
    return apiClient.put(`/files/${fileId}/rename`, { name: newName })
  }
  
  /**
   * 获取文件下载链接
   */
  static async getDownloadUrl(fileId: string): Promise<{ downloadUrl: string; expiresAt: Date }> {
    return apiClient.get(`/files/${fileId}/download`)
  }
  
  /**
   * 开始视频下载
   */
  static async startVideoDownload(request: VideoDownloadRequest): Promise<{ downloadId: string }> {
    return apiClient.post('/files/video-download/start', request)
  }
  
  /**
   * 获取视频下载进度
   */
  static async getVideoDownloadProgress(downloadId: string): Promise<VideoDownloadResponse> {
    return apiClient.get(`/files/video-download/progress/${downloadId}`)
  }
  
  /**
   * 取消视频下载
   */
  static async cancelVideoDownload(downloadId: string): Promise<{ success: boolean }> {
    return apiClient.post(`/files/video-download/cancel/${downloadId}`)
  }
  
  /**
   * 获取视频下载历史
   */
  static async getVideoDownloadHistory(page = 1, pageSize = 20): Promise<{
    downloads: VideoDownloadResponse[]
    total: number
    page: number
    pageSize: number
  }> {
    return apiClient.get('/files/video-download/history', {
      params: { page, pageSize }
    })
  }
  
  /**
   * 获取支持的视频平台
   */
  static async getSupportedPlatforms(): Promise<{
    platforms: Array<{
      id: string
      name: string
      domains: string[]
      supportedFormats: string[]
      maxQuality: string
    }>
  }> {
    return apiClient.get('/files/video-download/platforms')
  }
  
  /**
   * 解析视频信息
   */
  static async parseVideoInfo(url: string): Promise<{
    title: string
    duration: number
    thumbnail: string
    formats: Array<{
      quality: string
      format: string
      size: number
    }>
    platform: string
  }> {
    return apiClient.post('/files/video-download/parse', { url })
  }
  
  /**
   * 导出文件数据
   */
  static async exportFileData(
    fileId: string,
    options: ExportOptions
  ): Promise<{ downloadUrl: string; filename: string }> {
    return apiClient.post(`/files/${fileId}/export`, options)
  }
  
  /**
   * 批量导出文件数据
   */
  static async exportMultipleFiles(
    fileIds: string[],
    options: ExportOptions
  ): Promise<{ downloadUrl: string; filename: string }> {
    return apiClient.post('/files/batch-export', { fileIds, options })
  }
  
  /**
   * 获取文件统计信息
   */
  static async getFileStats(): Promise<{
    totalFiles: number
    totalSize: number
    audioFiles: number
    videoFiles: number
    completedUploads: number
    failedUploads: number
    storageUsed: number
    storageLimit: number
    monthlyStats: Array<{
      month: string
      uploads: number
      downloads: number
      size: number
    }>
  }> {
    return apiClient.get('/files/stats')
  }
  
  /**
   * 搜索文件
   */
  static async searchFiles(
    query: string,
    filters?: {
      type?: 'audio' | 'video'
      dateFrom?: Date
      dateTo?: Date
      sizeMin?: number
      sizeMax?: number
    },
    page = 1,
    pageSize = 20
  ): Promise<{
    files: FileInfo[]
    total: number
    page: number
    pageSize: number
    highlights: Array<{
      fileId: string
      matches: Array<{ field: string; value: string }>
    }>
  }> {
    return apiClient.get('/files/search', {
      params: { query, ...filters, page, pageSize }
    })
  }
  
  /**
   * 获取文件预览信息
   */
  static async getFilePreview(fileId: string): Promise<{
    previewUrl?: string
    thumbnailUrl?: string
    metadata: {
      duration?: number
      bitrate?: number
      sampleRate?: number
      channels?: number
      codec?: string
      resolution?: string
    }
  }> {
    return apiClient.get(`/files/${fileId}/preview`)
  }
  
  /**
   * 检查文件完整性
   */
  static async verifyFileIntegrity(fileId: string): Promise<{
    isValid: boolean
    checksum: string
    issues: string[]
  }> {
    return apiClient.post(`/files/${fileId}/verify`)
  }
  
  /**
   * 获取存储配置
   */
  static async getStorageConfig(): Promise<{
    maxFileSize: number
    allowedTypes: string[]
    storageLimit: number
    retentionDays: number
    compressionEnabled: boolean
  }> {
    return apiClient.get('/files/config')
  }
}

// 导出默认实例
export const filesAPI = FilesAPI