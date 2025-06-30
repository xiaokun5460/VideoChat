/**
 * 剪贴板操作Hook
 * 提供统一的复制到剪贴板功能
 */

import { useState } from 'react';
import { message } from 'antd';

/**
 * 剪贴板Hook
 * @returns {Object} 剪贴板操作方法和状态
 */
export const useClipboard = () => {
  const [loading, setLoading] = useState(false);

  /**
   * 复制文本到剪贴板
   * @param {string} content - 要复制的内容
   * @param {Object} options - 选项
   * @param {string} options.successMessage - 成功消息
   * @param {string} options.errorMessage - 错误消息
   * @param {boolean} options.showMessage - 是否显示消息
   * @returns {Promise<boolean>} 是否成功
   */
  const copyToClipboard = async (content, options = {}) => {
    const {
      successMessage = '已复制到剪贴板',
      errorMessage = '复制失败',
      showMessage = true
    } = options;

    if (!content) {
      if (showMessage) {
        message.warning('没有内容可复制');
      }
      return false;
    }

    setLoading(true);
    try {
      await navigator.clipboard.writeText(content);
      if (showMessage) {
        message.success(successMessage);
      }
      return true;
    } catch (error) {
      console.error('Copy failed:', error);
      if (showMessage) {
        message.error(errorMessage);
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 检查是否支持剪贴板API
   * @returns {boolean} 是否支持
   */
  const isSupported = () => {
    return navigator.clipboard && window.isSecureContext;
  };

  return {
    copyToClipboard,
    loading,
    isSupported
  };
};

export default useClipboard;
