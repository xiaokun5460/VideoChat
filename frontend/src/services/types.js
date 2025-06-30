/**
 * API类型定义文件
 * 使用JSDoc提供类型定义和文档
 */

/**
 * @typedef {Object} APIOptions
 * @property {AbortSignal} [signal] - 请求取消信号
 * @property {number} [timeout] - 请求超时时间（毫秒）
 * @property {Object} [headers] - 自定义请求头
 */

/**
 * @typedef {Object} StreamOptions
 * @property {boolean} [stream=false] - 是否使用流式响应
 * @property {Function} [onChunk] - 流式数据块处理函数
 * @property {Function} [onComplete] - 流式响应完成回调
 * @property {Function} [onError] - 流式响应错误处理
 */

/**
 * @typedef {APIOptions & StreamOptions} APIStreamOptions
 */

/**
 * @typedef {Object} TranscriptionItem
 * @property {string} text - 转录文本
 * @property {number} [start] - 开始时间（秒）
 * @property {number} [end] - 结束时间（秒）
 * @property {number} [confidence] - 置信度
 */

/**
 * @typedef {Object} UploadResponse
 * @property {string} message - 响应消息
 * @property {string} filename - 文件名
 * @property {TranscriptionItem[]} transcription - 转录结果
 * @property {Object} [metadata] - 文件元数据
 */

/**
 * @typedef {Object} SummaryResponse
 * @property {string} summary - 总结内容
 * @property {Object} [metadata] - 元数据
 */

/**
 * @typedef {Object} DetailedSummaryResponse
 * @property {string} detailed_summary - 详细总结内容
 * @property {string} detailedSummary - 详细总结内容（备用字段）
 * @property {Object} [metadata] - 元数据
 */

/**
 * @typedef {Object} MindmapResponse
 * @property {string} image_url - 思维导图图片URL
 * @property {string} [html] - HTML格式的思维导图
 * @property {Object} [metadata] - 元数据
 */

/**
 * @typedef {Object} ChatMessage
 * @property {string} role - 消息角色：'user' | 'assistant' | 'system'
 * @property {string} content - 消息内容
 * @property {number} [timestamp] - 时间戳
 */

/**
 * @typedef {Object} ChatResponse
 * @property {string} response - AI回复内容
 * @property {ChatMessage[]} [messages] - 完整对话历史
 * @property {Object} [metadata] - 元数据
 */

/**
 * @typedef {Object} EvaluationResponse
 * @property {string} evaluation - 评价内容
 * @property {number} [score] - 评分
 * @property {Object} [details] - 详细评价信息
 * @property {Object} [metadata] - 元数据
 */

/**
 * @typedef {Object} DownloadRequest
 * @property {string} url - 下载URL
 * @property {string} [filename] - 自定义文件名
 */

/**
 * @typedef {Object} DownloadResponse
 * @property {string} task_id - 下载任务ID
 * @property {string} message - 响应消息
 * @property {string} url - 下载URL
 */

/**
 * @typedef {Object} DownloadProgress
 * @property {string} task_id - 任务ID
 * @property {string} status - 下载状态：'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled'
 * @property {number} progress - 下载进度（0-100）
 * @property {string} filename - 文件名
 * @property {string} [speed] - 下载速度
 * @property {string} [eta] - 预计剩余时间
 * @property {string} [error_message] - 错误消息
 */

/**
 * @typedef {Object} TranscribeDownloadedRequest
 * @property {string} filename - 文件名
 * @property {string} file_path - 文件路径
 */

/**
 * @typedef {Object} TranscriptionProgress
 * @property {string} task_id - 转录任务ID
 * @property {string} status - 转录状态：'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
 * @property {number} progress - 转录进度（0-100）
 * @property {string} filename - 文件名
 * @property {string} [current_stage] - 当前处理阶段
 * @property {string} [eta] - 预计剩余时间
 * @property {string} [error_message] - 错误消息
 * @property {TranscriptionItem[]} [partial_result] - 部分转录结果
 */

