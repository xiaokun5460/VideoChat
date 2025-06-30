/**
 * API服务统一导出
 * 提供完整的API服务接口
 */

// API客户端和基础工具
export { APIClient, apiClient, APIError, createRequestController } from './apiClient';

// API接口函数
export {
  uploadAndTranscribe,
  generateSummary,
  generateDetailedSummary,
  generateMindmap,
  generateMindmapJson,
  downloadFile,
  chatWithAI,
  generateTeachingEvaluation,
  extractTranscriptionText,
  formatAPIError,
  validateFileType,
  formatFileSize,
} from './api';

// 类型定义和常量
export { API_ENDPOINTS, HTTP_METHODS, DEFAULT_CONFIG, ERROR_TYPES, HTTP_STATUS } from './types';

/**
 * API服务使用指南
 *
 * 1. 基础使用：
 * ```javascript
 * import { uploadAndTranscribe, generateSummary } from '@/services';
 *
 * // 文件上传
 * const result = await uploadAndTranscribe(file);
 *
 * // 生成总结
 * const summary = await generateSummary(text);
 * ```
 *
 * 2. 流式响应：
 * ```javascript
 * import { generateSummary } from '@/services';
 *
 * await generateSummary(text, {
 *   stream: true,
 *   onChunk: (chunk) => console.log('收到数据:', chunk),
 *   onComplete: () => console.log('完成'),
 *   onError: (error) => console.error('错误:', error)
 * });
 * ```
 *
 * 3. 请求取消：
 * ```javascript
 * import { generateSummary, createRequestController } from '@/services';
 *
 * const controller = createRequestController();
 *
 * // 开始请求
 * generateSummary(text, { signal: controller.signal });
 *
 * // 取消请求
 * controller.abort();
 * ```
 *
 * 4. 错误处理：
 * ```javascript
 * import { generateSummary, formatAPIError } from '@/services';
 *
 * try {
 *   const result = await generateSummary(text);
 * } catch (error) {
 *   const errorInfo = formatAPIError(error);
 *   console.error('API错误:', errorInfo);
 * }
 * ```
 *
 * 5. 自定义API客户端：
 * ```javascript
 * import { APIClient } from '@/services';
 *
 * const customClient = new APIClient('https://api.example.com', {
 *   timeout: 60000,
 *   headers: { 'Authorization': 'Bearer token' }
 * });
 *
 * const data = await customClient.post('/endpoint', { data: 'value' });
 * ```
 */

// 默认导出
export default {
  // 客户端
  apiClient,
  APIClient,
  APIError,
  createRequestController,

  // API接口
  uploadAndTranscribe,
  generateSummary,
  generateDetailedSummary,
  generateMindmap,
  generateMindmapJson,
  downloadFile,
  chatWithAI,
  generateTeachingEvaluation,

  // 工具函数
  extractTranscriptionText,
  formatAPIError,
  validateFileType,
  formatFileSize,

  // 常量
  API_ENDPOINTS,
  HTTP_METHODS,
  DEFAULT_CONFIG,
  ERROR_TYPES,
  HTTP_STATUS,
};
