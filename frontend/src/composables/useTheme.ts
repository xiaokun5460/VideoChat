/**
 * 主题管理组合式函数
 * 实现"深空极光"设计系统的主题切换功能
 */

import { ref, computed, watch, readonly } from 'vue'
import { darkTheme } from 'naive-ui'
import type { GlobalThemeOverrides } from 'naive-ui'

// 主题模式类型
type ThemeMode = 'light' | 'dark'

// 主题状态
const isDark = ref<boolean>(false)
const isSystemTheme = ref<boolean>(true)

/**
 * 深空极光设计系统 - 明亮主题配置
 */
const lightThemeOverrides: GlobalThemeOverrides = {
  common: {
    // 主色调 - 深空极光系列
    primaryColor: '#1e3a8a', // 星云蓝
    primaryColorHover: '#10b981', // 极光绿
    primaryColorPressed: '#0a0e27', // 深空蓝
    primaryColorSuppl: '#8b5cf6', // 量子紫

    // 背景色系
    bodyColor: '#ffffff',
    cardColor: 'rgba(255, 255, 255, 0.98)',
    modalColor: '#ffffff',
    popoverColor: '#ffffff',
    tableColor: '#ffffff',

    // 文字色系
    textColorBase: '#0a0e27',
    textColor1: '#1e293b',
    textColor2: '#475569',
    textColor3: '#64748b',
    textColorDisabled: '#cbd5e1',

    // 边框色系
    borderColor: 'rgba(30, 58, 138, 0.15)',
    dividerColor: 'rgba(30, 58, 138, 0.1)',

    // 阴影系统 - 新拟态效果
    boxShadow1: '4px 4px 8px rgba(0,0,0,0.1), -4px -4px 8px rgba(255,255,255,0.7)',
    boxShadow2: '8px 8px 16px rgba(0,0,0,0.1), -8px -8px 16px rgba(255,255,255,0.7)',
    boxShadow3: '12px 12px 24px rgba(0,0,0,0.15), -12px -12px 24px rgba(255,255,255,0.8)',

    // 圆角系统
    borderRadius: '12px',
    borderRadiusSmall: '8px',

    // 成功、警告、错误色彩
    successColor: '#22c55e',
    warningColor: '#f59e0b',
    errorColor: '#ef4444',
    infoColor: '#06b6d4',
  },
  Button: {
    textColor: '#1e3a8a',
    textColorHover: '#10b981',
    textColorPressed: '#0a0e27',
    textColorGhost: '#1e3a8a',
    textColorGhostHover: '#10b981',
    textColorGhostPressed: '#0a0e27',
    color: 'rgba(30, 58, 138, 0.08)',
    colorHover: 'rgba(16, 185, 129, 0.12)',
    colorPressed: 'rgba(10, 14, 39, 0.16)',
    colorFocus: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(30, 58, 138, 0.2)',
    borderHover: '1px solid rgba(16, 185, 129, 0.3)',
    borderPressed: '1px solid rgba(10, 14, 39, 0.4)',
    borderFocus: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '12px',
  },
  Card: {
    color: 'rgba(255, 255, 255, 0.95)',
    colorModal: '#ffffff',
    colorPopover: '#ffffff',
    colorTarget: 'rgba(255, 255, 255, 0.98)',
    colorEmbedded: 'rgba(248, 250, 252, 0.8)',
    textColor: '#1e293b',
    titleTextColor: '#0a0e27',
    borderColor: 'rgba(30, 58, 138, 0.15)',
    actionColor: 'rgba(30, 58, 138, 0.05)',
    borderRadius: '16px',
    paddingMedium: '20px 24px',
    paddingLarge: '24px 32px',
    paddingHuge: '32px 40px',
  },
  Input: {
    color: 'rgba(255, 255, 255, 0.9)',
    colorFocus: 'rgba(255, 255, 255, 0.95)',
    textColor: '#1e293b',
    textColorDisabled: '#cbd5e1',
    placeholderColor: '#94a3b8',
    border: '1px solid rgba(30, 58, 138, 0.2)',
    borderHover: '1px solid rgba(16, 185, 129, 0.3)',
    borderFocus: '1px solid rgba(16, 185, 129, 0.4)',
    borderRadius: '12px',
    boxShadowFocus: '0 0 0 3px rgba(16, 185, 129, 0.1)',
  },
}

/**
 * 深空极光设计系统 - 暗黑主题配置
 */
