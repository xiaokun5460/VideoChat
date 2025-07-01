/**
 * AI功能相关API服务
 * 处理AI摘要、思维导图、对话等功能的API请求
 */

import { apiClient } from './api'
import type { AIMindmap } from '@/types'

// AI摘要请求参数 - 匹配后端API
export interface SummaryRequest {
  text: string
  stream?: boolean
}

// AI思维导图请求参数 - 匹配后端API
export interface MindmapRequest {
  text: string
  stream?: boolean
}

// AI对话请求参数 - 匹配后端API
export interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
  }>
  context?: string
  stream?: boolean
}

// AI评估请求参数
export interface EvaluationRequest {
  fileId: string
  criteria: string[]
  language?: string
}

// AI评估结果
export interface EvaluationResult {
  id: string
  fileId: string
  overallScore: number
  dimensions: Array<{
    name: string
    score: number
    feedback: string
    suggestions: string[]
  }>
  summary: string
  createdAt: Date
}

/**
 * AI功能API服务类
 */
export class AIAPI {
  /**
   * 生成AI摘要 - 匹配后端 /api/summary
   */
  static async generateSummary(request: SummaryRequest): Promise<any> {
    return apiClient.post('/summary', request)
  }

  /**
   * 生成详细总结 - 匹配后端 /api/detailed-summary
   */
  static async generateDetailedSummary(request: SummaryRequest): Promise<any> {
    return apiClient.post('/detailed-summary', request)
  }

  /**
   * 生成思维导图 - 匹配后端 /api/mindmap
   */
  static async generateMindmap(request: MindmapRequest): Promise<any> {
    return apiClient.post('/mindmap', request)
  }

  /**
   * 生成思维导图图片 - 匹配后端 /api/mindmap-image
   */
  static async generateMindmapImage(request: MindmapRequest): Promise<any> {
    return apiClient.post('/mindmap-image', request)
  }

  /**
   * 获取思维导图生成进度
   */
  static async getMindmapProgress(mindmapId: string): Promise<{
    mindmapId: string
    progress: number
    status: 'processing' | 'completed' | 'error'
    content?: string
    url?: string
    error?: string
  }> {
    return apiClient.get(`/ai/mindmap/progress/${mindmapId}`)
  }

  /**
   * 获取思维导图结果
   */
  static async getMindmap(mindmapId: string): Promise<AIMindmap> {
    return apiClient.get(`/ai/mindmap/${mindmapId}`)
  }

  /**
   * 删除思维导图
   */
  static async deleteMindmap(mindmapId: string): Promise<{ success: boolean }> {
    return apiClient.delete(`/ai/mindmap/${mindmapId}`)
  }

  /**
   * 创建AI对话会话
   */
  static async createChatSession(fileId: string): Promise<{ sessionId: string }> {
    return apiClient.post('/ai/chat/session', { fileId })
  }

  /**
   * AI对话 - 匹配后端 /api/chat
   */
  static async sendChatMessage(request: ChatRequest): Promise<any> {
    return apiClient.post('/chat', request)
  }

  /**
   * 生成教学评估 - 匹配后端 /api/ai/evaluate-teaching
   */
  static async generateTeachingEvaluation(request: SummaryRequest): Promise<any> {
    return apiClient.post('/ai/evaluate-teaching', request)
  }

  /**
   * 获取用户的AI使用统计
   */
  static async getAIUsageStats(): Promise<{
    summariesGenerated: number
    mindmapsCreated: number
    chatMessages: number
    evaluationsCompleted: number
    tokensUsed: number
    monthlyUsage: Array<{
      month: string
      summaries: number
      mindmaps: number
      chats: number
      evaluations: number
    }>
  }> {
    return apiClient.get('/ai/stats')
  }

  /**
   * 获取AI功能配置
   */
  static async getAIConfig(): Promise<{
    models: {
      summary: string[]
      mindmap: string[]
      chat: string[]
      evaluation: string[]
    }
    limits: {
      maxTokens: number
      maxRequestsPerDay: number
      maxConcurrentRequests: number
    }
    features: {
      summaryEnabled: boolean
      mindmapEnabled: boolean
      chatEnabled: boolean
      evaluationEnabled: boolean
    }
  }> {
    return apiClient.get('/ai/config')
  }

  /**
   * 流式聊天接口
   */
  static async streamChatMessage(
    request: ChatRequest,
    onMessage: (chunk: string) => void,
    onComplete: (fullResponse: string) => void,
    onError: (error: string) => void,
  ): Promise<void> {
    try {
      const response = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body reader available')
      }

      const decoder = new TextDecoder()
      let fullResponse = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          onComplete(fullResponse)
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              onComplete(fullResponse)
              return
            }

            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                fullResponse += parsed.content
                onMessage(parsed.content)
              }
            } catch {
              // 忽略解析错误，继续处理下一行
            }
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unknown error occurred')
    }
  }
}

// 导出默认实例
export const aiAPI = AIAPI
