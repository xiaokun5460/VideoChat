/**
 * 全局类型定义
 * 定义VideoChat应用中使用的所有TypeScript类型
 */

// 文件相关类型
export interface FileInfo {
  id: string
  name: string
  size: number
  type: string
  url?: string
  uploadProgress?: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  createdAt: Date
  // 转录相关字段
  transcription?: {
    segments: TranscriptionSegment[]
    taskId?: string | undefined
    status: 'processing' | 'completed' | 'error'
  }
}

// 转录相关类型
export interface TranscriptionSegment {
  id: string
  start: number
  end: number
  text: string
  speaker?: string
  confidence?: number
}

export interface TranscriptionResult {
  id: string
  fileId: string
  segments: TranscriptionSegment[]
  language: string
  duration: number
  status: 'processing' | 'completed' | 'error'
  progress?: number
  createdAt: Date
}

// 后端上传API响应类型
export interface UploadTranscriptionResponse {
  transcription: TranscriptionSegment[]
  task_id?: string
  message?: string
  status?: string
}

// AI功能相关类型
export interface AISummary {
  id: string
  fileId: string
  content: string
  type: 'brief' | 'detailed'
  createdAt: Date
}

export interface AIMindmap {
  id: string
  fileId: string
  content: string
  format: 'json' | 'image'
  url?: string
  createdAt: Date
}

export interface AIChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface AIChatSession {
  id: string
  fileId: string
  messages: AIChatMessage[]
  createdAt: Date
}

export interface AIEvaluation {
  id: string
  fileId: string
  content: string
  score: number
  dimensions: Record<string, number>
  createdAt: Date
}

// 流式响应相关类型
export interface StreamingOptions {
  onStart?: () => void
  onChunk?: (chunk: string) => void
  onComplete?: (fullContent: string) => void
  onError?: (error: string) => void
  onAbort?: () => void
}

export interface StreamingState {
  isStreaming: boolean
  content: string
  error: string | null
  hasContent: boolean
  hasError: boolean
  canAbort: boolean
}

// 导出相关类型
export type ExportFormat = 'vtt' | 'srt' | 'txt' | 'json'

export interface ExportOptions {
  format: ExportFormat
  includeTimestamps?: boolean
  includeSpeakers?: boolean
  includeConfidence?: boolean
}

// 视频下载相关类型
export interface VideoDownloadRequest {
  url: string
  platform: 'youtube' | 'bilibili' | 'other'
  filename?: string
}

export interface VideoDownloadProgress {
  id: string
  url: string
  progress: number
  status: 'pending' | 'downloading' | 'completed' | 'error'
  filename?: string
  error?: string
  fileSize?: number
  downloadSpeed?: number
  eta?: number
}

// 用户界面相关类型
export interface ThemeConfig {
  mode: 'light' | 'dark'
  primaryColor: string
  accentColor: string
}

export interface UserPreferences {
  theme: ThemeConfig
  language: string
  autoSave: boolean
  notifications: boolean
}

// API响应类型
export interface ApiError {
  code: string
  message: string
  details?: unknown
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasNext: boolean
  hasPrev: boolean
}
