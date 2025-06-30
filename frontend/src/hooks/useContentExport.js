/**
 * 通用内容导出Hook
 * 支持将AI功能的Markdown内容转换为图片并下载
 */

import { useState, useCallback } from 'react';
import { App } from 'antd';
import { exportContentToImage, exportTranscription, exportSummary, downloadFile as downloadFileAPI, formatAPIError } from '../services/api';

/**
 * 内容导出Hook
 * 提供统一的内容导出接口和用户反馈机制
 *
 * @returns {Object} 导出状态和方法
 * @returns {boolean} returns.loading - 是否正在导出
 * @returns {Object|null} returns.error - 错误信息
 * @returns {Function} returns.exportToImage - 导出为图片的方法
 * @returns {Function} returns.reset - 重置状态的方法
 *
 * @example
 * const { loading, exportToImage } = useContentExport();
 *
 * const handleExport = async () => {
 *   const success = await exportToImage(
 *     '# 标题\n内容...',
 *     '智能总结报告',
 *     'summary'
 *   );
 *   if (success) {
 *     console.log('导出成功');
 *   }
 * };
 */
export function useContentExport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { message } = App.useApp();

  /**
   * 导出内容为图片
   * @param {string} content - Markdown内容
   * @param {string} title - 标题
   * @param {string} contentType - 内容类型 (summary/evaluation/mindmap)
   * @param {Object} options - 导出选项
   * @returns {Promise<boolean>} 导出是否成功
   */
  const exportToImage = useCallback(
    async (content, title, contentType, options = {}) => {
      const { showMessages = true, onSuccess, onError, filename } = options;

      try {
        setLoading(true);
        setError(null);

        // 参数验证
        if (!content || !content.trim()) {
          throw new Error('内容不能为空');
        }

        if (!title || !title.trim()) {
          throw new Error('标题不能为空');
        }

        if (!['summary', 'evaluation', 'mindmap'].includes(contentType)) {
          throw new Error('不支持的内容类型');
        }

        if (showMessages) {
          message.loading('正在生成图片...', 0);
        }

        // 调用后端API
        const response = await exportContentToImage(content.trim(), title.trim(), contentType);

        if (!response || !response.image_url) {
          throw new Error('图片生成失败');
        }

        // 下载图片
        await downloadImage(response.image_url, filename || generateFilename(title, contentType));

        if (showMessages) {
          message.destroy();
          message.success('图片导出成功');
        }

        // 调用成功回调
        if (onSuccess) {
          onSuccess(response);
        }

        return true;
      } catch (err) {
        console.error('内容导出失败:', err);

        // 格式化错误信息
        const errorInfo = formatAPIError(err);
        setError(errorInfo);

        if (showMessages) {
          message.destroy();
          const errorMessage = errorInfo.isNetworkError ? '网络连接失败，请检查网络后重试' : errorInfo.message || '图片导出失败';
          message.error(errorMessage);
        }

        // 调用错误回调
        if (onError) {
          onError(errorInfo);
        }

        return false;
      } finally {
        setLoading(false);
      }
    },
    [message]
  );

  /**
   * 下载图片文件
   * @param {string} imageUrl - 图片URL
   * @param {string} filename - 文件名
   */
  const downloadImage = async (imageUrl, filename) => {
    try {
      // 获取图片数据
      const blob = await downloadFileAPI(imageUrl);

      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';

      // 触发下载
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // 清理URL对象
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('图片下载失败:', err);
      throw new Error('图片下载失败');
    }
  };

  /**
   * 生成文件名
   * @param {string} title - 标题
   * @param {string} contentType - 内容类型
   * @returns {string} 文件名
   */
  const generateFilename = (title, contentType) => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const safeTitle = title.replace(/[^\w\u4e00-\u9fa5]/g, '_').substring(0, 50);

    const typeNames = {
      summary: '智能总结',
      evaluation: '教师评价',
      mindmap: '思维导图',
    };

    const typeName = typeNames[contentType] || contentType;
    return `${typeName}_${safeTitle}_${timestamp}.png`;
  };

  /**
   * 导出转录结果
   * @param {string} format - 导出格式 (vtt/srt/txt)
   * @param {Array} transcription - 转录数据
   * @param {string} filename - 文件名
   * @param {Object} options - 导出选项
   * @returns {Promise<boolean>} 导出是否成功
   */
  const exportTranscriptionFile = useCallback(
    async (format, transcription, filename, options = {}) => {
      const { showMessages = true, onSuccess, onError } = options;

      try {
        setLoading(true);
        setError(null);

        if (!transcription || !Array.isArray(transcription) || transcription.length === 0) {
          throw new Error('转录数据不能为空');
        }

        if (!['vtt', 'srt', 'txt'].includes(format)) {
          throw new Error('不支持的导出格式');
        }

        if (showMessages) {
          message.loading(`正在导出${format.toUpperCase()}文件...`, 0);
        }

        const response = await exportTranscription(format, transcription);

        if (!response || !response.download_url) {
          throw new Error('文件生成失败');
        }

        // 下载文件
        await downloadFile(response.download_url, response.filename || `${filename}.${format}`);

        if (showMessages) {
          message.destroy();
          message.success('转录文件导出成功');
        }

        if (onSuccess) {
          onSuccess(response);
        }

        return true;
      } catch (err) {
        console.error('转录导出失败:', err);
        const errorInfo = formatAPIError(err);
        setError(errorInfo);

        if (showMessages) {
          message.destroy();
          message.error(errorInfo.message || '转录导出失败');
        }

        if (onError) {
          onError(errorInfo);
        }

        return false;
      } finally {
        setLoading(false);
      }
    },
    [message]
  );

  /**
   * 导出总结内容
   * @param {string} summaryText - 总结文本
   * @param {string} filename - 文件名
   * @param {Object} options - 导出选项
   * @returns {Promise<boolean>} 导出是否成功
   */
  const exportSummaryFile = useCallback(
    async (summaryText, filename, options = {}) => {
      const { showMessages = true, onSuccess, onError } = options;

      try {
        setLoading(true);
        setError(null);

        if (!summaryText || !summaryText.trim()) {
          throw new Error('总结内容不能为空');
        }

        if (showMessages) {
          message.loading('正在导出总结文件...', 0);
        }

        const response = await exportSummary(summaryText.trim());

        if (!response || !response.download_url) {
          throw new Error('文件生成失败');
        }

        // 下载文件
        await downloadFile(response.download_url, response.filename || `${filename}_summary.txt`);

        if (showMessages) {
          message.destroy();
          message.success('总结文件导出成功');
        }

        if (onSuccess) {
          onSuccess(response);
        }

        return true;
      } catch (err) {
        console.error('总结导出失败:', err);
        const errorInfo = formatAPIError(err);
        setError(errorInfo);

        if (showMessages) {
          message.destroy();
          message.error(errorInfo.message || '总结导出失败');
        }

        if (onError) {
          onError(errorInfo);
        }

        return false;
      } finally {
        setLoading(false);
      }
    },
    [message]
  );

  /**
   * 下载文件
   * @param {string} fileUrl - 文件URL
   * @param {string} filename - 文件名
   */
  const downloadFile = async (fileUrl, filename) => {
    try {
      const blob = await downloadFileAPI(fileUrl);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('文件下载失败:', err);
      throw new Error('文件下载失败');
    }
  };

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return {
    // 状态
    loading,
    error,

    // 方法
    exportToImage,
    exportTranscriptionFile,
    exportSummaryFile,
    reset,
  };
}

export default useContentExport;
