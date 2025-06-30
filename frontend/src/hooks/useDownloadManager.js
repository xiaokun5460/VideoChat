/**
 * 下载管理业务逻辑Hook
 * 统一处理视频下载、进度监控、任务管理等操作
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { App } from 'antd';
import { useFiles } from './useAppContext';
import { downloadVideo, getDownloadProgress, cancelDownload, transcribeDownloadedFile } from '../services/api';

/**
 * 下载管理Hook
 * @returns {Object} 下载管理相关的方法和状态
 */
export const useDownloadManager = () => {
  const { message } = App.useApp();
  const { addFile } = useFiles();

  // 下载任务状态
  const [downloadTasks, setDownloadTasks] = useState(new Map());
  const [isDownloading, setIsDownloading] = useState(false);

  // 轮询定时器引用
  const pollTimersRef = useRef(new Map());

  // 清理定时器
  useEffect(() => {
    const timers = pollTimersRef.current;
    return () => {
      timers.forEach((timer) => clearInterval(timer));
      timers.clear();
    };
  }, []);

  /**
   * 开始下载视频
   * @param {string[]} urls - 视频URL列表
   * @param {boolean} autoTranscribe - 是否自动转录
   */
  const startDownload = useCallback(
    async (urls, autoTranscribe = true) => {
      if (!urls || urls.length === 0) {
        message.error('请输入视频URL');
        return;
      }

      setIsDownloading(true);
      let successCount = 0;
      let failCount = 0;

      try {
        for (const url of urls) {
          if (!url.trim()) continue;

          try {
            const response = await downloadVideo(url.trim());
            const taskId = response.task_id;

            // 添加到下载任务列表
            setDownloadTasks(
              (prev) =>
                new Map(
                  prev.set(taskId, {
                    id: taskId,
                    url: url.trim(),
                    filename: '获取中...',
                    status: 'pending',
                    progress: 0,
                    speed: '0 B/s',
                    eta: 'Unknown',
                    autoTranscribe,
                    error_message: null,
                  })
                )
            );

            // 开始轮询下载进度
            startProgressPolling(taskId);
            successCount++;
          } catch (error) {
            console.error(`Download failed for ${url}:`, error);
            message.error(`URL ${url} 下载启动失败：${error.message}`);
            failCount++;
          }
        }

        if (successCount > 0) {
          message.success(`成功启动 ${successCount} 个下载任务`);
        }
        if (failCount > 0) {
          message.warning(`${failCount} 个下载任务启动失败`);
        }
      } finally {
        setIsDownloading(false);
      }
    },
    [message]
  );

  /**
   * 开始轮询下载进度
   * @param {string} taskId - 任务ID
   */
  const startProgressPolling = useCallback(
    (taskId) => {
      // 清除已存在的定时器
      if (pollTimersRef.current.has(taskId)) {
        clearInterval(pollTimersRef.current.get(taskId));
      }

      const pollInterval = setInterval(async () => {
        try {
          const progress = await getDownloadProgress(taskId);

          // 更新下载任务状态
          setDownloadTasks((prev) => {
            const newTasks = new Map(prev);
            const currentTask = newTasks.get(taskId);
            if (currentTask) {
              newTasks.set(taskId, {
                ...currentTask,
                status: progress.status,
                progress: progress.progress || 0,
                speed: progress.speed || '0 B/s',
                eta: progress.eta || 'Unknown',
                filename: progress.filename || currentTask.filename,
                error_message: progress.error_message,
              });
            }
            return newTasks;
          });

          // 如果下载完成，停止轮询并处理文件
          if (progress.status === 'completed') {
            clearInterval(pollInterval);
            pollTimersRef.current.delete(taskId);
            await handleDownloadCompleted(taskId, progress);
          } else if (progress.status === 'failed' || progress.status === 'cancelled') {
            clearInterval(pollInterval);
            pollTimersRef.current.delete(taskId);
            if (progress.status === 'failed') {
              message.error(`下载失败: ${progress.error_message || '未知错误'}`);
            }
          }
        } catch (error) {
          console.error('Failed to poll download progress:', error);
          clearInterval(pollInterval);
          pollTimersRef.current.delete(taskId);
        }
      }, 2000); // 每2秒检查一次

      pollTimersRef.current.set(taskId, pollInterval);
    },
    [message]
  );

  /**
   * 处理下载完成
   * @param {string} taskId - 任务ID
   * @param {Object} progress - 进度信息
   */
  const handleDownloadCompleted = useCallback(
    async (taskId, progress) => {
      try {
        const task = downloadTasks.get(taskId);
        const shouldAutoTranscribe = task?.autoTranscribe || false;

        // 创建文件对象
        const downloadedFile = {
          id: `downloaded-${taskId}-${Date.now()}`,
          name: progress.filename,
          type: getFileType(progress.filename),
          size: 0, // 后端可以提供文件大小
          url: `http://localhost:8000/uploads/${progress.filename}`,
          transcription: [],
          isDownloaded: true,
          downloadTaskId: taskId,
        };

        // 添加到文件列表
        addFile(downloadedFile);
        message.success(`下载完成: ${progress.filename}`);

        // 如果启用自动转录，开始转录
        if (shouldAutoTranscribe) {
          try {
            await transcribeDownloadedFile(progress.filename, `uploads/${progress.filename}`);
            message.info(`开始转录: ${progress.filename}`);
          } catch (error) {
            console.error('Auto transcription failed:', error);
            message.warning(`自动转录失败: ${error.message}`);
          }
        }

        // 从下载任务列表中移除已完成的任务（延迟移除，让用户看到完成状态）
        setTimeout(() => {
          setDownloadTasks((prev) => {
            const newTasks = new Map(prev);
            newTasks.delete(taskId);
            return newTasks;
          });
        }, 3000);
      } catch (error) {
        console.error('Failed to handle download completion:', error);
        message.error(`处理下载完成失败: ${error.message}`);
      }
    },
    [downloadTasks, addFile, message]
  );

  /**
   * 取消下载任务
   * @param {string} taskId - 任务ID
   */
  const cancelDownloadTask = useCallback(
    async (taskId) => {
      try {
        await cancelDownload(taskId);

        // 清除轮询定时器
        if (pollTimersRef.current.has(taskId)) {
          clearInterval(pollTimersRef.current.get(taskId));
          pollTimersRef.current.delete(taskId);
        }

        // 更新任务状态
        setDownloadTasks((prev) => {
          const newTasks = new Map(prev);
          const task = newTasks.get(taskId);
          if (task) {
            newTasks.set(taskId, {
              ...task,
              status: 'cancelled',
            });
          }
          return newTasks;
        });

        message.info('下载任务已取消');
      } catch (error) {
        console.error('Failed to cancel download:', error);
        message.error(`取消下载失败: ${error.message}`);
      }
    },
    [message]
  );

  /**
   * 清除已完成或失败的任务
   */
  const clearCompletedTasks = useCallback(() => {
    setDownloadTasks((prev) => {
      const newTasks = new Map();
      prev.forEach((task, taskId) => {
        if (task.status !== 'completed' && task.status !== 'failed' && task.status !== 'cancelled') {
          newTasks.set(taskId, task);
        }
      });
      return newTasks;
    });
  }, []);

  /**
   * 获取文件类型
   * @param {string} filename - 文件名
   * @returns {string} MIME类型
   */
  const getFileType = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const videoExts = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'm4v'];
    const audioExts = ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'];

    if (videoExts.includes(ext)) {
      return `video/${ext}`;
    } else if (audioExts.includes(ext)) {
      return `audio/${ext}`;
    }
    return 'application/octet-stream';
  };

  return {
    // 状态
    downloadTasks,
    isDownloading,

    // 方法
    startDownload,
    cancelDownloadTask,
    clearCompletedTasks,
  };
};

export default useDownloadManager;
