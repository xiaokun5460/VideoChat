/**
 * 全局应用状态管理Context
 * 统一管理文件列表、当前文件、转录状态等核心状态
 */

import React, { createContext, useState, useCallback } from 'react';

// 创建Context
const AppContext = createContext();

/**
 * 应用状态提供者组件
 * @param {Object} props - 组件属性
 * @param {React.ReactNode} props.children - 子组件
 */
const AppProvider = ({ children }) => {
  // 核心状态
  const [files, setFiles] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [transcribingFiles, setTranscribingFiles] = useState(new Set());
  


  // UI状态
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [downloadModalVisible, setDownloadModalVisible] = useState(false);
  const [downloadTasksCount, setDownloadTasksCount] = useState(0);

  // 文件操作方法
  const addFile = useCallback((file) => {
    setFiles(prev => [...prev, file]);
  }, []);

  const removeFile = useCallback((fileName) => {
    setFiles(prev => prev.filter(f => f.name !== fileName));
    setSelectedFiles(prev => prev.filter(name => name !== fileName));
    
    // 如果删除的是当前文件，切换到下一个文件
    if (currentFile?.name === fileName) {
      setFiles(prev => {
        const remainingFiles = prev.filter(f => f.name !== fileName);
        setCurrentFile(remainingFiles[0] || null);
        return remainingFiles;
      });
    }
  }, [currentFile]);

  const updateFile = useCallback((fileName, updates) => {
    setFiles(prev => prev.map(f => 
      f.name === fileName ? { ...f, ...updates } : f
    ));
    
    // 如果更新的是当前文件，同时更新currentFile
    if (currentFile?.name === fileName) {
      setCurrentFile(prev => ({ ...prev, ...updates }));
    }
  }, [currentFile]);

  const selectFile = useCallback((file) => {
    setCurrentFile(file);
  }, []);

  // 文件选择操作
  const toggleFileSelection = useCallback((fileName) => {
    setSelectedFiles(prev => 
      prev.includes(fileName) 
        ? prev.filter(name => name !== fileName)
        : [...prev, fileName]
    );
  }, []);

  const clearFileSelection = useCallback(() => {
    setSelectedFiles([]);
  }, []);

  // 转录状态管理
  const addTranscribingFile = useCallback((fileName) => {
    setTranscribingFiles(prev => new Set([...prev, fileName]));
  }, []);

  const removeTranscribingFile = useCallback((fileName) => {
    setTranscribingFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileName);
      return newSet;
    });
  }, []);

  // UI状态操作

  const openSettings = useCallback(() => {
    setSettingsVisible(true);
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsVisible(false);
  }, []);

  const openDownloadModal = useCallback(() => {
    setDownloadModalVisible(true);
  }, []);

  const closeDownloadModal = useCallback(() => {
    setDownloadModalVisible(false);
  }, []);

  // 状态选择器
  const getFileByName = useCallback((fileName) => {
    return files.find(f => f.name === fileName);
  }, [files]);

  const getSelectedFilesData = useCallback(() => {
    return files.filter(f => selectedFiles.includes(f.name));
  }, [files, selectedFiles]);

  const isFileTranscribing = useCallback((fileName) => {
    return transcribingFiles.has(fileName);
  }, [transcribingFiles]);

  // Context值
  const value = {
    // 状态
    files,
    currentFile,
    selectedFiles,
    transcribingFiles,
    settingsVisible,
    downloadModalVisible,
    downloadTasksCount,



    // 文件操作方法
    addFile,
    removeFile,
    updateFile,
    selectFile,
    toggleFileSelection,
    clearFileSelection,

    // 转录状态管理
    addTranscribingFile,
    removeTranscribingFile,

    // UI状态操作
    openSettings,
    closeSettings,
    openDownloadModal,
    closeDownloadModal,
    setDownloadTasksCount,

    // 状态选择器
    getFileByName,
    getSelectedFilesData,
    isFileTranscribing
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export { AppContext, AppProvider };