const darkThemeOverrides: GlobalThemeOverrides = {
  common: {
    // 主色调 - 深空极光系列
    primaryColor: '#10b981', // 极光绿
    primaryColorHover: '#8b5cf6', // 量子紫
    primaryColorPressed: '#06b6d4', // 电子青
    primaryColorSuppl: '#ec4899', // 等离子粉

    // 背景色系
    bodyColor: '#0a0e27',
    cardColor: 'rgba(17, 24, 39, 0.95)',
    modalColor: '#111827',
    popoverColor: '#1f2937',
    tableColor: '#111827',

    // 文字色系
    textColorBase: '#10b981',
    textColor1: '#f9fafb',
    textColor2: '#e5e7eb',
    textColor3: '#d1d5db',
    textColorDisabled: '#6b7280',

    // 边框色系
    borderColor: 'rgba(16, 185, 129, 0.25)',
    dividerColor: 'rgba(16, 185, 129, 0.15)',

    // 阴影系统 - 霓虹效果
    boxShadow1: '0 0 10px rgba(16,185,129,0.3), inset 4px 4px 8px rgba(0,0,0,0.3)',
    boxShadow2: '0 0 20px rgba(16,185,129,0.3), inset 8px 8px 16px rgba(0,0,0,0.3)',
    boxShadow3: '0 0 30px rgba(16,185,129,0.4), inset 12px 12px 24px rgba(0,0,0,0.4)',

    // 圆角系统
    borderRadius: '12px',
    borderRadiusSmall: '8px',

    // 成功、警告、错误色彩
    successColor: '#22c55e',
    warningColor: '#f59e0b',
    errorColor: '#ef4444',
    infoColor: '#06b6d4',
  },
  Button: {
    textColor: '#10b981',
    textColorHover: '#8b5cf6',
    textColorPressed: '#06b6d4',
    textColorGhost: '#10b981',
    textColorGhostHover: '#8b5cf6',
    textColorGhostPressed: '#06b6d4',
    color: 'rgba(16, 185, 129, 0.1)',
    colorHover: 'rgba(139, 92, 246, 0.15)',
    colorPressed: 'rgba(6, 182, 212, 0.2)',
    colorFocus: 'rgba(139, 92, 246, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderHover: '1px solid rgba(139, 92, 246, 0.4)',
    borderPressed: '1px solid rgba(6, 182, 212, 0.5)',
    borderFocus: '1px solid rgba(139, 92, 246, 0.4)',
    borderRadius: '12px',
  },
  Card: {
    color: 'rgba(17, 24, 39, 0.95)',
    colorModal: '#111827',
    colorPopover: '#1f2937',
    colorTarget: 'rgba(17, 24, 39, 0.98)',
    colorEmbedded: 'rgba(10, 14, 39, 0.8)',
    textColor: '#e5e7eb',
    titleTextColor: '#10b981',
    borderColor: 'rgba(16, 185, 129, 0.25)',
    actionColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: '16px',
    paddingMedium: '20px 24px',
    paddingLarge: '24px 32px',
    paddingHuge: '32px 40px',
  },
  Input: {
    color: 'rgba(17, 24, 39, 0.9)',
    colorFocus: 'rgba(17, 24, 39, 0.95)',
    textColor: '#10b981',
    textColorDisabled: '#6b7280',
    placeholderColor: '#9ca3af',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderHover: '1px solid rgba(139, 92, 246, 0.4)',
    borderFocus: '1px solid rgba(139, 92, 246, 0.5)',
    borderRadius: '12px',
    boxShadowFocus: '0 0 0 3px rgba(139, 92, 246, 0.2)',
  },
}

/**
 * 主题管理组合式函数
 */
export const useTheme = () => {
  /**
   * 初始化主题
   */
  const initTheme = () => {
    const savedTheme = localStorage.getItem('videochat-theme')
    const savedSystemTheme = localStorage.getItem('videochat-system-theme')

    isSystemTheme.value = savedSystemTheme !== 'false'

    if (isSystemTheme.value) {
      // 使用系统主题
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')
      isDark.value = prefersDark.matches

      // 监听系统主题变化
      prefersDark.addEventListener('change', (e) => {
        if (isSystemTheme.value) {
          isDark.value = e.matches
          updateBodyTheme()
        }
      })
    } else {
      // 使用用户设置的主题
      isDark.value = savedTheme === 'dark'
    }

    // 初始化时设置body主题
    updateBodyTheme()
  }

  /**
   * 更新body的主题属性
   */
  const updateBodyTheme = () => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
    }
  }

  /**
   * 切换主题模式
   */
  const toggleTheme = () => {
    isDark.value = !isDark.value
    isSystemTheme.value = false
    localStorage.setItem('videochat-system-theme', 'false')
    updateBodyTheme()
  }

  /**
   * 设置主题模式
   */
  const setTheme = (mode: ThemeMode) => {
    isDark.value = mode === 'dark'
    isSystemTheme.value = false
    localStorage.setItem('videochat-system-theme', 'false')
    updateBodyTheme()
  }

  /**
   * 启用系统主题
   */
  const enableSystemTheme = () => {
    isSystemTheme.value = true
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')
    isDark.value = prefersDark.matches
    localStorage.setItem('videochat-system-theme', 'true')
    updateBodyTheme()
  }

  // 当前主题
  const currentTheme = computed(() => (isDark.value ? darkTheme : null))

  // 当前主题覆盖配置
  const themeOverrides = computed(() => (isDark.value ? darkThemeOverrides : lightThemeOverrides))

  // 主题模式
  const themeMode = computed<ThemeMode>(() => (isDark.value ? 'dark' : 'light'))

  // 监听主题变化，保存到localStorage
  watch(
    () => isDark.value,
    (newValue) => {
      if (!isSystemTheme.value) {
        localStorage.setItem('videochat-theme', newValue ? 'dark' : 'light')
      }
      updateBodyTheme()
    },
  )

  // 初始化主题
  initTheme()

  return {
    isDark: readonly(isDark),
    isSystemTheme: readonly(isSystemTheme),
    currentTheme,
    themeOverrides,
    themeMode,
    toggleTheme,
    setTheme,
    enableSystemTheme,
  }
}
