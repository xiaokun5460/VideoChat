/**
 * VideoChat API 服务封装
 * 基于APIClient的简化API接口
 */

import { apiClient, APIError, createRequestController } from './apiClient';
import { API_ENDPOINTS } from './types';

// ==================== 具体API接口封装 ====================

/**
 * 文件上传转录
 * @param {File} file - 要上传的文件
 * @param {import('./types').UploadOptions} options - 上传选项
 * @returns {Promise<import('./types').UploadResponse>} 上传结果
 */
export async function uploadAndTranscribe(file, options = {}) {
  const formData = new FormData();
  formData.append('file', file);

  return await apiClient.upload(API_ENDPOINTS.UPLOAD, formData, {
    timeout: 300000, // 5分钟超时
    ...options,
  });
}

/**
 * 查询上传进度
 * @param {string} taskId - 上传任务ID
 * @param {import('./types').APIOptions} options - API选项
 * @returns {Promise<import('./types').UploadProgress>} 上传进度信息
 */
export async function getUploadProgress(taskId, options = {}) {
  return await apiClient.get(`${API_ENDPOINTS.UPLOAD_PROGRESS}/${taskId}`, options);
}

/**
 * 查询转录进度
 * @param {string} taskId - 转录任务ID
 * @param {import('./types').APIOptions} options - API选项
 * @returns {Promise<import('./types').TranscriptionProgress>} 转录进度信息
 */
export async function getTranscriptionProgress(taskId, options = {}) {
  return await apiClient.get(`${API_ENDPOINTS.TRANSCRIPTION_PROGRESS}/${taskId}`, options);
}

/**
 * 生成简要总结
 * @param {string} text - 要总结的文本
 * @param {import('./types').AIOptions} options - AI选项
 * @returns {Promise<import('./types').SummaryResponse|null>} 总结结果
 */
export async function generateSummary(text, options = {}) {
  return await apiClient.postWithStream(API_ENDPOINTS.SUMMARY, { text, stream: options.stream }, options);
}

/**
 * 生成详细总结
 * @param {string} text - 要总结的文本
 * @param {import('./types').AIOptions} options - AI选项
 * @returns {Promise<import('./types').DetailedSummaryResponse|null>} 详细总结结果
 */
export async function generateDetailedSummary(text, options = {}) {
  return await apiClient.postWithStream(API_ENDPOINTS.DETAILED_SUMMARY, { text, stream: options.stream }, options);
}

/**
 * 生成思维导图（图片格式）
 * @param {string} text - 要生成思维导图的文本
 * @param {import('./types').APIOptions} options - API选项
 * @returns {Promise<import('./types').MindmapResponse>} 思维导图结果
 */
export async function generateMindmap(text, options = {}) {
  return await apiClient.post(API_ENDPOINTS.MINDMAP, { text }, options);
}

/**
 * 生成思维导图（JSON格式）
 * @param {string} text - 要生成思维导图的文本
 * @param {import('./types').APIOptions} options - API选项
 * @returns {Promise<import('./types').MindmapResponse>} 思维导图结果
 */
export async function generateMindmapJson(text, options = {}) {
  return await apiClient.post(API_ENDPOINTS.MINDMAP_JSON, { text, stream: false }, options);
}

/**
 * 下载文件（支持图片等二进制文件）
 * @param {string} url - 文件URL
 * @param {import('./types').APIOptions} options - 下载选项
 * @returns {Promise<Blob>} 文件数据
 */
export async function downloadFile(url, options = {}) {
  const response = await apiClient.request(url, {
    method: 'GET',
    responseType: 'blob',
    ...options,
  });
  return await response.blob();
}

/**
 * AI对话 - 支持持续会话
 * @param {import('./types').ChatMessage[]} messages - 对话消息列表
 * @param {string} context - 上下文信息
 * @param {import('./types').ChatOptions} options - 聊天选项
 * @returns {Promise<import('./types').ChatResponse|null>} 对话结果
 */
export async function chatWithAI(messages, context = '', options = {}) {
  const requestBody = {
    messages: messages, // 完整的对话历史
    context: context || '', // 上下文信息，后端会处理为系统消息
    stream: options.stream,
  };

  return await apiClient.postWithStream(API_ENDPOINTS.CHAT, requestBody, options);
}

/**
 * 生成智能评价
 * @param {string} text - 要评价的文本
 * @param {import('./types').AIOptions} options - AI选项
 * @returns {Promise<import('./types').EvaluationResponse|null>} 评价结果
 */
export async function generateTeachingEvaluation(text, options = {}) {
  return await apiClient.postWithStream(API_ENDPOINTS.EVALUATION, { text, stream: options.stream }, options);
}

/**
 * 导出内容为图片
 * @param {string} content - Markdown内容
 * @param {string} title - 标题
 * @param {string} contentType - 内容类型 (summary/evaluation/mindmap)
 * @param {import('./types').APIOptions} options - API选项
 * @returns {Promise<import('./types').ContentExportResponse>} 导出结果
 */
