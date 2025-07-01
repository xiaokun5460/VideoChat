/**
 * 应用主状态store
 * 管理全局应用状态、用户设置、系统配置等
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserPreferences, ThemeConfig } from '@/types'

export const useAppStore = defineStore('app', () => {
  // 状态定义
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isOnline = ref(navigator.onLine)
  
  // 用户偏好设置
  const userPreferences = ref<UserPreferences>({
    theme: {
      mode: 'light',
      primaryColor: '#1e3a8a',
      accentColor: '#10b981'
    },
    language: 'zh-CN',
    autoSave: true,
    notifications: true
  })
  
  // 系统信息
  const systemInfo = ref({
    version: '1.0.0',
    buildTime: new Date().toISOString(),
    environment: import.meta.env.MODE
  })
  
  // 计算属性
  const isDarkMode = computed(() => userPreferences.value.theme.mode === 'dark')
  const currentLanguage = computed(() => userPreferences.value.language)
  
  // Actions
  
  /**
   * 设置加载状态
   */
  const setLoading = (state: boolean) => {
    loading.value = state
  }
  
  /**
   * 设置错误信息
   */
  const setError = (message: string | null) => {
    error.value = message
  }
  
  /**
   * 清除错误信息
   */
  const clearError = () => {
    error.value = null
  }
  
  /**
   * 更新用户偏好设置
   */
  const updateUserPreferences = (preferences: Partial<UserPreferences>) => {
    userPreferences.value = { ...userPreferences.value, ...preferences }
    // 保存到localStorage
    localStorage.setItem('videochat-preferences', JSON.stringify(userPreferences.value))
  }
  
  /**
   * 更新主题配置
   */
  const updateThemeConfig = (themeConfig: Partial<ThemeConfig>) => {
    userPreferences.value.theme = { ...userPreferences.value.theme, ...themeConfig }
    localStorage.setItem('videochat-preferences', JSON.stringify(userPreferences.value))
  }
  
  /**
   * 切换主题模式
   */
  const toggleThemeMode = () => {
    const newMode = userPreferences.value.theme.mode === 'light' ? 'dark' : 'light'
    updateThemeConfig({ mode: newMode })
  }
  
  /**
   * 设置语言
   */
  const setLanguage = (language: string) => {
    updateUserPreferences({ language })
  }
  
  /**
   * 初始化应用状态
   */
  const initializeApp = () => {
    // 从localStorage恢复用户偏好
    const savedPreferences = localStorage.getItem('videochat-preferences')
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences)
        userPreferences.value = { ...userPreferences.value, ...parsed }
      } catch (error) {
        console.warn('Failed to parse saved preferences:', error)
      }
    }
    
    // 监听网络状态变化
    window.addEventListener('online', () => {
      isOnline.value = true
    })
    
    window.addEventListener('offline', () => {
      isOnline.value = false
    })
  }
  
  /**
   * 显示全局通知
   */
  const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    // 这里可以集成Naive UI的通知组件
    console.log(`[${type.toUpperCase()}] ${message}`)
    
    // TODO: 集成Naive UI的useNotification
    // const notification = useNotification()
    // notification[type]({ content: message })
  }
  
  /**
   * 重置应用状态
   */
  const resetAppState = () => {
    loading.value = false
    error.value = null
    // 不重置用户偏好，保持用户设置
  }
  
  return {
    // 状态
    loading,
    error,
    isOnline,
    userPreferences,
    systemInfo,
    
    // 计算属性
    isDarkMode,
    currentLanguage,
    
    // Actions
    setLoading,
    setError,
    clearError,
    updateUserPreferences,
    updateThemeConfig,
    toggleThemeMode,
    setLanguage,
    initializeApp,
    showNotification,
    resetAppState
  }
})

// 类型导出
export type AppStore = ReturnType<typeof useAppStore>