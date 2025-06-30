/**
 * 主题管理Hook
 * 提供主题切换和主题状态管理功能
 */

import { useState, useEffect, useCallback } from 'react';
import { createAntdTheme } from '../theme/antdTheme';

// 主题模式常量
export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
};

// 本地存储键名
const THEME_STORAGE_KEY = 'videochat-theme-mode';

/**
 * 获取系统主题偏好
 * @returns {string} 'light' | 'dark'
 */
const getSystemTheme = () => {
  if (typeof window === 'undefined') return THEME_MODES.LIGHT;
  
  return window.matchMedia('(prefers-color-scheme: dark)').matches 
    ? THEME_MODES.DARK 
    : THEME_MODES.LIGHT;
};

/**
 * 从本地存储获取保存的主题模式
 * @returns {string} 保存的主题模式
 */
const getSavedThemeMode = () => {
  if (typeof window === 'undefined') return THEME_MODES.SYSTEM;
  
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved && Object.values(THEME_MODES).includes(saved) 
      ? saved 
      : THEME_MODES.SYSTEM;
  } catch (error) {
    console.warn('Failed to read theme from localStorage:', error);
    return THEME_MODES.SYSTEM;
  }
};

/**
 * 保存主题模式到本地存储
 * @param {string} mode - 主题模式
 */
const saveThemeMode = (mode) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch (error) {
    console.warn('Failed to save theme to localStorage:', error);
  }
};

/**
 * 应用主题到DOM
 * @param {string} theme - 实际主题 'light' | 'dark'
 */
const applyThemeToDOM = (theme) => {
  if (typeof window === 'undefined') return;
  
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  
  // 更新meta标签的theme-color
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute(
      'content', 
      theme === THEME_MODES.DARK ? '#111827' : '#ffffff'
    );
  }
};

/**
 * 主题管理Hook
 * @returns {Object} 主题相关的状态和方法
 */
export const useTheme = () => {
  // 主题模式状态 (用户选择的模式)
  const [themeMode, setThemeMode] = useState(() => getSavedThemeMode());
  
  // 实际主题状态 (解析后的实际主题)
  const [actualTheme, setActualTheme] = useState(() => {
    const mode = getSavedThemeMode();
    return mode === THEME_MODES.SYSTEM ? getSystemTheme() : mode;
  });

  // Ant Design主题配置
  const [antdTheme, setAntdTheme] = useState(() => createAntdTheme(actualTheme));

  /**
   * 解析实际主题
   * @param {string} mode - 主题模式
   * @returns {string} 实际主题
   */
  const resolveActualTheme = useCallback((mode) => {
    return mode === THEME_MODES.SYSTEM ? getSystemTheme() : mode;
  }, []);

  /**
   * 切换主题模式
   * @param {string} mode - 新的主题模式
   */
  const setTheme = useCallback((mode) => {
    if (!Object.values(THEME_MODES).includes(mode)) {
      console.warn(`Invalid theme mode: ${mode}`);
      return;
    }

    setThemeMode(mode);
    saveThemeMode(mode);

    const newActualTheme = resolveActualTheme(mode);
    setActualTheme(newActualTheme);
    setAntdTheme(createAntdTheme(newActualTheme));
    applyThemeToDOM(newActualTheme);
  }, [resolveActualTheme]);

  /**
   * 切换到下一个主题
   */
  const toggleTheme = useCallback(() => {
    const modes = Object.values(THEME_MODES);
    const currentIndex = modes.indexOf(themeMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setTheme(modes[nextIndex]);
  }, [themeMode, setTheme]);

  /**
   * 切换亮色/暗色主题 (忽略系统主题)
   */
  const toggleLightDark = useCallback(() => {
    const newMode = actualTheme === THEME_MODES.LIGHT 
      ? THEME_MODES.DARK 
      : THEME_MODES.LIGHT;
    setTheme(newMode);
  }, [actualTheme, setTheme]);

  // 监听系统主题变化
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e) => {
      if (themeMode === THEME_MODES.SYSTEM) {
        const newActualTheme = e.matches ? THEME_MODES.DARK : THEME_MODES.LIGHT;
        setActualTheme(newActualTheme);
        setAntdTheme(createAntdTheme(newActualTheme));
        applyThemeToDOM(newActualTheme);
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [themeMode]);

  // 初始化时应用主题到DOM
  useEffect(() => {
    applyThemeToDOM(actualTheme);
  }, []);

  /**
   * 获取主题显示名称
   * @param {string} mode - 主题模式
   * @returns {string} 显示名称
   */
  const getThemeDisplayName = useCallback((mode) => {
    const names = {
      [THEME_MODES.LIGHT]: '亮色主题',
      [THEME_MODES.DARK]: '暗色主题',
      [THEME_MODES.SYSTEM]: '跟随系统'
    };
    return names[mode] || mode;
  }, []);

  /**
   * 获取主题图标
   * @param {string} mode - 主题模式
   * @returns {string} 图标名称
   */
  const getThemeIcon = useCallback((mode) => {
    const icons = {
      [THEME_MODES.LIGHT]: 'SunOutlined',
      [THEME_MODES.DARK]: 'MoonOutlined',
      [THEME_MODES.SYSTEM]: 'DesktopOutlined'
    };
    return icons[mode] || 'SunOutlined';
  }, []);

  /**
   * 检查是否为暗色主题
   * @returns {boolean} 是否为暗色主题
   */
  const isDark = actualTheme === THEME_MODES.DARK;

  /**
   * 检查是否为亮色主题
   * @returns {boolean} 是否为亮色主题
   */
  const isLight = actualTheme === THEME_MODES.LIGHT;

  /**
   * 检查是否跟随系统主题
   * @returns {boolean} 是否跟随系统主题
   */
  const isSystem = themeMode === THEME_MODES.SYSTEM;

  return {
    // 状态
    themeMode,        // 用户选择的主题模式
    actualTheme,      // 实际应用的主题
    antdTheme,        // Ant Design主题配置
    isDark,           // 是否为暗色主题
    isLight,          // 是否为亮色主题
    isSystem,         // 是否跟随系统主题

    // 方法
    setTheme,         // 设置主题模式
    toggleTheme,      // 切换到下一个主题
    toggleLightDark,  // 切换亮色/暗色主题

    // 工具方法
    getThemeDisplayName,  // 获取主题显示名称
    getThemeIcon,         // 获取主题图标

    // 常量
    THEME_MODES
  };
};

export default useTheme;