export async function exportContentToImage(content, title, contentType, options = {}) {
  return await apiClient.post(
    API_ENDPOINTS.EXPORT_CONTENT_IMAGE,
    {
      content,
      title,
      content_type: contentType,
    },
    {
      timeout: 60000, // 1分钟超时，图片生成可能需要较长时间
      ...options,
    }
  );
}

// ==================== 下载管理API ====================

/**
 * 下载视频
 * @param {string} url - 视频URL
 * @param {string} [filename] - 自定义文件名
 * @param {import('./types').APIOptions} options - API选项
 * @returns {Promise<import('./types').DownloadResponse>} 下载任务信息
 */
export async function downloadVideo(url, filename = null, options = {}) {
  return await apiClient.post(API_ENDPOINTS.DOWNLOAD_VIDEO, { url, filename }, options);
}

/**
 * 查询下载进度
 * @param {string} taskId - 下载任务ID
 * @param {import('./types').APIOptions} options - API选项
 * @returns {Promise<import('./types').DownloadProgress>} 下载进度信息
 */
export async function getDownloadProgress(taskId, options = {}) {
  return await apiClient.get(`${API_ENDPOINTS.DOWNLOAD_PROGRESS}/${taskId}`, options);
}

/**
 * 取消下载任务
 * @param {string} taskId - 下载任务ID
 * @param {import('./types').APIOptions} options - API选项
 * @returns {Promise<{message: string}>} 取消结果
 */
export async function cancelDownload(taskId, options = {}) {
  return await apiClient.post(`${API_ENDPOINTS.CANCEL_DOWNLOAD}/${taskId}`, {}, options);
}

// ==================== 转录控制API ====================

/**
 * 停止转录
 * @param {import('./types').APIOptions} options - API选项
 * @returns {Promise<{message: string}>} 停止结果
 */
export async function stopTranscription(options = {}) {
  return await apiClient.post(API_ENDPOINTS.STOP_TRANSCRIBE, {}, options);
}

/**
 * 转录已下载的文件
 * @param {string} filename - 文件名
 * @param {string} filePath - 文件路径
 * @param {import('./types').APIOptions} options - API选项
 * @returns {Promise<import('./types').UploadResponse>} 转录结果
 */
export async function transcribeDownloadedFile(filename, filePath, options = {}) {
  return await apiClient.post(
    API_ENDPOINTS.TRANSCRIBE_DOWNLOADED,
    { filename, file_path: filePath },
    {
      timeout: 300000, // 5分钟超时
      ...options,
    }
  );
}

// ==================== 导出功能API ====================

/**
 * 导出转录结果
 * @param {string} format - 导出格式：'vtt' | 'srt' | 'txt'
 * @param {import('./types').TranscriptionItem[]} transcription - 转录数据
 * @param {import('./types').APIOptions} options - API选项
 * @returns {Promise<import('./types').ExportResponse>} 导出结果
 */
export async function exportTranscription(format, transcription, options = {}) {
  return await apiClient.post(`${API_ENDPOINTS.EXPORT}/${format}`, transcription, options);
}

/**
 * 导出总结内容
 * @param {string} summaryText - 总结文本
 * @param {import('./types').APIOptions} options - API选项
 * @returns {Promise<import('./types').ExportResponse>} 导出结果
 */
export async function exportSummary(summaryText, options = {}) {
  return await apiClient.post(API_ENDPOINTS.EXPORT_SUMMARY, summaryText, options);
}

// ==================== 工具函数 ====================

/**
 * 提取转录文本
 * @param {import('./types').TranscriptionItem[]} transcription - 转录数据
 * @returns {string} 提取的文本
 */
export function extractTranscriptionText(transcription) {
  if (!transcription || !Array.isArray(transcription)) {
    return '';
  }
  return transcription.map((item) => item.text || '').join(' ');
}

/**
 * 格式化API错误
 * @param {Error} error - 错误对象
 * @returns {import('./types').APIErrorInfo} 格式化的错误信息
 */
export function formatAPIError(error) {
  if (error instanceof APIError) {
    return {
      message: error.message,
      status: error.status,
      isNetworkError: error.status === 0,
    };
  }

  return {
    message: error.message || '未知错误',
    status: 0,
    isNetworkError: true,
  };
}

/**
 * 验证文件类型
 * @param {File} file - 文件对象
 * @param {string[]} allowedTypes - 允许的文件类型
 * @returns {boolean} 是否为允许的文件类型
 */
export function validateFileType(file, allowedTypes = ['audio/*', 'video/*']) {
  if (!file || !file.type) {
    return false;
  }

  return allowedTypes.some((type) => {
    if (type.endsWith('/*')) {
      const category = type.slice(0, -2);
      return file.type.startsWith(category);
    }
    return file.type === type;
  });
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化的文件大小
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 重新导出APIClient相关
export { APIError, createRequestController };
