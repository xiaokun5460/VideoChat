/**
 * 基础API调用Hook
 * 提供简单、可复用的API调用状态管理
 */

import { useState, useRef, useCallback } from 'react';
import { App } from 'antd';
import { formatAPIError } from '../services/api';

/**
 * 基础API调用Hook
 * 专注于单次API调用的状态管理和错误处理
 * 
 * @returns {Object} API调用状态和方法
 */
export function useAPICall() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const abortControllerRef = useRef(null);
  const { message } = App.useApp();

  /**
   * 执行API调用
   * @param {Function} apiFunction - API函数
   * @param {Object} options - 调用选项
   * @returns {Promise} API调用结果
   */
  const execute = useCallback(
    async (apiFunction, options = {}) => {
      const { 
        loadingMessage, 
        successMessage, 
        errorMessage, 
        showMessages = true, 
        onSuccess, 
        onError,
        resetDataOnStart = true,
        ...apiOptions 
      } = options;

      try {
        setLoading(true);
        setError(null);
        
        if (resetDataOnStart) {
          setData(null);
        }

        // 创建新的取消控制器
        abortControllerRef.current = new AbortController();

        // 显示加载消息
        if (showMessages && loadingMessage) {
          message.loading(loadingMessage, 0);
        }

        // 执行API调用
        const result = await apiFunction({
          ...apiOptions,
          signal: abortControllerRef.current.signal,
        });

        // 保存结果
        setData(result);

        // 成功处理
        if (showMessages) {
          message.destroy();
          if (successMessage) {
            message.success(successMessage);
          }
        }

        onSuccess?.(result);
        return result;
      } catch (err) {
        const formattedError = formatAPIError(err);
        setError(formattedError);

        // 错误处理
        if (showMessages) {
          message.destroy();
          if (err.name !== 'AbortError') {
            message.error(errorMessage || formattedError.message);
          }
        }

        onError?.(formattedError);
        throw err;
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [message]
  );

  /**
   * 取消当前请求
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      message.destroy();
    }
  }, [message]);

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  /**
   * 重新执行上次的API调用
   */
  const retry = useCallback(() => {
    if (abortControllerRef.current?.lastApiFunction && abortControllerRef.current?.lastOptions) {
      return execute(abortControllerRef.current.lastApiFunction, abortControllerRef.current.lastOptions);
    }
  }, [execute]);

  return {
    // 状态
    loading,
    error,
    data,
    
    // 方法
    execute,
    cancel,
    reset,
    retry,
    
    // 计算属性
    isSuccess: !loading && !error && data !== null,
    isError: !loading && error !== null,
    isIdle: !loading && error === null && data === null,
  };
}

export default useAPICall;
