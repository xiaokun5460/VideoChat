/**
 * 流式响应处理组合式函数
 * 处理AI功能的流式响应，包括SSE连接、数据流处理、错误处理等
 */

import { ref, computed } from 'vue'
import { useMessage } from 'naive-ui'

export interface StreamingOptions {
  onStart?: () => void
  onChunk?: (chunk: string) => void
  onComplete?: (fullContent: string) => void
  onError?: (error: string) => void
  onAbort?: () => void
}

export const useStreamingResponse = () => {
  const message = useMessage()
  
  // 响应式状态
  const isStreaming = ref(false)
  const streamContent = ref('')
  const streamError = ref<string | null>(null)
  const abortController = ref<AbortController | null>(null)
  
  // 计算属性
  const hasContent = computed(() => streamContent.value.length > 0)
  const hasError = computed(() => streamError.value !== null)
  const canAbort = computed(() => isStreaming.value && abortController.value !== null)
  
  /**
   * 启动流式请求
   */
  const startStreaming = async (
    url: string,
    requestData: any,
    options: StreamingOptions = {}
  ) => {
    try {
      // 重置状态
      isStreaming.value = true
      streamContent.value = ''
      streamError.value = null
      
      // 创建AbortController用于中断请求
      abortController.value = new AbortController()
      
      // 触发开始回调
      options.onStart?.()
      
      // 发起流式请求
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...requestData, stream: true }),
        signal: abortController.value.signal,
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      // 检查是否支持流式响应
      if (!response.body) {
        throw new Error('Response body is not available')
      }
      
      // 创建读取器
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      
      try {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) {
            break
          }
          
          // 解码数据块
          const chunk = decoder.decode(value, { stream: true })
          
          // 处理SSE格式的数据
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()
              
              // 检查是否是结束标记
              if (data === '[DONE]') {
                break
              }
              
              try {
                // 尝试解析JSON数据
                const parsed = JSON.parse(data)
                const content = parsed.content || parsed.delta?.content || data
                
                if (content) {
                  streamContent.value += content
                  options.onChunk?.(content)
                }
              } catch {
                // 如果不是JSON，直接添加文本内容
                if (data && data !== '[DONE]') {
                  streamContent.value += data
                  options.onChunk?.(data)
                }
              }
            }
          }
        }
        
        // 流式响应完成
        options.onComplete?.(streamContent.value)
        
      } finally {
        reader.releaseLock()
      }
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // 用户主动中断
        options.onAbort?.()
      } else {
        // 其他错误
        const errorMessage = error.message || '流式响应处理失败'
        streamError.value = errorMessage
        options.onError?.(errorMessage)
        message.error(errorMessage)
      }
    } finally {
      isStreaming.value = false
      abortController.value = null
    }
  }
  
  /**
   * 中断流式响应
   */
  const abortStreaming = () => {
    if (abortController.value) {
      abortController.value.abort()
      abortController.value = null
      isStreaming.value = false
    }
  }
  
  /**
   * 重置状态
   */
  const resetStream = () => {
    streamContent.value = ''
    streamError.value = null
    isStreaming.value = false
    abortController.value = null
  }
  
  /**
   * 复制内容到剪贴板
   */
  const copyContent = async () => {
    if (!streamContent.value) {
      message.warning('没有内容可复制')
      return
    }
    
    try {
      await navigator.clipboard.writeText(streamContent.value)
      message.success('内容已复制到剪贴板')
    } catch (error) {
      message.error('复制失败')
    }
  }
  
  /**
   * 下载内容为文件
   */
  const downloadContent = (filename: string = 'ai-content.txt') => {
    if (!streamContent.value) {
      message.warning('没有内容可下载')
      return
    }
    
    try {
      const blob = new Blob([streamContent.value], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      message.success('文件下载成功')
    } catch (error) {
      message.error('下载失败')
    }
  }
  
  return {
    // 状态
    isStreaming,
    streamContent,
    streamError,
    
    // 计算属性
    hasContent,
    hasError,
    canAbort,
    
    // 方法
    startStreaming,
    abortStreaming,
    resetStream,
    copyContent,
    downloadContent
  }
}

// 导出类型
export type StreamingResponse = ReturnType<typeof useStreamingResponse>
