/**
 * 懒加载组件定义
 * 使用React.lazy实现组件级代码分割
 */

import React, { Suspense } from 'react';
import { Spin } from 'antd';

// 创建通用的加载组件
const LoadingFallback = ({ tip = '加载中...', size = 'large' }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
    padding: '20px'
  }}>
    <Spin size={size} tip={tip} />
  </div>
);

// 懒加载的AI功能组件
export const LazyModernAIFeatures = React.lazy(() => 
  import('./AIFeatures/ModernAIFeatures').then(module => ({
    default: module.default
  }))
);

// 懒加载的文件管理器组件
export const LazyModernFileManager = React.lazy(() => 
  import('./FileManager/ModernFileManager').then(module => ({
    default: module.default
  }))
);

// 懒加载的媒体播放器组件
export const LazyModernMediaPlayer = React.lazy(() => 
  import('./MediaPlayer/ModernMediaPlayer').then(module => ({
    default: module.default
  }))
);

// 懒加载的转录视图组件
export const LazyModernTranscriptionView = React.lazy(() =>
  import('./TranscriptionView/ModernTranscriptionView').then(module => ({
    default: module.default
  }))
);

// 懒加载的下载管理器组件
export const LazyDownloadManager = React.lazy(() =>
  import('./DownloadManager/DownloadManager').then(module => ({
    default: module.default
  }))
);



/**
 * 高阶组件：为懒加载组件添加Suspense包装
 * @param {React.ComponentType} LazyComponent - 懒加载组件
 * @param {Object} fallbackProps - 加载状态组件的属性
 * @returns {React.ComponentType} 包装后的组件
 */
export const withSuspense = (LazyComponent, fallbackProps = {}) => {
  const WrappedComponent = React.forwardRef((props, ref) => (
    <Suspense fallback={<LoadingFallback {...fallbackProps} />}>
      <LazyComponent {...props} ref={ref} />
    </Suspense>
  ));

  WrappedComponent.displayName = `withSuspense(${LazyComponent.displayName || LazyComponent.name || 'Component'})`;
  
  return WrappedComponent;
};

// 预包装的懒加载组件（带Suspense）
export const SuspenseAIFeatures = withSuspense(LazyModernAIFeatures, {
  tip: '加载AI功能模块...',
  size: 'large'
});

export const SuspenseFileManager = withSuspense(LazyModernFileManager, {
  tip: '加载文件管理器...',
  size: 'default'
});

export const SuspenseMediaPlayer = withSuspense(LazyModernMediaPlayer, {
  tip: '加载媒体播放器...',
  size: 'default'
});

export const SuspenseTranscriptionView = withSuspense(LazyModernTranscriptionView, {
  tip: '加载转录视图...',
  size: 'default'
});

export const SuspenseDownloadManager = withSuspense(LazyDownloadManager, {
  tip: '加载下载管理器...',
  size: 'default'
});



/**
 * 预加载函数
 * 在用户可能需要之前预加载组件
 */
export const preloadComponents = {
  aiFeatures: () => import('./AIFeatures/ModernAIFeatures'),
  fileManager: () => import('./FileManager/ModernFileManager'),
  mediaPlayer: () => import('./MediaPlayer/ModernMediaPlayer'),
  transcriptionView: () => import('./TranscriptionView/ModernTranscriptionView'),
  downloadManager: () => import('./DownloadManager/DownloadManager'),
};

/**
 * 批量预加载组件
 * @param {string[]} componentNames - 要预加载的组件名称数组
 */
export const preloadMultipleComponents = (componentNames) => {
  return Promise.all(
    componentNames.map(name => {
      const preloadFn = preloadComponents[name];
      if (preloadFn) {
        return preloadFn().catch(error => {
          console.warn(`Failed to preload component ${name}:`, error);
          return null;
        });
      }
      console.warn(`Unknown component name for preloading: ${name}`);
      return Promise.resolve(null);
    })
  );
};

/**
 * 智能预加载Hook
 * 根据用户行为智能预加载可能需要的组件
 */
export const useSmartPreload = () => {
  React.useEffect(() => {
    // 在空闲时间预加载核心组件
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        preloadMultipleComponents(['fileManager', 'aiFeatures']);
      });
    } else {
      // 降级方案：使用setTimeout
      setTimeout(() => {
        preloadMultipleComponents(['fileManager', 'aiFeatures']);
      }, 2000);
    }
  }, []);
};

const LazyComponentsExport = {
  // 懒加载组件
  LazyModernAIFeatures,
  LazyModernFileManager,
  LazyModernMediaPlayer,
  LazyModernTranscriptionView,
  LazyDownloadManager,

  // 带Suspense的组件
  SuspenseAIFeatures,
  SuspenseFileManager,
  SuspenseMediaPlayer,
  SuspenseTranscriptionView,
  SuspenseDownloadManager,

  // 工具函数
  withSuspense,
  preloadComponents,
  preloadMultipleComponents,
  useSmartPreload,
};

export default LazyComponentsExport;
