/**
 * API服务层 - 统一的HTTP请求管理
 * 提供与VideoChat后端FastAPI的通信接口
 */

import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'

// 后端StandardResponse格式
export interface StandardResponse<T = unknown> {
  success: boolean
  data: T
  message: string
  code?: string
  timestamp: string
  request_id: string
}

// 后端分页响应格式
export interface PaginatedResponse<T = unknown> {
  items: T[]
  total: number
  page: number
  page_size: number
  has_next: boolean
  has_prev: boolean
}

// API错误类
export class ApiError extends Error {
  public readonly code?: string | undefined
  public readonly requestId?: string | undefined
  public readonly timestamp?: string | undefined

  constructor(message: string, code?: string, requestId?: string, timestamp?: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.requestId = requestId
    this.timestamp = timestamp
  }
}

// 响应适配器 - 统一处理后端响应格式
export class ApiResponseAdapter {
  /**
   * 适配StandardResponse格式，提取业务数据
   */
  static adaptStandardResponse<T>(response: StandardResponse<T>): T {
    if (response.success) {
      return response.data
    } else {
      throw new ApiError(
        response.message,
        response.code,
        response.request_id,
        response.timestamp
      )
    }
  }

  /**
   * 适配分页响应格式，转换为前端期望的格式
   */
  static adaptPaginatedResponse<T>(backendResponse: PaginatedResponse<T>) {
    return {
      items: backendResponse.items,
      total: backendResponse.total,
      page: backendResponse.page,
      pageSize: backendResponse.page_size,
      hasNext: backendResponse.has_next,
      hasPrev: backendResponse.has_prev
    }
  }
}

// 兼容性：保留原有ApiResponse接口
export interface ApiResponse<T = unknown> {
  success: boolean
  data: T
  message?: string
  error?: string
}

// 请求配置类型
export interface RequestConfig extends AxiosRequestConfig {
  skipErrorHandler?: boolean
}

/**
 * API客户端类
 * 封装axios实例，提供统一的请求处理
 */
class ApiClient {
  private instance: AxiosInstance

  constructor() {
    this.instance = axios.create({
      baseURL: '/api', // 通过Vite代理到后端8000端口
      timeout: 30000, // 30秒超时
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  /**
   * 设置请求和响应拦截器
   */
  private setupInterceptors(): void {
    // 请求拦截器
    this.instance.interceptors.request.use(
      (config) => {
        // 可以在这里添加认证token等
        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => {
        console.error('[API Request Error]', error)
        return Promise.reject(error)
      },
    )

    // 响应拦截器 - 适配StandardResponse格式
    this.instance.interceptors.response.use(
      (response: AxiosResponse<StandardResponse>) => {
        console.log(`[API Response] ${response.status} ${response.config.url}`)

        // 检查是否为StandardResponse格式
        const data = response.data
        if (data && typeof data === 'object' && 'success' in data) {
          // 如果是StandardResponse格式但失败，抛出ApiError
          if (!data.success) {
            throw new ApiError(
              data.message || '请求失败',
              data.code,
              data.request_id,
              data.timestamp
            )
          }
        }

        return response
      },
      (error) => {
        console.error('[API Response Error]', error)

        // 统一错误处理
        if (error.response) {
          const { status, data } = error.response

          // 如果是StandardResponse格式的错误
          if (data && typeof data === 'object' && 'success' in data && !data.success) {
            const apiError = new ApiError(
              data.message || '请求失败',
              data.code,
              data.request_id,
              data.timestamp
            )
            console.error('API业务错误:', apiError.message)
            return Promise.reject(apiError)
          }

          // HTTP状态码错误处理
          let errorMessage = '请求失败'
          switch (status) {
            case 400:
              errorMessage = '请求参数错误'
              break
            case 401:
              errorMessage = '未授权访问'
              break
            case 403:
              errorMessage = '禁止访问'
              break
            case 404:
              errorMessage = '资源不存在'
              break
            case 500:
              errorMessage = '服务器内部错误'
              break
            default:
              errorMessage = `请求失败: ${status}`
          }

          console.error(errorMessage, data?.message || data?.detail)
          return Promise.reject(new ApiError(errorMessage, status.toString()))

        } else if (error.request) {
          const networkError = new ApiError('网络连接错误')
          console.error('网络连接错误')
          return Promise.reject(networkError)
        } else {
          const configError = new ApiError(`请求配置错误: ${error.message}`)
          console.error('请求配置错误:', error.message)
          return Promise.reject(configError)
        }
      },
    )
  }

  /**
   * GET请求 - 自动适配StandardResponse格式
   */
  async get<T = unknown>(url: string, config?: RequestConfig): Promise<T> {
    const response = await this.instance.get<StandardResponse<T>>(url, config)
    return ApiResponseAdapter.adaptStandardResponse(response.data)
  }

  /**
   * POST请求 - 自动适配StandardResponse格式
   */
  async post<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    const response = await this.instance.post<StandardResponse<T>>(url, data, config)
    return ApiResponseAdapter.adaptStandardResponse(response.data)
  }

  /**
   * PUT请求 - 自动适配StandardResponse格式
   */
  async put<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    const response = await this.instance.put<StandardResponse<T>>(url, data, config)
    return ApiResponseAdapter.adaptStandardResponse(response.data)
  }

  /**
   * DELETE请求 - 自动适配StandardResponse格式
   */
  async delete<T = unknown>(url: string, config?: RequestConfig): Promise<T> {
    const response = await this.instance.delete<StandardResponse<T>>(url, config)
    return ApiResponseAdapter.adaptStandardResponse(response.data)
  }

  /**
   * 文件上传请求 - 自动适配StandardResponse格式
   */
  async upload<T = unknown>(url: string, formData: FormData, config?: RequestConfig): Promise<T> {
    const uploadConfig = {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config?.headers,
      },
    }
    const response = await this.instance.post<StandardResponse<T>>(url, formData, uploadConfig)
    return ApiResponseAdapter.adaptStandardResponse(response.data)
  }

  /**
   * 获取原始axios实例（用于特殊需求）
   */
  getInstance(): AxiosInstance {
    return this.instance
  }
}

// 导出API客户端实例
export const apiClient = new ApiClient()

// 导出常用方法的快捷方式
export const { get, post, put, delete: del, upload } = apiClient

// 导出具体的API服务
export { transcriptionAPI } from './transcription'
export { aiAPI } from './ai'
export { filesAPI } from './files'
export { tasksAPI } from './tasks'
export { systemAPI } from './system'

// 导出API相关类型
export type {
  TranscriptionRequest,
  TranscriptionConfig,
  TranscriptionProgressResponse,
} from './transcription'

export type {
  SummaryRequest,
  MindmapRequest,
  ChatRequest,
  EvaluationRequest,
  EvaluationResult,
} from './ai'

// 文件相关类型已移至 @/types
export type {
  FileUploadResponse,
  VideoDownloadResponse,
  FileListResponse,
  TaskInfo,
  TaskCreateRequest,
  TaskListResponse
} from '@/types'
