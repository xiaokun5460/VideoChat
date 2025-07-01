/**
 * 全局类型定义
 * 定义VideoChat应用中使用的所有TypeScript类型
 */

// ============ 后端API响应格式 ============

// 标准响应格式（与后端StandardResponse匹配）
export interface StandardResponse<T = unknown> {
  success: boolean
  data: T
  message: string
  code?: string
  timestamp: string
  request_id: string
}

// 分页响应格式（与后端PaginatedResponse匹配）
export interface PaginatedResponse<T = unknown> {
  items: T[]
  total: number
  page: number
  page_size: number
  has_next: boolean
  has_prev: boolean
}

// 前端适配后的分页格式（保持向后兼容）
export interface PaginatedData<T = unknown> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasNext: boolean
  hasPrev: boolean
}

// ============ 后端枚举类型（与backend/core/models.py匹配） ============

// 任务状态枚举
export enum TaskStatus {
  CREATED = 'created',
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// 任务类型枚举
export enum TaskType {
  UPLOAD = 'upload',
  TRANSCRIPTION = 'transcription',
  AI_PROCESSING = 'ai_processing',
  DOWNLOAD = 'download',
  EXPORT = 'export'
}

// 文件状态枚举（更新为与后端匹配）
export enum FileStatus {
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error'
}

// ============ 文件相关类型 ============

// 文件信息（与后端FileInfo模型匹配）
export interface FileInfo {
  id: string
  name: string
  size: number
  type: string
  hash: string
  status: FileStatus
  upload_time: string  // ISO格式时间字符串
  url: string
  description?: string
  tags?: string[]

  // 前端扩展字段（保持向后兼容）
  uploadProgress?: number
  createdAt?: Date  // 从upload_time转换而来

  // 转录相关字段
  transcription?: {
    segments: TranscriptionSegment[]
    taskId?: string | undefined
    status: 'processing' | 'completed' | 'error'
  }
}

// 文件上传响应（与后端FileUploadResponse匹配）
export interface FileUploadResponse {
  id: string
  name: string
  size: number
  type: string
  hash: string
  status: FileStatus
  upload_time: string
  url: string
  description?: string
  tags?: string[]
}

// ============ 转录相关类型 ============

// 转录片段（与后端TranscriptionSegment模型匹配）
export interface TranscriptionSegment {
  id: string
  start: number  // 开始时间(秒)
  end: number    // 结束时间(秒)
  text: string   // 转录文本
  speaker?: string  // 说话人
  confidence?: number  // 置信度(0-1)
}

// 转录结果（与后端TranscriptionResult模型匹配）
export interface TranscriptionResult {
  id: string
  file_id: string
  task_id: string
  segments: TranscriptionSegment[]
  language: string
  duration: number  // 音频时长(秒)
  status: string    // 转录状态
  created_at: string
  updated_at: string

  // 前端扩展字段（保持向后兼容）
  fileId?: string  // 从file_id映射
  progress?: number
  createdAt?: Date  // 从created_at转换
}

// 转录列表响应
export interface TranscriptionListResponse extends PaginatedData<TranscriptionResult> {}

// 后端上传API响应类型（保持兼容）
export interface UploadTranscriptionResponse {
  transcription: TranscriptionSegment[]
  task_id?: string
  message?: string
  status?: string
}

// ============ 任务管理相关类型 ============

// 任务信息（与后端TaskInfo模型匹配）
export interface TaskInfo {
  id: string
  type: TaskType
  status: TaskStatus
  progress: number
  message: string
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
  result?: any
  error?: string
}

// 任务创建请求
export interface TaskCreateRequest {
  type: TaskType
  metadata?: Record<string, any>
}

// 任务列表响应
export interface TaskListResponse extends PaginatedData<TaskInfo> {}

// ============ AI功能相关类型 ============
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

// ============ API响应类型 ============

// API错误类型（与前端ApiError类匹配）
export interface ApiErrorInfo {
  code?: string
  message: string
  requestId?: string
  timestamp?: string
}

// 文件列表响应（使用新的分页格式）
export interface FileListResponse extends PaginatedData<FileInfo> {}

// 视频下载响应
export interface VideoDownloadResponse {
  downloadId: string
  status: 'pending' | 'downloading' | 'completed' | 'error'
  progress: number
  filename?: string
  fileSize?: number
  error?: string
}
