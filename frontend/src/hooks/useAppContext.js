/**
 * 应用Context Hook
 * 便于组件使用全局状态管理
 */

import { useContext } from 'react';
import { AppContext } from '../contexts/AppContext';

/**
 * 使用应用Context的Hook
 * @returns {Object} 应用状态和操作方法
 * @throws {Error} 如果在AppProvider外部使用会抛出错误
 */
export const useAppContext = () => {
  const context = useContext(AppContext);
  
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  
  return context;
};

/**
 * 文件相关状态和操作的Hook
 * @returns {Object} 文件相关的状态和方法
 */
export const useFiles = () => {
  const {
    files,
    currentFile,
    selectedFiles,
    transcribingFiles,
    addFile,
    removeFile,
    updateFile,
    selectFile,
    toggleFileSelection,
    clearFileSelection,
    addTranscribingFile,
    removeTranscribingFile,
    getFileByName,
    getSelectedFilesData,
    isFileTranscribing
  } = useAppContext();

  return {
    files,
    currentFile,
    selectedFiles,
    transcribingFiles,
    addFile,
    removeFile,
    updateFile,
    selectFile,
    toggleFileSelection,
    clearFileSelection,
    addTranscribingFile,
    removeTranscribingFile,
    getFileByName,
    getSelectedFilesData,
    isFileTranscribing
  };
};

/**
 * UI状态相关的Hook
 * @returns {Object} UI状态和操作方法
 */
export const useUIState = () => {
  const {
    isDarkMode,
    settingsVisible,
    downloadModalVisible,
    downloadTasksCount,
    showStreamDemo,
    toggleDarkMode,
    openSettings,
    closeSettings,
    openDownloadModal,
    closeDownloadModal,
    toggleStreamDemo,
    setDownloadTasksCount
  } = useAppContext();

  return {
    isDarkMode,
    settingsVisible,
    downloadModalVisible,
    downloadTasksCount,
    showStreamDemo,
    toggleDarkMode,
    openSettings,
    closeSettings,
    openDownloadModal,
    closeDownloadModal,
    toggleStreamDemo,
    setDownloadTasksCount
  };
};

export default useAppContext;
