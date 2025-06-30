/**
 * 请求缓存Hook
 * 提供API请求结果的缓存和管理功能
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { formatAPIError } from '../services/api';

// 全局缓存存储
const globalCache = new Map();

/**
 * 生成缓存键
 * @param {string} key - 基础键
 * @param {Object} params - 参数对象
 * @returns {string} 缓存键
 */
const generateCacheKey = (key, params = {}) => {
  const paramString = JSON.stringify(params, Object.keys(params).sort());
  return `${key}:${paramString}`;
};

/**
 * 请求缓存Hook
 * 提供智能的请求缓存和状态管理
 * 
 * @param {string} cacheKey - 缓存键
 * @param {Object} options - Hook配置选项
 * @returns {Object} 缓存状态和方法
 */
export function useRequestCache(cacheKey, options = {}) {
  const {
    ttl = 5 * 60 * 1000, // 默认5分钟过期
    staleWhileRevalidate = true, // 返回过期数据同时重新验证
    maxRetries = 3,
    retryDelay = 1000,
    enableBackground = true, // 启用后台刷新
    backgroundInterval = 30000, // 后台刷新间隔
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);
  const abortControllerRef = useRef(null);
  const backgroundTimerRef = useRef(null);
  const retryCountRef = useRef(0);

  /**
   * 检查缓存是否过期
   * @param {Object} cacheEntry - 缓存条目
   * @returns {boolean} 是否过期
   */
  const isCacheExpired = useCallback((cacheEntry) => {
    if (!cacheEntry) return true;
    return Date.now() - cacheEntry.timestamp > ttl;
  }, [ttl]);

  /**
   * 从缓存获取数据
   * @param {string} key - 缓存键
   * @returns {Object|null} 缓存数据
   */
  const getCachedData = useCallback((key) => {
    const cacheEntry = globalCache.get(key);
    if (!cacheEntry) return null;

    const expired = isCacheExpired(cacheEntry);
    
    if (expired && !staleWhileRevalidate) {
      globalCache.delete(key);
      return null;
    }

    return {
      data: cacheEntry.data,
      isStale: expired,
      timestamp: cacheEntry.timestamp,
    };
  }, [isCacheExpired, staleWhileRevalidate]);

  /**
   * 设置缓存数据
   * @param {string} key - 缓存键
   * @param {any} data - 要缓存的数据
   */
  const setCachedData = useCallback((key, data) => {
    globalCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }, []);

  /**
   * 执行请求并缓存结果
   * @param {Function} requestFunction - 请求函数
   * @param {Object} params - 请求参数
   * @param {Object} requestOptions - 请求选项
   */
  const fetchWithCache = useCallback(async (requestFunction, params = {}, requestOptions = {}) => {
    const {
      forceRefresh = false,
      onSuccess,
      onError,
      ...apiOptions
    } = requestOptions;

    const fullCacheKey = generateCacheKey(cacheKey, params);

    // 检查缓存
    if (!forceRefresh) {
      const cached = getCachedData(fullCacheKey);
      if (cached) {
        setData(cached.data);
        setIsStale(cached.isStale);
        setLastFetched(cached.timestamp);
        setError(null);

        // 如果数据过期但启用了staleWhileRevalidate，后台刷新
        if (cached.isStale && staleWhileRevalidate) {
          // 后台刷新，不显示loading状态
          fetchWithCache(requestFunction, params, { 
            ...requestOptions, 
            forceRefresh: true,
            silent: true 
          });
        }

        return cached.data;
      }
    }

    try {
      if (!requestOptions.silent) {
        setLoading(true);
        setError(null);
      }

      abortControllerRef.current = new AbortController();

      const result = await requestFunction({
        ...apiOptions,
        ...params,
        signal: abortControllerRef.current.signal,
      });

      // 缓存结果
      setCachedData(fullCacheKey, result);
      
      setData(result);
      setIsStale(false);
      setLastFetched(Date.now());
      retryCountRef.current = 0;

      onSuccess?.(result);
      return result;
    } catch (err) {
      const formattedError = formatAPIError(err);
      
      // 重试逻辑
      if (retryCountRef.current < maxRetries && err.name !== 'AbortError') {
        retryCountRef.current++;
        
        setTimeout(() => {
          fetchWithCache(requestFunction, params, requestOptions);
        }, retryDelay * retryCountRef.current);
        
        return;
      }

      setError(formattedError);
      onError?.(formattedError);
      throw err;
    } finally {
      if (!requestOptions.silent) {
        setLoading(false);
      }
      abortControllerRef.current = null;
    }
  }, [cacheKey, getCachedData, setCachedData, staleWhileRevalidate, maxRetries, retryDelay]);

  /**
   * 清除特定缓存
   * @param {Object} params - 参数对象
   */
  const clearCache = useCallback((params = {}) => {
    const fullCacheKey = generateCacheKey(cacheKey, params);
    globalCache.delete(fullCacheKey);
  }, [cacheKey]);

  /**
   * 清除所有相关缓存
   */
  const clearAllCache = useCallback(() => {
    const keysToDelete = [];
    for (const key of globalCache.keys()) {
      if (key.startsWith(cacheKey + ':')) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => globalCache.delete(key));
  }, [cacheKey]);

  /**
   * 预加载数据
   * @param {Function} requestFunction - 请求函数
   * @param {Object} params - 请求参数
   */
  const prefetch = useCallback(async (requestFunction, params = {}) => {
    const fullCacheKey = generateCacheKey(cacheKey, params);
    const cached = getCachedData(fullCacheKey);
    
    if (!cached || isCacheExpired(cached)) {
      try {
        await fetchWithCache(requestFunction, params, { silent: true });
      } catch (error) {
        // 预加载失败不抛出错误
        console.warn('Prefetch failed:', error);
      }
    }
  }, [cacheKey, getCachedData, isCacheExpired, fetchWithCache]);

  /**
   * 取消当前请求
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
    setIsStale(false);
    setLastFetched(null);
    retryCountRef.current = 0;
  }, []);

  // 后台刷新定时器
  useEffect(() => {
    if (enableBackground && data && !isStale) {
      backgroundTimerRef.current = setInterval(() => {
        if (data && lastFetched && Date.now() - lastFetched > backgroundInterval) {
          // 触发后台刷新
          setIsStale(true);
        }
      }, backgroundInterval);

      return () => {
        if (backgroundTimerRef.current) {
          clearInterval(backgroundTimerRef.current);
        }
      };
    }
  }, [enableBackground, data, isStale, lastFetched, backgroundInterval]);

  return {
    // 状态
    loading,
    error,
    data,
    isStale,
    lastFetched,
    
    // 方法
    fetchWithCache,
    clearCache,
    clearAllCache,
    prefetch,
    cancel,
    reset,
    
    // 计算属性
    hasData: data !== null,
    isFresh: data !== null && !isStale,
    cacheAge: lastFetched ? Date.now() - lastFetched : null,
  };
}

/**
 * 清除全局缓存
 */
export const clearGlobalCache = () => {
  globalCache.clear();
};

/**
 * 获取缓存统计信息
 */
export const getCacheStats = () => {
  return {
    size: globalCache.size,
    keys: Array.from(globalCache.keys()),
  };
};

export default useRequestCache;
