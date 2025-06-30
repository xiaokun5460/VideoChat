/**
 * 通用异步操作Hook
 * 提供通用的异步操作状态管理，可用于任何异步函数
 */

import { useState, useCallback, useRef } from 'react';
import { formatAPIError } from '../services/api';

/**
 * 通用异步操作Hook
 * 适用于任何异步操作的状态管理
 * 
 * @param {Object} options - Hook配置选项
 * @returns {Object} 异步操作状态和方法
 */
export function useAsyncOperation(options = {}) {
  const {
    initialData = null,
    resetDataOnStart = true,
    autoReset = false,
    autoResetDelay = 3000,
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(initialData);
  const [lastExecutedAt, setLastExecutedAt] = useState(null);
  const abortControllerRef = useRef(null);
  const timeoutRef = useRef(null);

  /**
   * 执行异步操作
   * @param {Function} asyncFunction - 异步函数
   * @param {Object} options - 执行选项
   */
  const execute = useCallback(async (asyncFunction, executeOptions = {}) => {
    const {
      onStart,
      onSuccess,
      onError,
      onFinally,
      signal,
      ...functionArgs
    } = executeOptions;

    try {
      setLoading(true);
      setError(null);
      setLastExecutedAt(Date.now());
      
      if (resetDataOnStart) {
        setData(initialData);
      }

      // 清除之前的自动重置定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // 创建取消控制器
      abortControllerRef.current = new AbortController();
      const combinedSignal = signal 
        ? AbortSignal.any([signal, abortControllerRef.current.signal])
        : abortControllerRef.current.signal;

      onStart?.();

      // 执行异步函数
      const result = await asyncFunction({
        ...functionArgs,
        signal: combinedSignal,
      });

      setData(result);
      onSuccess?.(result);

      // 设置自动重置
      if (autoReset) {
        timeoutRef.current = setTimeout(() => {
          reset();
        }, autoResetDelay);
      }

      return result;
    } catch (err) {
      const formattedError = formatAPIError(err);
      setError(formattedError);
      onError?.(formattedError);
      throw err;
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
      onFinally?.();
    }
  }, [initialData, resetDataOnStart, autoReset, autoResetDelay]);

  /**
   * 取消当前操作
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setLoading(false);
    setLastExecutedAt(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [initialData]);

  /**
   * 设置数据（手动模式）
   */
  const setResult = useCallback((newData) => {
    setData(newData);
    setError(null);
  }, []);

  /**
   * 设置错误（手动模式）
   */
  const setErrorState = useCallback((newError) => {
    setError(formatAPIError(newError));
    setData(initialData);
  }, [initialData]);

  return {
    // 状态
    loading,
    error,
    data,
    lastExecutedAt,
    
    // 方法
    execute,
    cancel,
    reset,
    setResult,
    setErrorState,
    
    // 计算属性
    isSuccess: !loading && !error && data !== null,
    isError: !loading && error !== null,
    isIdle: !loading && error === null && data === initialData,
    hasData: data !== null && data !== initialData,
    
    // 时间相关
    timeSinceLastExecution: lastExecutedAt ? Date.now() - lastExecutedAt : null,
  };
}

export default useAsyncOperation;
