/**
 * 文件管理业务逻辑Hook
 * 统一处理文件上传、删除、选择、转录等操作
 */

import { useCallback } from 'react';
import { App } from 'antd';
import { useFiles } from './useAppContext';
import { useAPICall } from './useAPI';
import { uploadAndTranscribe } from '../services/api';

/**
 * 文件管理Hook
 * @returns {Object} 文件管理相关的方法
 */
export const useFileManager = () => {
  const { message } = App.useApp();
  const {
    files,
    currentFile,
    addFile,
    removeFile,
    updateFile,
    selectFile,
    addTranscribingFile,
    removeTranscribingFile,
    isFileTranscribing
  } = useFiles();
  
  const transcribeAPI = useAPICall();

  /**
   * 处理文件上传
   * @param {File} file - 要上传的文件
   * @param {Function} onSuccess - 成功回调
   * @param {Function} onError - 错误回调
   */
  const handleFileUpload = useCallback(async (file, onSuccess, onError) => {
    try {
      // 检查文件类型
      const isVideo = file.type.startsWith('video/');
      const isAudio = file.type.startsWith('audio/');

      if (!isVideo && !isAudio) {
        message.error('请上传视频或音频文件');
        onError?.('Invalid file type');
        return;
      }

      // 检查文件是否已存在
      const isExist = files.some(f => f.name === file.name);
      if (isExist) {
        message.warning('文件已存在');
        onError?.('File already exists');
        return;
      }

      // 创建文件对象
      const fileObj = {
        name: file.name,
        size: file.size,
        type: isVideo ? 'video' : 'audio',
        url: URL.createObjectURL(file),
        file: file,
        transcription: null,
        summary: '',
        detailedSummary: '',
        mindmapData: null,
        evaluation: '',
        uploadTime: new Date().toISOString(),
      };

      // 添加文件到状态
      addFile(fileObj);

      // 如果是第一个文件，设为当前文件
      if (files.length === 0) {
        selectFile(fileObj);
      }

      message.success(`文件 "${file.name}" 上传成功`);
      onSuccess?.();
    } catch (error) {
      console.error('File upload failed:', error);
      message.error('文件上传失败');
      onError?.(error);
    }
  }, [files, addFile, selectFile, message]);

  /**
   * 处理文件删除
   * @param {Object} file - 要删除的文件对象
   */
  const handleFileDelete = useCallback((file) => {
    // 清理URL对象，避免内存泄漏
    if (file.url && file.url.startsWith('blob:')) {
      URL.revokeObjectURL(file.url);
    }

    // 删除文件
    removeFile(file.name);
    
    message.success(`文件 "${file.name}" 已删除`);
  }, [removeFile, message]);

  /**
   * 处理文件选择
   * @param {Object} file - 要选择的文件对象
   */
  const handleFileSelect = useCallback((file) => {
    selectFile(file);
  }, [selectFile]);

  /**
   * 处理文件转录
   * @param {Object} file - 要转录的文件对象
   * @returns {Promise} 转录结果
   */
  const handleTranscribe = useCallback(async (file) => {
    // 检查是否已在转录中
    if (isFileTranscribing(file.name)) {
      message.warning('文件正在转录中，请稍候...');
      return;
    }

    // 添加到转录状态
    addTranscribingFile(file.name);

    try {
      const result = await transcribeAPI.execute(
        (options) => uploadAndTranscribe(file.file, options),
        {
          loadingMessage: `正在转录 "${file.name}"...`,
          successMessage: `"${file.name}" 转录完成`,
          errorMessage: `转录失败`,
          onSuccess: (data) => {
            // 更新文件转录结果
            updateFile(file.name, { transcription: data.transcription });
          }
        }
      );

      return result;

    } catch (error) {
      console.error('Transcription failed:', error);
      throw error;
    } finally {
      // 移除转录状态
      removeTranscribingFile(file.name);
    }
  }, [
    isFileTranscribing,
    addTranscribingFile,
    removeTranscribingFile,
    updateFile,
    transcribeAPI,
    message
  ]);

  /**
   * 批量删除文件
   * @param {Array} fileNames - 要删除的文件名数组
   */
  const handleBatchDelete = useCallback((fileNames) => {
    fileNames.forEach(fileName => {
      const file = files.find(f => f.name === fileName);
      if (file) {
        handleFileDelete(file);
      }
    });
  }, [files, handleFileDelete]);

  /**
   * 获取文件统计信息
   * @returns {Object} 文件统计信息
   */
  const getFileStats = useCallback(() => {
    const totalFiles = files.length;
    const transcribedFiles = files.filter(f => f.transcription).length;
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const videoFiles = files.filter(f => f.type === 'video').length;
    const audioFiles = files.filter(f => f.type === 'audio').length;

    return {
      totalFiles,
      transcribedFiles,
      totalSize,
      videoFiles,
      audioFiles,
      transcriptionProgress: totalFiles > 0 ? (transcribedFiles / totalFiles) * 100 : 0
    };
  }, [files]);

  /**
   * 检查文件是否可以转录
   * @param {Object} file - 文件对象
   * @returns {boolean} 是否可以转录
   */
  const canTranscribe = useCallback((file) => {
    return file && file.file && !file.transcription && !isFileTranscribing(file.name);
  }, [isFileTranscribing]);

  return {
    // 基本操作
    handleFileUpload,
    handleFileDelete,
    handleFileSelect,
    handleTranscribe,
    
    // 批量操作
    handleBatchDelete,
    
    // 工具方法
    getFileStats,
    canTranscribe,
    
    // 状态查询
    isFileTranscribing,
    
    // 当前状态
    files,
    currentFile
  };
};

export default useFileManager;
