/**
 * API客户端类
 * 提供统一的HTTP请求处理，支持流式响应和普通响应
 */

/**
 * API错误类
 */
export class APIError extends Error {
  constructor(message, status, response) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.response = response;
  }
}

/**
 * 流式响应处理器
 */
class StreamProcessor {
  constructor(onChunk, onComplete, onError) {
    this.onChunk = onChunk;
    this.onComplete = onComplete;
    this.onError = onError;
    this.accumulatedContent = ''; // 累积所有内容
  }

  async processStream(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // 传递累积的完整内容给onComplete回调
          this.onComplete?.(this.accumulatedContent);
          break;
        }

        // 解码数据块
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          // 累积内容
          this.accumulatedContent += chunk;
          // 传递数据块给onChunk回调
          this.onChunk?.(chunk);
        }
      }
    } catch (error) {
      this.onError?.(error);
    } finally {
      reader.releaseLock();
    }
  }
}

/**
 * API客户端类
 * 统一处理HTTP请求、错误处理、超时控制等
 */
export class APIClient {
  constructor(baseURL = 'http://localhost:8000', defaultOptions = {}) {
    this.baseURL = baseURL;
    this.defaultOptions = {
      timeout: 30000,
      headers: {},
      ...defaultOptions,
    };
  }

  /**
   * 创建请求配置
   * @param {string} endpoint - API端点
   * @param {Object} options - 请求选项
   * @returns {Object} 完整的请求配置
   */
  createRequestConfig(endpoint, options = {}) {
    const { method = 'GET', headers = {}, body, signal, isFormData = false, timeout = this.defaultOptions.timeout } = options;

    // 设置默认headers
    const defaultHeaders = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...this.defaultOptions.headers,
      ...headers,
    };

    return {
      url: `${this.baseURL}${endpoint}`,
      method,
      headers: defaultHeaders,
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
      signal,
      timeout,
    };
  }

  /**
   * 创建超时控制器
   * @param {number} timeout - 超时时间（毫秒）
   * @param {AbortSignal} signal - 外部信号
   * @returns {Object} 包含合并信号和清理函数的对象
   */
  createTimeoutController(timeout, signal) {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

    const combinedSignal = signal ? AbortSignal.any([signal, timeoutController.signal]) : timeoutController.signal;

    const cleanup = () => clearTimeout(timeoutId);

    return { combinedSignal, cleanup };
  }

  /**
   * 处理响应错误
   * @param {Response} response - HTTP响应对象
   * @throws {APIError} API错误
   */
  async handleResponseError(response) {
    let errorMessage;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || `HTTP ${response.status}`;
    } catch {
      errorMessage = (await response.text()) || `HTTP ${response.status}`;
    }
    throw new APIError(errorMessage, response.status, response);
  }

  /**
   * 基础请求方法
   * @param {string} endpoint - API端点
   * @param {Object} options - 请求选项
   * @returns {Promise<Response>} HTTP响应对象
   */
  async request(endpoint, options = {}) {
    const config = this.createRequestConfig(endpoint, options);
    const { combinedSignal, cleanup } = this.createTimeoutController(config.timeout, config.signal);

    try {
      const response = await fetch(config.url, {
        method: config.method,
        headers: config.headers,
        body: config.body,
        signal: combinedSignal,
      });

      cleanup();

      if (!response.ok) {
        await this.handleResponseError(response);
      }

      return response;
    } catch (error) {
      cleanup();

      if (error.name === 'AbortError') {
        throw new APIError('请求已取消', 0);
      }

      if (error instanceof APIError) {
        throw error;
      }

      throw new APIError(error.message || '网络请求失败', 0, null);
    }
  }

  /**
   * 处理JSON响应
   * @param {Response} response - HTTP响应对象
   * @returns {Promise<any>} 解析后的JSON数据
   */
  async handleJsonResponse(response) {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      return await response.json();
    } else {
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return { data: text };
      }
    }
  }

  /**
   * 处理流式响应
   * @param {Response} response - HTTP响应对象
   * @param {Function} onChunk - 数据块处理函数
   * @param {Function} onComplete - 完成回调函数
   * @param {Function} onError - 错误处理函数
   */
  async handleStreamResponse(response, onChunk, onComplete, onError) {
    const processor = new StreamProcessor(onChunk, onComplete, onError);
    await processor.processStream(response);
  }

  /**
   * GET请求
   * @param {string} endpoint - API端点
   * @param {Object} options - 请求选项
   * @returns {Promise<any>} 响应数据
   */
  async get(endpoint, options = {}) {
    const response = await this.request(endpoint, { ...options, method: 'GET' });
    return await this.handleJsonResponse(response);
  }

  /**
   * POST请求
   * @param {string} endpoint - API端点
   * @param {any} data - 请求数据
   * @param {Object} options - 请求选项
   * @returns {Promise<any>} 响应数据
   */
  async post(endpoint, data, options = {}) {
    const response = await this.request(endpoint, {
      ...options,
      method: 'POST',
      body: data,
    });
    return await this.handleJsonResponse(response);
  }

  /**
   * 流式POST请求
   * @param {string} endpoint - API端点
   * @param {any} data - 请求数据
   * @param {Object} streamOptions - 流式选项
   * @param {Object} options - 请求选项
   */
  async postStream(endpoint, data, streamOptions = {}, options = {}) {
    const { onChunk, onComplete, onError } = streamOptions;

    const response = await this.request(endpoint, {
      ...options,
      method: 'POST',
      body: data,
    });

    await this.handleStreamResponse(response, onChunk, onComplete, onError);
  }

  /**
   * 文件上传请求
   * @param {string} endpoint - API端点
   * @param {FormData} formData - 表单数据
   * @param {Object} options - 请求选项
   * @returns {Promise<any>} 响应数据
   */
  async upload(endpoint, formData, options = {}) {
    const response = await this.request(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
      isFormData: true,
      timeout: options.timeout || 300000, // 默认5分钟超时
    });
    return await this.handleJsonResponse(response);
  }

  /**
   * 支持流式和非流式的统一POST方法
   * @param {string} endpoint - API端点
   * @param {any} data - 请求数据
   * @param {Object} options - 请求选项
   * @returns {Promise<any>} 响应数据（非流式）或null（流式）
   */
  async postWithStream(endpoint, data, options = {}) {
    const { stream = false, onChunk, onComplete, onError, ...requestOptions } = options;

    if (stream) {
      await this.postStream(endpoint, data, { onChunk, onComplete, onError }, requestOptions);
      return null; // 流式响应不返回数据
    } else {
      return await this.post(endpoint, data, requestOptions);
    }
  }
}

// 创建默认的API客户端实例
export const apiClient = new APIClient();

// 导出工具函数
export function createRequestController() {
  return new AbortController();
}
