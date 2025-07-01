/**
 * API服务层 - 统一的HTTP请求管理
 * 提供与VideoChat后端FastAPI的通信接口
 */

import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'

// API响应基础类型
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

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`[API Response] ${response.status} ${response.config.url}`)
        return response
      },
      (error) => {
        console.error('[API Response Error]', error)

        // 统一错误处理
        if (error.response) {
          const { status, data } = error.response
          switch (status) {
            case 400:
              console.error('请求参数错误:', data.message || data.detail)
              break
            case 401:
              console.error('未授权访问')
              break
            case 403:
              console.error('禁止访问')
              break
            case 404:
              console.error('资源不存在')
              break
            case 500:
              console.error('服务器内部错误')
              break
            default:
              console.error(`请求失败: ${status}`)
          }
        } else if (error.request) {
          console.error('网络连接错误')
        } else {
          console.error('请求配置错误:', error.message)
        }

        return Promise.reject(error)
      },
    )
  }

  /**
   * GET请求
   */
  async get<T = unknown>(url: string, config?: RequestConfig): Promise<T> {
    const response = await this.instance.get<T>(url, config)
    return response.data
  }

  /**
   * POST请求
   */
  async post<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    const response = await this.instance.post<T>(url, data, config)
    return response.data
  }

  /**
   * PUT请求
   */
  async put<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    const response = await this.instance.put<T>(url, data, config)
    return response.data
  }

  /**
   * DELETE请求
   */
  async delete<T = unknown>(url: string, config?: RequestConfig): Promise<T> {
    const response = await this.instance.delete<T>(url, config)
    return response.data
  }

  /**
   * 文件上传请求
   */
  async upload<T = unknown>(url: string, formData: FormData, config?: RequestConfig): Promise<T> {
    const uploadConfig = {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config?.headers,
      },
    }
    const response = await this.instance.post<T>(url, formData, uploadConfig)
    return response.data
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

export type { FileUploadResponse, VideoDownloadResponse, FileListResponse } from './files'
