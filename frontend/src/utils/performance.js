/**
 * 性能优化工具函数
 * 提供各种性能优化相关的工具和Hook
 */

import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';

/**
 * 防抖Hook
 * @param {Function} callback - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @param {Array} deps - 依赖数组
 * @returns {Function} 防抖后的函数
 */
export const useDebounce = (callback, delay, deps = []) => {
  const timeoutRef = useRef(null);

  return useCallback(
    (...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay, ...deps]
  );
};

/**
 * 节流Hook
 * @param {Function} callback - 要节流的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @param {Array} deps - 依赖数组
 * @returns {Function} 节流后的函数
 */
export const useThrottle = (callback, delay, deps = []) => {
  const lastCallRef = useRef(0);

  return useCallback(
    (...args) => {
      const now = Date.now();
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        callback(...args);
      }
    },
    [callback, delay, ...deps]
  );
};

/**
 * 深度比较的useMemo
 * @param {Function} factory - 计算函数
 * @param {Array} deps - 依赖数组
 * @returns {any} 缓存的值
 */
export const useDeepMemo = (factory, deps) => {
  const ref = useRef();

  if (!ref.current || !deepEqual(ref.current.deps, deps)) {
    ref.current = {
      deps,
      value: factory(),
    };
  }

  return ref.current.value;
};

/**
 * 深度比较函数
 * @param {any} a - 第一个值
 * @param {any} b - 第二个值
 * @returns {boolean} 是否相等
 */
const deepEqual = (a, b) => {
  if (a === b) return true;

  if (a == null || b == null) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    return keysA.every((key) => deepEqual(a[key], b[key]));
  }

  return false;
};

/**
 * 虚拟滚动Hook
 * @param {Array} items - 数据数组
 * @param {number} itemHeight - 每项高度
 * @param {number} containerHeight - 容器高度
 * @returns {Object} 虚拟滚动相关数据
 */
export const useVirtualScroll = (items, itemHeight, containerHeight) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleCount + 1, items.length);

  const visibleItems = useMemo(
    () =>
      items.slice(startIndex, endIndex).map((item, index) => ({
        ...item,
        index: startIndex + index,
      })),
    [items, startIndex, endIndex]
  );

  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll: (e) => setScrollTop(e.target.scrollTop),
  };
};

/**
 * 图片懒加载Hook
 * @param {string} src - 图片源
 * @param {Object} options - 配置选项
 * @returns {Object} 懒加载状态
 */
export const useLazyImage = (src, options = {}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: options.threshold || 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [options.threshold]);

  useEffect(() => {
    if (inView && src) {
      const img = new Image();
      img.onload = () => setLoaded(true);
      img.onerror = () => setError(true);
      img.src = src;
    }
  }, [inView, src]);

  return {
    ref: imgRef,
    loaded,
    error,
    src: inView ? src : undefined,
  };
};

/**
 * 组件渲染性能监控Hook
 * @param {string} componentName - 组件名称
 * @param {Array} deps - 监控的依赖
 */
export const useRenderPerformance = (componentName, deps = []) => {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(performance.now());

  useEffect(() => {
    renderCountRef.current += 1;
    const now = performance.now();
    const renderTime = now - lastRenderTimeRef.current;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${componentName} rendered ${renderCountRef.current} times, last render took ${renderTime.toFixed(2)}ms`);
    }

    lastRenderTimeRef.current = now;
  });

  return {
    renderCount: renderCountRef.current,
    lastRenderTime: lastRenderTimeRef.current,
  };
};

/**
 * 内存使用监控Hook
 */
export const useMemoryMonitor = () => {
  const [memoryInfo, setMemoryInfo] = useState(null);

  useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        setMemoryInfo({
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        });
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 5000);

    return () => clearInterval(interval);
  }, []);

  return memoryInfo;
};

/**
 * 批量状态更新Hook
 * 将多个状态更新合并为一次渲染
 */
export const useBatchedUpdates = () => {
  const [, forceUpdate] = useState({});
  const updatesRef = useRef([]);
  const timeoutRef = useRef(null);

  const batchUpdate = useCallback((updateFn) => {
    updatesRef.current.push(updateFn);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const updates = updatesRef.current;
      updatesRef.current = [];

      updates.forEach((update) => update());
      forceUpdate({});
    }, 0);
  }, []);

  return batchUpdate;
};

/**
 * 组件缓存工具
 * 创建带有自定义比较函数的React.memo
 */
export const createMemoComponent = (Component, compareProps) => {
  return React.memo(Component, compareProps);
};

/**
 * 性能分析工具
 */
export const performanceProfiler = {
  /**
   * 开始性能分析
   * @param {string} name - 分析名称
   */
  start: (name) => {
    if (process.env.NODE_ENV === 'development') {
      performance.mark(`${name}-start`);
    }
  },

  /**
   * 结束性能分析
   * @param {string} name - 分析名称
   */
  end: (name) => {
    if (process.env.NODE_ENV === 'development') {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);

      const measure = performance.getEntriesByName(name)[0];
      console.log(`[Performance] ${name}: ${measure.duration.toFixed(2)}ms`);
    }
  },

  /**
   * 清理性能标记
   */
  clear: () => {
    if (process.env.NODE_ENV === 'development') {
      performance.clearMarks();
      performance.clearMeasures();
    }
  },
};

export default {
  useDebounce,
  useThrottle,
  useDeepMemo,
  useVirtualScroll,
  useLazyImage,
  useRenderPerformance,
  useMemoryMonitor,
  useBatchedUpdates,
  createMemoComponent,
  performanceProfiler,
};
