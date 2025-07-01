/**
 * 转录相关API服务
 * 处理音视频转录的所有API请求
 */

import { apiClient } from './api'
import type {
  TranscriptionResult,
  TranscriptionSegment,
  UploadTranscriptionResponse,
} from '@/types'

// 转录请求参数 - 匹配后端API
export interface TranscriptionRequest {
  file: File
  language?: string
  enableSpeakerDiarization?: boolean
  enableTimestamps?: boolean
  model?: string
  deviceType?: 'cpu' | 'gpu' | 'auto'
}

// 转录配置
export interface TranscriptionConfig {
  language: string
  enableSpeakerDiarization: boolean
  enableTimestamps: boolean
  model: string
  deviceType: 'cpu' | 'gpu' | 'auto'
}

// 转录进度响应
export interface TranscriptionProgressResponse {
  transcriptionId: string
  progress: number
  status: 'processing' | 'completed' | 'error'
  segments?: TranscriptionSegment[]
  error?: string
}

/**
 * 转录API服务类
 */
export class TranscriptionAPI {
  /**
   * 上传文件并开始转录 - 匹配后端 /api/files/upload
   */
  static async uploadAndTranscribe(
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<UploadTranscriptionResponse> {
    const formData = new FormData()
    formData.append('file', file)

    return apiClient.upload('/files/upload', formData, {
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      },
    })
  }

  /**
   * 获取转录进度 - 匹配后端 /api/tasks/{task_id}/progress
   */
  static async getTranscriptionProgress(taskId?: string): Promise<TranscriptionProgressResponse> {
    if (!taskId) {
      throw new Error('任务ID不能为空')
    }
    return apiClient.get(`/tasks/${taskId}/progress`)
  }

  /**
   * 获取转录结果 - 匹配后端 /api/transcriptions/{id}
   */
  static async getTranscriptionResult(transcriptionId: string): Promise<TranscriptionResult> {
    return apiClient.get(`/transcriptions/${transcriptionId}`)
  }

  /**
   * 取消转录任务 - 匹配后端 /api/transcriptions/{id}/cancel
   */
  static async cancelTranscription(transcriptionId: string): Promise<{ success: boolean }> {
    return apiClient.post(`/transcriptions/${transcriptionId}/cancel`)
  }

  /**
   * 删除转录结果 - 匹配后端 /api/transcriptions/{id}
   */
  static async deleteTranscription(transcriptionId: string): Promise<{ success: boolean }> {
    return apiClient.delete(`/transcriptions/${transcriptionId}`)
  }

  /**
   * 获取用户的所有转录记录 - 匹配后端 /api/transcriptions/
   */
  static async getTranscriptionHistory(
    page = 1,
    pageSize = 20,
  ): Promise<{
    transcriptions: TranscriptionResult[]
    total: number
    page: number
    pageSize: number
  }> {
    return apiClient.get('/transcriptions', {
      params: { page, pageSize },
    })
  }

  /**
   * 更新转录配置 - 匹配后端 /api/transcriptions/config
   */
  static async updateTranscriptionConfig(
    config: TranscriptionConfig,
  ): Promise<{ success: boolean }> {
    return apiClient.post('/transcriptions/config', config)
  }

  /**
   * 获取转录配置 - 匹配后端 /api/transcriptions/config
   */
  static async getTranscriptionConfig(): Promise<TranscriptionConfig> {
    return apiClient.get('/transcriptions/config')
  }

  /**
   * 获取支持的语言列表 - 匹配后端 /api/transcriptions/languages
   */
  static async getSupportedLanguages(): Promise<{
    languages: Array<{ code: string; name: string; nativeName: string }>
  }> {
    return apiClient.get('/transcriptions/languages')
  }

  /**
   * 获取支持的模型列表 - 匹配后端 /api/transcriptions/models
   */
  static async getSupportedModels(): Promise<{
    models: Array<{ id: string; name: string; description: string; size: string }>
  }> {
    return apiClient.get('/transcriptions/models')
  }

  /**
   * 导出转录结果
   */
  static async exportTranscription(
    transcriptionId: string,
    format: 'vtt' | 'srt' | 'txt' | 'json',
    options?: {
      includeTimestamps?: boolean
      includeSpeakers?: boolean
      includeConfidence?: boolean
    },
  ): Promise<{ downloadUrl: string }> {
    return apiClient.post(`/transcriptions/${transcriptionId}/export`, {
      format,
      options,
    })
  }

  /**
   * 搜索转录内容
   */
  static async searchTranscriptions(
    query: string,
    fileId?: string,
    page = 1,
    pageSize = 20,
  ): Promise<{
    results: Array<{
      transcriptionId: string
      fileId: string
      fileName: string
      segments: TranscriptionSegment[]
      highlights: Array<{ start: number; end: number; text: string }>
    }>
    total: number
    page: number
    pageSize: number
  }> {
    return apiClient.get('/transcriptions/search', {
      params: { query, fileId, page, pageSize },
    })
  }
}

// 导出默认实例
export const transcriptionAPI = TranscriptionAPI
