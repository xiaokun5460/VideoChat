/**
 * AI功能组合式函数
 * 提供AI总结、思维导图、对话等功能的统一接口
 */

import { ref, computed } from 'vue'
import { useMessage } from 'naive-ui'
import { useStreamingResponse } from './useStreamingResponse'
import { AIAPI } from '@/services/ai'
import type { AIChatMessage } from '@/types'

export const useAI = () => {
  const message = useMessage()
  const {
    isStreaming,
    streamContent,
    streamError,
    hasContent,
    hasError,
    canAbort,
    startStreaming,
    abortStreaming,
    resetStream,
  } = useStreamingResponse()

  // AI功能状态
  const summaryContent = ref('')
  const mindmapContent = ref('')
  const evaluationContent = ref('')
  const chatMessages = ref<AIChatMessage[]>([])
  const currentContext = ref('')

  // 计算属性
  const hasSummary = computed(() => summaryContent.value.length > 0)
  const hasMindmap = computed(() => mindmapContent.value.length > 0)
  const hasEvaluation = computed(() => evaluationContent.value.length > 0)
  const hasChatHistory = computed(() => chatMessages.value.length > 0)

  /**
   * 生成AI总结
   */
  const generateSummary = async (text: string) => {
    try {
      resetStream()
      summaryContent.value = ''

      await startStreaming(
        '/api/summary',
        { text, stream: true },
        {
          onStart: () => {
            message.info('开始生成总结...')
          },
          onChunk: (chunk) => {
            summaryContent.value += chunk
          },
          onComplete: (fullContent) => {
            summaryContent.value = fullContent
            message.success('总结生成完成')
          },
          onError: (error) => {
            message.error(`总结生成失败: ${error}`)
          },
        },
      )
    } catch (error) {
      message.error('总结生成失败')
      console.error('Summary generation error:', error)
    }
  }

  /**
   * 生成详细总结
   */
  const generateDetailedSummary = async (text: string) => {
    try {
      resetStream()
      summaryContent.value = ''

      await startStreaming(
        '/api/detailed-summary',
        { text, stream: true },
        {
          onStart: () => {
            message.info('开始生成详细总结...')
          },
          onChunk: (chunk) => {
            summaryContent.value += chunk
          },
          onComplete: (fullContent) => {
            summaryContent.value = fullContent
            message.success('详细总结生成完成')
          },
          onError: (error) => {
            message.error(`详细总结生成失败: ${error}`)
          },
        },
      )
    } catch (error) {
      message.error('详细总结生成失败')
      console.error('Detailed summary generation error:', error)
    }
  }

  /**
   * 生成思维导图
   */
  const generateMindmap = async (text: string) => {
    try {
      resetStream()
      mindmapContent.value = ''

      await startStreaming(
        '/api/mindmap',
        { text, stream: true },
        {
          onStart: () => {
            message.info('开始生成思维导图...')
          },
          onChunk: (chunk) => {
            mindmapContent.value += chunk
          },
          onComplete: (fullContent) => {
            mindmapContent.value = fullContent
            message.success('思维导图生成完成')
          },
          onError: (error) => {
            message.error(`思维导图生成失败: ${error}`)
          },
        },
      )
    } catch (error) {
      message.error('思维导图生成失败')
      console.error('Mindmap generation error:', error)
    }
  }

  /**
   * 生成思维导图图片
   */
  const generateMindmapImage = async (text: string) => {
    try {
      message.loading('正在生成思维导图图片...')
      const result = await AIAPI.generateMindmapImage({ text })

      if (result.image_path) {
        message.success('思维导图图片生成完成')
        return result.image_path
      } else {
        throw new Error('未获取到图片路径')
      }
    } catch (error) {
      message.error('思维导图图片生成失败')
      console.error('Mindmap image generation error:', error)
      return null
    }
  }

  /**
   * 生成教学评估
   */
  const generateTeachingEvaluation = async (text: string) => {
    try {
      resetStream()
      evaluationContent.value = ''

      await startStreaming(
        '/api/ai/evaluate-teaching',
        { text, stream: true },
        {
          onStart: () => {
            message.info('开始生成教学评估...')
          },
          onChunk: (chunk) => {
            evaluationContent.value += chunk
          },
          onComplete: (fullContent) => {
            evaluationContent.value = fullContent
            message.success('教学评估生成完成')
          },
          onError: (error) => {
            message.error(`教学评估生成失败: ${error}`)
          },
        },
      )
    } catch (error) {
      message.error('教学评估生成失败')
      console.error('Teaching evaluation error:', error)
    }
  }

  /**
   * AI对话
   */
  const sendChatMessage = async (userMessage: string, context?: string) => {
    try {
      // 添加用户消息
      const userMsg: AIChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      }
      chatMessages.value.push(userMsg)

      // 准备消息历史
      const messages = chatMessages.value.map((msg: AIChatMessage) => ({
        role: msg.role,
        content: msg.content,
      }))

      // 创建助手消息占位符
      const assistantMsg: AIChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }
      chatMessages.value.push(assistantMsg)

      resetStream()

      await startStreaming(
        '/api/chat',
        {
          messages,
          context: context || currentContext.value,
          stream: true,
        },
        {
          onStart: () => {
            message.info('AI正在思考...')
          },
          onChunk: (chunk) => {
            assistantMsg.content += chunk
          },
          onComplete: (fullContent) => {
            assistantMsg.content = fullContent
            message.success('回复完成')
          },
          onError: (error) => {
            // 移除失败的助手消息
            chatMessages.value.pop()
            message.error(`对话失败: ${error}`)
          },
        },
      )
    } catch (error) {
      message.error('发送消息失败')
      console.error('Chat error:', error)
    }
  }

  /**
   * 清空对话历史
   */
  const clearChatHistory = () => {
    chatMessages.value = []
    message.info('对话历史已清空')
  }

  /**
   * 设置对话上下文
   */
  const setChatContext = (context: string) => {
    currentContext.value = context
  }

  /**
   * 重置所有AI内容
   */
  const resetAllContent = () => {
    summaryContent.value = ''
    mindmapContent.value = ''
    evaluationContent.value = ''
    chatMessages.value = []
    currentContext.value = ''
    resetStream()
  }

  return {
    // 状态
    isStreaming,
    streamContent,
    streamError,
    hasContent,
    hasError,
    canAbort,

    // AI内容
    summaryContent,
    mindmapContent,
    evaluationContent,
    chatMessages,
    currentContext,

    // 计算属性
    hasSummary,
    hasMindmap,
    hasEvaluation,
    hasChatHistory,

    // 方法
    generateSummary,
    generateDetailedSummary,
    generateMindmap,
    generateMindmapImage,
    generateTeachingEvaluation,
    sendChatMessage,
    clearChatHistory,
    setChatContext,
    resetAllContent,
    abortStreaming,
    resetStream,
  }
}

export type AIComposable = ReturnType<typeof useAI>
