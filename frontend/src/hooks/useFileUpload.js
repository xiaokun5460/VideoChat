/**
 * 文件上传Hook
 * 专门处理文件上传的状态管理和进度跟踪
 */

import { useState, useCallback, useRef } from 'react';
import { App } from 'antd';
import { formatAPIError, validateFileType, formatFileSize } from '../services/api';

/**
 * 文件上传Hook
 * 提供文件上传的完整状态管理和进度跟踪
 * 
 * @returns {Object} 文件上传状态和方法
 */
export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const abortControllerRef = useRef(null);
  const { message } = App.useApp();

  /**
   * 上传单个文件
   * @param {File} file - 要上传的文件
   * @param {Object} options - 上传选项
   */
  const upload = useCallback(async (file, options = {}) => {
    const { 
      onProgress, 
      onSuccess, 
      onError,
      uploadFunction,
      allowedTypes = ['audio/*', 'video/*'],
      maxSize = 100 * 1024 * 1024, // 100MB
      showMessages = true,
      ...uploadOptions 
    } = options;

    try {
      // 文件验证
      if (!validateFileType(file, allowedTypes)) {
        throw new Error(`不支持的文件类型: ${file.type}`);
      }

      if (file.size > maxSize) {
        throw new Error(`文件大小超过限制: ${formatFileSize(file.size)} > ${formatFileSize(maxSize)}`);
      }

      setUploading(true);
      setProgress(0);
      setError(null);
      setUploadedFile(file);
      setUploadResult(null);

      abortControllerRef.current = new AbortController();

      if (showMessages) {
        message.loading(`正在上传 ${file.name}...`, 0);
      }

      // 模拟上传进度（如果没有真实进度）
      let progressInterval;
      if (!uploadOptions.hasRealProgress) {
        progressInterval = setInterval(() => {
          setProgress((prev) => {
            const newProgress = Math.min(prev + Math.random() * 15, 85);
            onProgress?.(newProgress, file);
            return newProgress;
          });
        }, 300);
      }

      // 执行上传
      const result = await uploadFunction(file, {
        ...uploadOptions,
        signal: abortControllerRef.current.signal,
        onProgress: uploadOptions.hasRealProgress ? (progressValue) => {
          setProgress(progressValue);
          onProgress?.(progressValue, file);
        } : undefined,
      });

      if (progressInterval) {
        clearInterval(progressInterval);
      }

      setProgress(100);
      setUploadResult(result);
      
      if (showMessages) {
        message.destroy();
        message.success(`${file.name} 上传成功`);
      }

      onProgress?.(100, file);
      onSuccess?.(result, file);

      return result;
    } catch (err) {
      const formattedError = formatAPIError(err);
      setError(formattedError);

      if (showMessages) {
        message.destroy();
        if (err.name !== 'AbortError') {
          message.error(`上传失败: ${formattedError.message}`);
        }
      }

      onError?.(formattedError, file);
      throw err;
    } finally {
      setUploading(false);
      abortControllerRef.current = null;
    }
  }, [message]);

  /**
   * 上传多个文件
   * @param {FileList|Array} files - 要上传的文件列表
   * @param {Object} options - 上传选项
   */
  const uploadMultiple = useCallback(async (files, options = {}) => {
    const { 
      onProgress, 
      onSuccess, 
      onError,
      onFileComplete,
      onFileError,
      concurrent = false,
      maxConcurrency = 3,
      ...uploadOptions 
    } = options;

    const fileArray = Array.from(files);
    const results = [];
    const errors = [];
    let completedCount = 0;

    const updateOverallProgress = () => {
      const overallProgress = (completedCount / fileArray.length) * 100;
      onProgress?.(overallProgress, completedCount, fileArray.length);
    };

    if (concurrent) {
      // 并发上传
      const executing = [];
      
      for (let i = 0; i < fileArray.length; i++) {
        const uploadPromise = upload(fileArray[i], {
          ...uploadOptions,
          showMessages: false,
          onSuccess: (result, file) => {
            results.push({ file, result, index: i });
            completedCount++;
            updateOverallProgress();
            onFileComplete?.(result, file, i);
          },
          onError: (error, file) => {
            errors.push({ file, error, index: i });
            completedCount++;
            updateOverallProgress();
            onFileError?.(error, file, i);
          }
        });

        executing.push(uploadPromise);

        if (executing.length >= maxConcurrency) {
          await Promise.race(executing);
          executing.splice(executing.findIndex(p => p.settled), 1);
        }
      }

      await Promise.allSettled(executing);
    } else {
      // 串行上传
      for (let i = 0; i < fileArray.length; i++) {
        try {
          const result = await upload(fileArray[i], {
            ...uploadOptions,
            showMessages: false,
          });
          
          results.push({ file: fileArray[i], result, index: i });
          onFileComplete?.(result, fileArray[i], i);
        } catch (error) {
          errors.push({ file: fileArray[i], error, index: i });
          onFileError?.(error, fileArray[i], i);
        }
        
        completedCount++;
        updateOverallProgress();
      }
    }

    const finalResult = { results, errors };
    
    if (errors.length === 0) {
      onSuccess?.(finalResult);
    } else {
      onError?.(finalResult);
    }

    return finalResult;
  }, [upload]);

  /**
   * 取消上传
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
    setProgress(0);
    setError(null);
    setUploadedFile(null);
    setUploadResult(null);
    setUploading(false);
  }, []);

  return {
    // 状态
    uploading,
    progress,
    error,
    uploadedFile,
    uploadResult,
    
    // 方法
    upload,
    uploadMultiple,
    cancel,
    reset,
    
    // 计算属性
    isComplete: !uploading && progress === 100 && uploadResult !== null,
    isError: !uploading && error !== null,
    isIdle: !uploading && progress === 0 && uploadResult === null && error === null,
  };
}

export default useFileUpload;
