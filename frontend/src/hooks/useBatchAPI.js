/**
 * 批量API调用Hook
 * 处理多个API调用的并发执行和状态管理
 */

import { useState, useCallback, useRef } from 'react';
import { formatAPIError } from '../services/api';

/**
 * 批量API调用Hook
 * 支持并发和串行执行模式
 * 
 * @returns {Object} 批量API调用状态和方法
 */
export function useBatchAPI() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [errors, setErrors] = useState([]);
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(0);
  const abortControllerRef = useRef(null);

  /**
   * 执行批量API调用（并发模式）
   * @param {Array} apiCalls - API调用函数数组
   * @param {Object} options - 执行选项
   */
  const executeBatch = useCallback(async (apiCalls, options = {}) => {
    const { 
      onProgress, 
      onComplete, 
      onError,
      onItemComplete,
      onItemError,
      maxConcurrency = 3,
      stopOnError = false 
    } = options;

    try {
      setLoading(true);
      setProgress(0);
      setResults([]);
      setErrors([]);
      setCompleted(0);
      setTotal(apiCalls.length);

      abortControllerRef.current = new AbortController();

      const batchResults = new Array(apiCalls.length);
      const batchErrors = [];
      let completedCount = 0;

      // 创建并发执行的Promise
      const executeWithConcurrency = async () => {
        const executing = [];
        
        for (let i = 0; i < apiCalls.length; i++) {
          if (abortControllerRef.current.signal.aborted) {
            break;
          }

          const promise = executeApiCall(apiCalls[i], i);
          executing.push(promise);

          if (executing.length >= maxConcurrency) {
            await Promise.race(executing);
            executing.splice(executing.findIndex(p => p.settled), 1);
          }
        }

        await Promise.allSettled(executing);
      };

      const executeApiCall = async (apiCall, index) => {
        try {
          const result = await apiCall();
          batchResults[index] = result;
          completedCount++;

          const currentProgress = (completedCount / apiCalls.length) * 100;
          setProgress(currentProgress);
          setCompleted(completedCount);
          
          onProgress?.(currentProgress, completedCount, apiCalls.length);
          onItemComplete?.(result, index);

          return { settled: true, result };
        } catch (error) {
          const formattedError = formatAPIError(error);
          const errorInfo = { index, error: formattedError };
          
          batchErrors.push(errorInfo);
          completedCount++;

          const currentProgress = (completedCount / apiCalls.length) * 100;
          setProgress(currentProgress);
          setCompleted(completedCount);
          
          onProgress?.(currentProgress, completedCount, apiCalls.length);
          onItemError?.(formattedError, index);

          if (stopOnError) {
            abortControllerRef.current.abort();
          }

          return { settled: true, error: formattedError };
        }
      };

      await executeWithConcurrency();

      setResults(batchResults);
      setErrors(batchErrors);

      onComplete?.(batchResults, batchErrors);
      return { results: batchResults, errors: batchErrors };
    } catch (error) {
      const formattedError = formatAPIError(error);
      onError?.(formattedError);
      throw error;
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * 执行串行API调用
   * @param {Array} apiCalls - API调用函数数组
   * @param {Object} options - 执行选项
   */
  const executeSequential = useCallback(async (apiCalls, options = {}) => {
    const { 
      onProgress, 
      onComplete, 
      onError,
      onItemComplete,
      onItemError,
      stopOnError = false 
    } = options;

    try {
      setLoading(true);
      setProgress(0);
      setResults([]);
      setErrors([]);
      setCompleted(0);
      setTotal(apiCalls.length);

      abortControllerRef.current = new AbortController();

      const batchResults = [];
      const batchErrors = [];

      for (let i = 0; i < apiCalls.length; i++) {
        if (abortControllerRef.current.signal.aborted) {
          break;
        }

        try {
          const result = await apiCalls[i]();
          batchResults.push(result);

          const currentProgress = ((i + 1) / apiCalls.length) * 100;
          setProgress(currentProgress);
          setCompleted(i + 1);
          
          onProgress?.(currentProgress, i + 1, apiCalls.length);
          onItemComplete?.(result, i);
        } catch (error) {
          const formattedError = formatAPIError(error);
          const errorInfo = { index: i, error: formattedError };
          
          batchErrors.push(errorInfo);
          
          onItemError?.(formattedError, i);

          if (stopOnError) {
            break;
          }
        }
      }

      setResults(batchResults);
      setErrors(batchErrors);

      onComplete?.(batchResults, batchErrors);
      return { results: batchResults, errors: batchErrors };
    } catch (error) {
      const formattedError = formatAPIError(error);
      onError?.(formattedError);
      throw error;
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * 取消批量执行
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
    setProgress(0);
    setResults([]);
    setErrors([]);
    setCompleted(0);
    setTotal(0);
    setLoading(false);
  }, []);

  return {
    // 状态
    loading,
    progress,
    results,
    errors,
    completed,
    total,
    
    // 方法
    executeBatch,
    executeSequential,
    cancel,
    reset,
    
    // 计算属性
    isComplete: completed === total && total > 0,
    hasErrors: errors.length > 0,
    successCount: results.length,
    errorCount: errors.length,
    successRate: total > 0 ? (results.length / total) * 100 : 0,
  };
}

export default useBatchAPI;
