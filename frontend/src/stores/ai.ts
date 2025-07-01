/**
 * AI功能状态管理store
 * 管理AI总结、思维导图、对话等功能的状态
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AISummary, AIMindmap, AIChatSession, AIChatMessage } from '@/types'

export const useAIStore = defineStore('ai', () => {
  // 状态定义
  const summaries = ref<Map<string, AISummary>>(new Map())
  const mindmaps = ref<Map<string, AIMindmap>>(new Map())
  const chatSessions = ref<Map<string, AIChatSession>>(new Map())
  const activeChatSession = ref<AIChatSession | null>(null)
  
  // AI功能状态
  const isGeneratingSummary = ref(false)
  const isGeneratingMindmap = ref(false)
  const isChatting = ref(false)
  const aiError = ref<string | null>(null)
  
  // 生成进度
  const summaryProgress = ref(0)
  const mindmapProgress = ref(0)
  
  // AI配置
  const aiConfig = ref({
    summaryType: 'detailed' as 'brief' | 'detailed',
    mindmapFormat: 'json' as 'json' | 'image',
    chatModel: 'gpt-4',
    maxTokens: 2000,
    temperature: 0.7
  })
  
  // 计算属性
  const summaryCount = computed(() => summaries.value.size)
  const mindmapCount = computed(() => mindmaps.value.size)
  const chatSessionCount = computed(() => chatSessions.value.size)
  const hasActiveChatSession = computed(() => activeChatSession.value !== null)
  
  const recentSummaries = computed(() => {
    return Array.from(summaries.value.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
  })
  
  // Actions
  
  /**
   * 开始生成摘要
   */
  const startSummaryGeneration = async (fileId: string, type: 'brief' | 'detailed' = 'detailed') => {
    isGeneratingSummary.value = true
    summaryProgress.value = 0
    aiError.value = null
    
    const summaryId = `summary_${Date.now()}`
    const summary: AISummary = {
      id: summaryId,
      fileId,
      content: '',
      type,
      createdAt: new Date()
    }
    
    summaries.value.set(summaryId, summary)
    return summaryId
  }
  
  /**
   * 更新摘要生成进度
   */
  const updateSummaryProgress = (progress: number) => {
    summaryProgress.value = progress
  }
  
  /**
   * 完成摘要生成
   */
  const completeSummaryGeneration = (summaryId: string, content: string) => {
    const summary = summaries.value.get(summaryId)
    if (summary) {
      summary.content = content
      summaries.value.set(summaryId, { ...summary })
    }
    
    isGeneratingSummary.value = false
    summaryProgress.value = 100
  }
  
  /**
   * 摘要生成失败
   */
  const failSummaryGeneration = (summaryId: string, error: string) => {
    summaries.value.delete(summaryId)
    isGeneratingSummary.value = false
    aiError.value = error
  }
  
  /**
   * 开始生成思维导图
   */
  const startMindmapGeneration = async (fileId: string, format: 'json' | 'image' = 'json') => {
    isGeneratingMindmap.value = true
    mindmapProgress.value = 0
    aiError.value = null
    
    const mindmapId = `mindmap_${Date.now()}`
    const mindmap: AIMindmap = {
      id: mindmapId,
      fileId,
      content: '',
      format,
      createdAt: new Date()
    }
    
    mindmaps.value.set(mindmapId, mindmap)
    return mindmapId
  }
  
  /**
   * 更新思维导图生成进度
   */
  const updateMindmapProgress = (progress: number) => {
    mindmapProgress.value = progress
  }
  
  /**
   * 完成思维导图生成
   */
  const completeMindmapGeneration = (mindmapId: string, content: string, url?: string) => {
    const mindmap = mindmaps.value.get(mindmapId)
    if (mindmap) {
      mindmap.content = content
      if (url) mindmap.url = url
      mindmaps.value.set(mindmapId, { ...mindmap })
    }
    
    isGeneratingMindmap.value = false
    mindmapProgress.value = 100
  }
  
  /**
   * 思维导图生成失败
   */
  const failMindmapGeneration = (mindmapId: string, error: string) => {
    mindmaps.value.delete(mindmapId)
    isGeneratingMindmap.value = false
    aiError.value = error
  }
  
  /**
   * 创建聊天会话
   */
  const createChatSession = (fileId: string): string => {
    const sessionId = `chat_${Date.now()}`
    const session: AIChatSession = {
      id: sessionId,
      fileId,
      messages: [],
      createdAt: new Date()
    }
    
    chatSessions.value.set(sessionId, session)
    activeChatSession.value = session
    return sessionId
  }
  
  /**
   * 设置活跃聊天会话
   */
  const setActiveChatSession = (sessionId: string | null) => {
    if (sessionId) {
      const session = chatSessions.value.get(sessionId)
      activeChatSession.value = session || null
    } else {
      activeChatSession.value = null
    }
  }
  
  /**
   * 发送聊天消息
   */
  const sendChatMessage = (sessionId: string, content: string) => {
    const session = chatSessions.value.get(sessionId)
    if (!session) return
    
    const message: AIChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date()
    }
    
    session.messages.push(message)
    chatSessions.value.set(sessionId, { ...session })
    
    // 更新活跃会话
    if (activeChatSession.value?.id === sessionId) {
      activeChatSession.value = { ...session }
    }
    
    isChatting.value = true
    return message.id
  }
  
  /**
   * 接收AI回复
   */
  const receiveAIResponse = (sessionId: string, content: string) => {
    const session = chatSessions.value.get(sessionId)
    if (!session) return
    
    const message: AIChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content,
      timestamp: new Date()
    }
    
    session.messages.push(message)
    chatSessions.value.set(sessionId, { ...session })
    
    // 更新活跃会话
    if (activeChatSession.value?.id === sessionId) {
      activeChatSession.value = { ...session }
    }
    
    isChatting.value = false
  }
  
  /**
   * 聊天失败
   */
  const failChatMessage = (error: string) => {
    isChatting.value = false
    aiError.value = error
  }
  
  /**
   * 删除摘要
   */
  const deleteSummary = (summaryId: string) => {
    summaries.value.delete(summaryId)
  }
  
  /**
   * 删除思维导图
   */
  const deleteMindmap = (mindmapId: string) => {
    mindmaps.value.delete(mindmapId)
  }
  
  /**
   * 删除聊天会话
   */
  const deleteChatSession = (sessionId: string) => {
    chatSessions.value.delete(sessionId)
    
    // 如果删除的是当前活跃会话，清除活跃状态
    if (activeChatSession.value?.id === sessionId) {
      activeChatSession.value = null
    }
  }
  
  /**
   * 更新AI配置
   */
  const updateAIConfig = (config: Partial<typeof aiConfig.value>) => {
    aiConfig.value = { ...aiConfig.value, ...config }
    
    // 保存配置到localStorage
    localStorage.setItem('videochat-ai-config', JSON.stringify(aiConfig.value))
  }
  
  /**
   * 清除AI错误
   */
  const clearAIError = () => {
    aiError.value = null
  }
  
  /**
   * 重置AI状态
   */
  const resetAIState = () => {
    isGeneratingSummary.value = false
    isGeneratingMindmap.value = false
    isChatting.value = false
    aiError.value = null
    summaryProgress.value = 0
    mindmapProgress.value = 0
    activeChatSession.value = null
  }
  
  /**
   * 初始化AI配置
   */
  const initializeAIConfig = () => {
    const savedConfig = localStorage.getItem('videochat-ai-config')
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig)
        aiConfig.value = { ...aiConfig.value, ...parsed }
      } catch (error) {
        console.warn('Failed to parse saved AI config:', error)
      }
    }
  }
  
  return {
    // 状态
    summaries,
    mindmaps,
    chatSessions,
    activeChatSession,
    isGeneratingSummary,
    isGeneratingMindmap,
    isChatting,
    aiError,
    summaryProgress,
    mindmapProgress,
    aiConfig,
    
    // 计算属性
    summaryCount,
    mindmapCount,
    chatSessionCount,
    hasActiveChatSession,
    recentSummaries,
    
    // Actions
    startSummaryGeneration,
    updateSummaryProgress,
    completeSummaryGeneration,
    failSummaryGeneration,
    startMindmapGeneration,
    updateMindmapProgress,
    completeMindmapGeneration,
    failMindmapGeneration,
    createChatSession,
    setActiveChatSession,
    sendChatMessage,
    receiveAIResponse,
    failChatMessage,
    deleteSummary,
    deleteMindmap,
    deleteChatSession,
    updateAIConfig,
    clearAIError,
    resetAIState,
    initializeAIConfig
  }
})

// 类型导出
export type AIStore = ReturnType<typeof useAIStore>