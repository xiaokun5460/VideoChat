/**
 * 代码分割配置和工具
 * 提供智能的代码分割策略和路由级懒加载
 */

import React, { Suspense } from 'react';
import { Spin } from 'antd';

/**
 * 创建懒加载组件的高阶函数
 * @param {Function} importFunc - 动态导入函数
 * @param {Object} options - 配置选项
 * @returns {React.ComponentType} 懒加载组件
 */
export const createLazyComponent = (importFunc, options = {}) => {
  const { fallback = <Spin size='large' />, retryCount = 3, retryDelay = 1000, onError = null, preload = false } = options;

  // 创建带重试机制的导入函数
  const importWithRetry = async (retries = retryCount) => {
    try {
      return await importFunc();
    } catch (error) {
      if (retries > 0) {
        console.warn(`Component import failed, retrying... (${retryCount - retries + 1}/${retryCount})`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        return importWithRetry(retries - 1);
      }

      if (onError) {
        onError(error);
      }
      throw error;
    }
  };

  const LazyComponent = React.lazy(importWithRetry);

  // 预加载功能
  if (preload) {
    // 在空闲时间预加载
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        importWithRetry().catch(() => {
          // 预加载失败不影响正常使用
        });
      });
    }
  }

  // 返回包装后的组件
  const WrappedComponent = React.forwardRef((props, ref) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} ref={ref} />
    </Suspense>
  ));

  WrappedComponent.displayName = `Lazy(${LazyComponent.displayName || 'Component'})`;
  WrappedComponent.preload = () => importWithRetry();

  return WrappedComponent;
};

/**
 * 路由级代码分割配置
 */
export const routeComponents = {
  // 主要页面组件
  Home: createLazyComponent(() => import('../pages/Home'), { preload: true }),

  // AI功能页面
  AIFeatures: createLazyComponent(() => import('../components/AIFeatures/ModernAIFeatures'), { preload: true }),

  // 文件管理页面
  FileManager: createLazyComponent(() => import('../components/FileManager/ModernFileManager'), { preload: true }),

  // 设置页面
  Settings: createLazyComponent(() => import('../pages/Settings'), { preload: false }),

  // 关于页面
  About: createLazyComponent(() => import('../pages/About'), { preload: false }),
};

/**
 * 功能模块级代码分割
 */
export const featureComponents = {
  // 媒体播放器
  MediaPlayer: createLazyComponent(() => import('../components/MediaPlayer/ModernMediaPlayer'), { preload: false }),

  // 转录视图
  TranscriptionView: createLazyComponent(() => import('../components/TranscriptionView/ModernTranscriptionView'), { preload: false }),

  // 主题选择器
  ThemeSelector: createLazyComponent(() => import('../components/Theme/ThemeSelector'), { preload: false }),
};

/**
 * 第三方库的动态导入
 */
export const dynamicLibraries = {
  // 图表库
  charts: () => import('recharts'),

  // 日期处理库
  dayjs: () => import('dayjs'),

  // 文件处理库
  fileUtils: () => import('../utils/fileUtils'),

  // 导出功能
  export: () => import('../utils/export'),
};

/**
 * 智能预加载策略
 */
export class SmartPreloader {
  constructor() {
    this.preloadQueue = [];
    this.preloadedComponents = new Set();
    this.isPreloading = false;
  }

  /**
   * 添加组件到预加载队列
   * @param {string} componentName - 组件名称
   * @param {number} priority - 优先级 (1-10, 10最高)
   */
  addToQueue(componentName, priority = 5) {
    if (this.preloadedComponents.has(componentName)) {
      return;
    }

    this.preloadQueue.push({ componentName, priority });
    this.preloadQueue.sort((a, b) => b.priority - a.priority);

    this.processQueue();
  }

  /**
   * 处理预加载队列
   */
  async processQueue() {
    if (this.isPreloading || this.preloadQueue.length === 0) {
      return;
    }

    this.isPreloading = true;

    while (this.preloadQueue.length > 0) {
      const { componentName } = this.preloadQueue.shift();

      try {
        await this.preloadComponent(componentName);
        this.preloadedComponents.add(componentName);
      } catch (error) {
        console.warn(`Failed to preload component ${componentName}:`, error);
      }

      // 在空闲时间继续处理
      await new Promise((resolve) => {
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(resolve);
        } else {
          setTimeout(resolve, 100);
        }
      });
    }

    this.isPreloading = false;
  }

  /**
   * 预加载单个组件
   * @param {string} componentName - 组件名称
   */
  async preloadComponent(componentName) {
    const component = routeComponents[componentName] || featureComponents[componentName];

    if (component && component.preload) {
      await component.preload();
    }
  }

  /**
   * 基于用户行为的智能预加载
   * @param {string} currentRoute - 当前路由
   * @param {Array} userHistory - 用户历史行为
   */
  smartPreload(currentRoute, userHistory = []) {
    // 基于当前路由预测可能需要的组件
    const predictions = this.predictNextComponents(currentRoute, userHistory);

    predictions.forEach(({ component, priority }) => {
      this.addToQueue(component, priority);
    });
  }

  /**
   * 预测下一个可能需要的组件
   * @param {string} currentRoute - 当前路由
   * @param {Array} userHistory - 用户历史
   * @returns {Array} 预测结果
   */
  predictNextComponents(currentRoute, userHistory) {
    const predictions = [];

    // 基于当前路由的预测
    switch (currentRoute) {
      case '/':
        predictions.push({ component: 'FileManager', priority: 9 }, { component: 'AIFeatures', priority: 8 });
        break;
      case '/files':
        predictions.push({ component: 'MediaPlayer', priority: 8 }, { component: 'TranscriptionView', priority: 7 });
        break;
      default:
        break;
    }

    // 基于用户历史的预测
    const frequentComponents = this.analyzeUserHistory(userHistory);
    frequentComponents.forEach((component) => {
      predictions.push({ component, priority: 6 });
    });

    return predictions;
  }

  /**
   * 分析用户历史行为
   * @param {Array} userHistory - 用户历史
   * @returns {Array} 常用组件列表
   */
  analyzeUserHistory(userHistory) {
    const componentUsage = {};

    userHistory.forEach((action) => {
      if (action.component) {
        componentUsage[action.component] = (componentUsage[action.component] || 0) + 1;
      }
    });

    return Object.entries(componentUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([component]) => component);
  }
}

// 创建全局预加载器实例
export const globalPreloader = new SmartPreloader();

/**
 * Bundle分析工具
 */
export const bundleAnalyzer = {
  /**
   * 获取当前加载的chunk信息
   */
  getLoadedChunks: () => {
    if (window.__webpack_require__ && window.__webpack_require__.cache) {
      return Object.keys(window.__webpack_require__.cache);
    }
    return [];
  },

  /**
   * 分析Bundle大小
   */
  analyzeBundleSize: () => {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const chunks = scripts.map((script) => ({
      src: script.src,
      size: script.src.length, // 这只是一个估算
    }));

    console.table(chunks);
    return chunks;
  },

  /**
   * 监控动态导入
   */
  monitorDynamicImports: () => {
    const originalImport = window.__webpack_require__;
    if (originalImport) {
      window.__webpack_require__ = function (...args) {
        console.log('Dynamic import:', args);
        return originalImport.apply(this, args);
      };
    }
  },
};

export default {
  createLazyComponent,
  routeComponents,
  featureComponents,
  dynamicLibraries,
  SmartPreloader,
  globalPreloader,
  bundleAnalyzer,
};
