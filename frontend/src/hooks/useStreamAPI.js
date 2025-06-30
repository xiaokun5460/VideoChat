/**
 * 流式API调用Hook
 * 专门处理流式响应的API调用
 */

import { useState, useRef, useCallback } from 'react';
import { App } from 'antd';
import { formatAPIError } from '../services/api';

/**
 * 流式API调用Hook
 * 专注于流式响应的状态管理和实时数据处理
 *
 * @returns {Object} 流式API调用状态和方法
 */
export function useStreamAPI() {
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [content, setContent] = useState('');
  const abortControllerRef = useRef(null);
  const contentRef = useRef(''); // 用于跟踪最新的content值
  const streamingRef = useRef(false); // 用于跟踪流式状态，避免状态竞争
  const { message } = App.useApp();

  /**
   * 执行流式API调用
   * @param {Function} apiFunction - API函数
   * @param {Object} options - 调用选项
   */
  const executeStream = useCallback(
    async (apiFunction, options = {}) => {
      const { loadingMessage, successMessage, errorMessage, showMessages = true, onStart, onChunk, onComplete, onError, resetContentOnStart = true, accumulateContent = true, ...apiOptions } = options;

      try {
        setLoading(true);
        streamingRef.current = false;
        setStreaming(false);
        setError(null);

        if (resetContentOnStart) {
          setContent('');
          contentRef.current = '';
          streamingRef.current = false;
        }

        // 创建新的取消控制器
        abortControllerRef.current = new AbortController();

        // 显示加载消息
        if (showMessages && loadingMessage) {
          message.loading(loadingMessage, 0);
        }

        onStart?.();

        // 执行流式API调用
        await apiFunction({
          ...apiOptions,
          stream: true,
          signal: abortControllerRef.current.signal,
          onChunk: (chunk) => {
            // 首次接收数据时切换状态（使用ref来避免状态竞争）
            if (!streamingRef.current) {
              streamingRef.current = true;
              setStreaming(true);
              setLoading(false);
              if (showMessages) {
                message.destroy();
              }
            }

            // 更新内容
            if (accumulateContent) {
              contentRef.current += chunk;
              setContent(contentRef.current);
            }

            onChunk?.(chunk);
          },
          onComplete: () => {
            streamingRef.current = false;
            setStreaming(false);

            if (showMessages && successMessage) {
              message.success(successMessage);
            }

            onComplete?.(contentRef.current);
          },
          onError: (err) => {
            const formattedError = formatAPIError(err);
            setError(formattedError);
            streamingRef.current = false;
            setStreaming(false);

            if (showMessages) {
              message.destroy();
              message.error(errorMessage || formattedError.message);
            }

            onError?.(formattedError);
          },
        });
      } catch (err) {
        const formattedError = formatAPIError(err);
        setError(formattedError);
        streamingRef.current = false;
        setStreaming(false);

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
    [message] // 移除streaming和content依赖，避免状态竞争
  );

  /**
   * 取消流式请求
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      streamingRef.current = false;
      setStreaming(false);
      message.destroy();
    }
  }, [message]);

  /**
   * 重置流式状态
   */
  const reset = useCallback(() => {
    setContent('');
    setError(null);
    streamingRef.current = false;
    setStreaming(false);
    setLoading(false);
    contentRef.current = '';
  }, []);

  /**
   * 清空内容但保持其他状态
   */
  const clearContent = useCallback(() => {
    setContent('');
    contentRef.current = '';
  }, []);

  /**
   * 追加内容（手动模式）
   */
  const appendContent = useCallback((newContent) => {
    contentRef.current += newContent;
    setContent(contentRef.current);
  }, []);

  return {
    // 状态
    loading,
    streaming,
    error,
    content,

    // 方法
    executeStream,
    cancel,
    reset,
    clearContent,
    appendContent,

    // 计算属性
    isActive: loading || streaming,
    isComplete: !loading && !streaming && content.length > 0,
    isError: !loading && !streaming && error !== null,
    isIdle: !loading && !streaming && content.length === 0 && error === null,
    contentLength: content.length,
  };
}

export default useStreamAPI;