/**
 * @typedef {Object} UploadProgress
 * @property {number} loaded - 已上传字节数
 * @property {number} total - 总字节数
 * @property {number} percentage - 上传进度百分比（0-100）
 * @property {string} [speed] - 上传速度
 * @property {string} [eta] - 预计剩余时间
 */

/**
 * @typedef {Object} ExportRequest
 * @property {string} format - 导出格式：'vtt' | 'srt' | 'txt'
 * @property {TranscriptionItem[]} data - 转录数据
 */

/**
 * @typedef {Object} ExportResponse
 * @property {string} download_url - 下载链接
 * @property {string} filename - 文件名
 * @property {string} format - 导出格式
 */

/**
 * @typedef {Object} ContentExportResponse
 * @property {string} image_url - 图片URL
 * @property {string} [filename] - 文件名
 * @property {Object} [metadata] - 元数据
 */

/**
 * @typedef {Object} APIErrorInfo
 * @property {string} message - 错误消息
 * @property {number} status - HTTP状态码
 * @property {boolean} isNetworkError - 是否为网络错误
 */

/**
 * 文件上传API选项
 * @typedef {Object} UploadOptions
 * @property {AbortSignal} [signal] - 请求取消信号
 * @property {Function} [onProgress] - 上传进度回调
 * @property {number} [timeout=300000] - 超时时间（默认5分钟）
 */

/**
 * AI功能通用选项
 * @typedef {Object} AIOptions
 * @property {AbortSignal} [signal] - 请求取消信号
 * @property {boolean} [stream=false] - 是否使用流式响应
 * @property {Function} [onChunk] - 流式数据块处理函数
 * @property {Function} [onComplete] - 流式响应完成回调
 * @property {Function} [onError] - 流式响应错误处理
 * @property {number} [timeout] - 请求超时时间
 */

/**
 * 聊天API选项
 * @typedef {Object} ChatOptions
 * @property {AbortSignal} [signal] - 请求取消信号
 * @property {boolean} [stream=false] - 是否使用流式响应
 * @property {Function} [onChunk] - 流式数据块处理函数
 * @property {Function} [onComplete] - 流式响应完成回调
 * @property {Function} [onError] - 流式响应错误处理
 * @property {string} [context] - 上下文信息
 * @property {number} [maxTokens] - 最大token数
 * @property {number} [temperature] - 温度参数
 */

/**
 * API端点常量
 */
export const API_ENDPOINTS = {
  // 文件上传和转录
  UPLOAD: '/api/upload',
  UPLOAD_PROGRESS: '/api/upload-progress',
  STOP_TRANSCRIBE: '/api/stop-transcribe',
  TRANSCRIBE_DOWNLOADED: '/api/transcribe-downloaded',
  TRANSCRIPTION_PROGRESS: '/api/transcription-progress',

  // AI功能
  SUMMARY: '/api/summary',
  DETAILED_SUMMARY: '/api/detailed-summary',
  MINDMAP: '/api/mindmap-image',
  MINDMAP_JSON: '/api/mindmap',
  CHAT: '/api/chat',
  EVALUATION: '/api/ai/evaluate-teaching',

  // 下载管理
  DOWNLOAD_VIDEO: '/api/download-video',
  DOWNLOAD_PROGRESS: '/api/download-progress',
  CANCEL_DOWNLOAD: '/api/cancel-download',

  // 导出功能
  EXPORT: '/api/export',
  EXPORT_SUMMARY: '/api/export/summary',
  EXPORT_CONTENT_IMAGE: '/api/export-content-image',
};

/**
 * HTTP方法常量
 */
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH',
};

/**
 * 默认配置常量
 */
export const DEFAULT_CONFIG = {
  TIMEOUT: 30000,
  UPLOAD_TIMEOUT: 300000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
};

/**
 * 错误类型常量
 */
export const ERROR_TYPES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  ABORT_ERROR: 'ABORT_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
};

/**
 * 响应状态码常量
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
};

// 导出类型定义（用于IDE类型提示）
const TypesExport = {
  API_ENDPOINTS,
  HTTP_METHODS,
  DEFAULT_CONFIG,
  ERROR_TYPES,
  HTTP_STATUS,
};

export default TypesExport;
