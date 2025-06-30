import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Layout, Upload, Button, Input, Card, message, Table, Tabs, Pagination, Switch, Drawer, Space, Modal, Progress } from 'antd';
import {
  UploadOutlined,
  SendOutlined,
  SoundOutlined,
  SyncOutlined,
  DownloadOutlined,
  CopyOutlined,
  StopOutlined,
  DeleteOutlined,
  GithubOutlined,
  SettingOutlined,
  LinkOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import Mermaid from 'mermaid';
import './App.css';
import jsMind from 'jsmind';
import 'jsmind/style/jsmind.css';

const { TextArea } = Input;

// 修改内容展示组件
const SummaryContent = ({ fileId, content, isLoading }) => {
  const containerId = `summary-content-${fileId}`;

  // 直接使用传入的 content，不再使用本地状态
  return (
    <div key={fileId} id={containerId} className='markdown-content'>
      <ReactMarkdown>{content || ''}</ReactMarkdown>
    </div>
  );
};

const DetailedSummaryContent = ({ fileId, content, isLoading }) => {
  const containerId = `detailed-summary-content-${fileId}`;

  return (
    <div key={fileId} id={containerId} className='markdown-content detailed-summary-content'>
      <ReactMarkdown>{content || ''}</ReactMarkdown>
    </div>
  );
};

const MindmapContent = ({ fileId, content, isLoading }) => {
  const containerId = `mindmap-container-${fileId}`;

  useEffect(() => {
    if (content && !isLoading) {
      const container = document.getElementById(containerId);
      if (!container) return;

      // 清空容器
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      try {
        const options = {
          container: containerId,
          theme: 'primary',
          editable: false,
          view: {
            hmargin: 100,
            vmargin: 50,
            line_width: 2,
            line_color: '#558B2F',
          },
          layout: {
            hspace: 30,
            vspace: 20,
            pspace: 13,
          },
        };

        const jm = new jsMind(options);
        const data = typeof content === 'string' ? JSON.parse(content) : content;

        jm.show(data);
      } catch (error) {
        console.error('Failed to render mindmap:', error);
        container.innerHTML = '<div class="mindmap-error">思维导图渲染失败</div>';
      }
    }
  }, [content, isLoading, containerId, fileId]);

  // 如果正在加载，显示加载提示
  if (isLoading) {
    return (
      <div id={containerId} className='mindmap-container'>
        <div className='mindmap-loading'>
          <div className='loading-spinner'></div>
          <p>正在生成思维导图...</p>
        </div>
      </div>
    );
  }

  // 如果有内容，显示思维导图容器
  if (content) {
    return <div key={fileId} id={containerId} className='mindmap-container' />;
  }

  // 如果既不是加载中也没有内容，返回空容器
  return <div id={containerId} className='mindmap-container' />;
};

function App() {
  const [summary, setSummary] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [mindmap, setMindmap] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [mediaUrl, setMediaUrl] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isMindmapLoading, setIsMindmapLoading] = useState(false);
  const mediaRef = useRef(null);
  const [detailedSummary, setDetailedSummary] = useState('');
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const messagesEndRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const abortController = useRef(null);
  const [isComposing, setIsComposing] = useState(false);
  const jmInstanceRef = useRef(null);
  const [uploadedFiles, setUploadedFiles] = useState([]); // 存储上传的文件列表
  const [selectedFiles, setSelectedFiles] = useState([]); // 存储选中的文件
  const [currentFile, setCurrentFile] = useState(null); // 当前预览的文件
  const [pageSize, setPageSize] = useState(5); // 默认每页显示5个文件
  const [currentPage, setCurrentPage] = useState(1); // 添加当前页码状态
  const [abortTranscribing, setAbortTranscribing] = useState(false); // 添加停止转录状态
  const [mindmapLoadingFiles, setMindmapLoadingFiles] = useState(new Set());
  const [summaryLoadingFiles, setSummaryLoadingFiles] = useState(new Set());
  const [detailedSummaryLoadingFiles, setDetailedSummaryLoadingFiles] = useState(new Set());

  // 流式响应设置
  const [useStreamResponse, setUseStreamResponse] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);

  // 下载相关状态
  const [downloadModalVisible, setDownloadModalVisible] = useState(false);
  const [downloadUrls, setDownloadUrls] = useState(''); // 改为支持多个URL
  const [downloadTasks, setDownloadTasks] = useState(new Map());
  const [isDownloading, setIsDownloading] = useState(false);
  const [autoTranscribe, setAutoTranscribe] = useState(true); // 自动转录开关

  // 转录状态管理
  const [transcribingFiles, setTranscribingFiles] = useState(new Set());

  // 打印 uploadedFiles 的变化
  useEffect(() => {
    console.log('Uploaded Files:', uploadedFiles);
  }, [uploadedFiles]);

  // 初始化 Mermaid
  React.useEffect(() => {
    Mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
      mindmap: {
        padding: 20,
        curve: 'basis',
        nodeSpacing: 100,
        rankSpacing: 80,
        fontSize: 14,
        wrap: true,
        useMaxWidth: true,
      },
      themeVariables: {
        mindmapNode: '#7CB342',
        mindmapNodeBorder: '#558B2F',
        mindmapHover: '#AED581',
        mindmapBorder: '#558B2F',
        primaryColor: '#7CB342',
        lineColor: '#558B2F',
        textColor: '#37474F',
      },
    });
  }, []);

  const handleUpload = async (file) => {
    // 检查文件类型
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');

    if (!isVideo && !isAudio) {
      message.error('请上传视频或音频文件');
      return false;
    }

    // 检查文件是否已经存在
    const isExist = uploadedFiles.some((f) => f.name === file.name);
    if (isExist) {
      message.warning('文件已存在');
      return false;
    }

    // 创建文件的URL
    const url = URL.createObjectURL(file);
    const newFile = {
      id: `${file.name}-${Date.now()}`,
      name: file.name,
      type: isVideo ? 'video' : 'audio',
      url: url,
      file: file,
      status: 'waiting',
      transcription: null,
      summary: '',
      detailedSummary: '',
      mindmapData: null,
    };

    setUploadedFiles((prev) => {
      const newFiles = [...prev, newFile];
      // 计算新文件上传后的总页数
      const totalPages = Math.ceil(newFiles.length / pageSize);
      // 如果当前页无法显示新文件，跳转到最后一页
      if (currentPage < totalPages) {
        setCurrentPage(totalPages);
      }
      return newFiles;
    });

    // 如果是第一个文件，动设置为当前预览文件
    if (uploadedFiles.length === 0) {
      setCurrentFile(newFile);
      setMediaUrl({ url, type: isVideo ? 'video' : 'audio' });
    }

    return false; // 阻止自动上传
  };

  // 处理文件选择
  const handleFileSelect = (fileIds) => {
    setSelectedFiles(fileIds);
  };

  // 处理页码变化
  const handlePageChange = useCallback((page) => {
    console.log('页码变化:', page);
    setCurrentPage(page);
  }, []);

  // 处理页面大小变化
  const handlePageSizeChange = useCallback((current, size) => {
    console.log('页面大小变化:', size, '当前页:', current);
    setCurrentPage(1); // 切换每页显示数量时重置为第一页
    setPageSize(size);
  }, []);

  // 添加分页配置
  const paginationConfig = {
    current: currentPage, // 当前页码
    pageSize: pageSize,
    showSizeChanger: true,
    pageSizeOptions: ['5', '10', '20', '50'],
    showTotal: (total) => `共 ${total} 个文件`,
    onChange: handlePageChange, // 只处理页码变化
    onShowSizeChange: handlePageSizeChange, // 专门处理页面大小变化
  };

  // 计算当前页应该显示的文件
  const getPageData = () => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return uploadedFiles.slice(start, end);
  };

  // 文件列表列定
  const fileColumns = [
    {
      title: '文件名',
      dataIndex: 'name',
      key: 'name',
      width: '70%',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (type === 'video' ? '视频' : '音频'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        switch (status) {
          case 'waiting':
            return '等待转录';
          case 'transcribing':
            return (
              <>
                <SyncOutlined spin /> 转录中
              </>
            );
          case 'done':
            return <span style={{ color: '#52c41a' }}>已完成</span>;
          case 'error':
            return <span style={{ color: '#ff4d4f' }}>失败</span>;
          case 'interrupted':
            return <span style={{ color: '#faad14' }}>转录中断</span>;
          default:
            return status;
        }
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button
          type='text'
          danger
          onClick={(e) => {
            e.stopPropagation();
            handleFileDelete(record.id);
          }}
          icon={<DeleteOutlined />}
          disabled={record.status === 'transcribing'}>
          删除
        </Button>
      ),
    },
  ];

  // 处理文件删除
  const handleFileDelete = (fileId) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));
    setSelectedFiles((prev) => prev.filter((id) => id !== fileId));

    if (currentFile?.id === fileId) {
      const remainingFiles = uploadedFiles.filter((file) => file.id !== fileId);
      const nextFile = remainingFiles[0];
      if (nextFile) {
        setCurrentFile(nextFile);
        setMediaUrl({ url: nextFile.url, type: nextFile.type });
      } else {
        setCurrentFile(null);
        setMediaUrl(null);
      }
    }
  };

  // 修改文件预览函数
  const handleFilePreview = (file) => {
    const currentFileRef = uploadedFiles.find((f) => f.id === file.id);
    setCurrentFile(currentFileRef);
    setMediaUrl({ url: file.url, type: file.type });
  };

  // 修改批量转录函数
  const handleBatchTranscribe = async () => {
    if (isTranscribing) {
      setIsTranscribing(false); // 立即更新状态
      setAbortTranscribing(true);

      try {
        const response = await fetch('http://localhost:8000/api/stop-transcribe', {
          method: 'POST',
        });

        if (!response.ok) {
          throw new Error('停止转录失败');
        }

        // 只将正在转录的文件状态改为中断
        setUploadedFiles((prev) => prev.map((f) => (f.status === 'transcribing' ? { ...f, status: 'interrupted' } : f)));

        message.success('已停止转录');
      } catch (error) {
        console.error('Failed to stop transcription:', error);
        message.error('停止转录失败：' + error.message);
      } finally {
        setAbortTranscribing(false);
      }
      return;
    }

    if (selectedFiles.length === 0) {
      message.warning('请选需要转录的文件');
      return;
    }

    setIsTranscribing(true);
    setAbortTranscribing(false);
    message.loading('开始转录选中的文件...', 0);

    try {
      for (const fileId of selectedFiles) {
        // 检查是否已经请求中断
        if (abortTranscribing) {
          // 只将当前在转的文件状态改为中断
          setUploadedFiles((prev) => prev.map((f) => (f.status === 'transcribing' ? { ...f, status: 'interrupted' } : f)));
          break;
        }

        const file = uploadedFiles.find((f) => f.id === fileId);
        if (!file) continue;

        // 修改这里：只跳过已完成的文件，允许中断状态的文件重新转录
        if (file.status === 'done') {
          message.info(`文件 "${file.name}" 已经转录完成，跳过此文件。`);
          continue;
        }

        // 更新文件状态为转录中
        setUploadedFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: 'transcribing' } : f)));

        try {
          let response;

          // 检查是否是下载的文件
          if (file.isDownloaded) {
            // 对于下载的文件，直接使用文件路径进行转录
            response = await fetch('http://localhost:8000/api/transcribe-downloaded', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                filename: file.name,
                file_path: file.url.replace('http://localhost:8000/', ''),
              }),
            });
          } else {
            // 对于上传的文件，使用原有的FormData方式
            const formData = new FormData();
            formData.append('file', file.file, file.name);

            response = await fetch('http://localhost:8000/api/upload', {
              method: 'POST',
              body: formData,
            });
          }

          const data = await response.json();

          if (response.status === 499) {
            // 处理转录中断的情况，只更新当前文件状态
            setUploadedFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: 'interrupted' } : f)));
            break; // 中断后续文件的转录
          }

          if (!response.ok) {
            throw new Error(`转录失败: ${file.name}`);
          }

          if (!abortTranscribing) {
            // 添加检查，确保没有中断请求
            setUploadedFiles((prev) => {
              const newFiles = prev.map((f) =>
                f.id === fileId
                  ? {
                      ...f,
                      status: 'done',
                      transcription: data.transcription,
                    }
                  : f
              );
              return newFiles;
            });

            if (currentFile?.id === fileId) {
              setCurrentFile((prev) => ({
                ...prev,
                status: 'done',
                transcription: data.transcription,
              }));
            }
          }
        } catch (error) {
          if (!abortTranscribing) {
            // 添加检查，确保没有中断请求
            setUploadedFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: 'error' } : f)));
            message.error(`文件 "${file.name}" 转录失败：${error.message}`);
          }
        }
      }
    } catch (error) {
      console.error('Transcription failed:', error);
      message.error('转录失败：' + error.message);
    } finally {
      setIsTranscribing(false);
      setAbortTranscribing(false);
      message.destroy();
    }
  };

  // 检查是否有转录结果的函数
  const checkTranscription = () => {
    if (!currentFile?.transcription || currentFile.transcription.length === 0) {
      message.warning('需等待视频/音频完成转录');
      return false;
    }
    return true;
  };

  // 下载相关函数
  const handleDownloadVideo = async () => {
    if (!downloadUrls.trim()) {
      message.error('请输入视频URL');
      return;
    }

    try {
      setIsDownloading(true);

      // 解析多个URL（按行分割）
      const urls = downloadUrls
        .split('\n')
        .map((url) => url.trim())
        .filter((url) => url.length > 0);

      if (urls.length === 0) {
        message.error('请输入有效的视频URL');
        return;
      }

      let successCount = 0;
      let failCount = 0;

      // 批量启动下载任务
      for (const url of urls) {
        try {
          const response = await fetch('http://localhost:8000/api/download-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: url,
              filename: null, // 批量下载时使用默认文件名
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || '下载失败');
          }

          const data = await response.json();
          const taskId = data.task_id;

          // 添加到下载任务列表
          setDownloadTasks(
            (prev) =>
              new Map(
                prev.set(taskId, {
                  id: taskId,
                  url: url,
                  filename: '获取中...',
                  status: 'pending',
                  progress: 0,
                  speed: '0 B/s',
                  eta: 'Unknown',
                  autoTranscribe: autoTranscribe, // 标记是否需要自动转录
                })
              )
          );

          // 开始轮询下载进度
          pollDownloadProgress(taskId);
          successCount++;
        } catch (error) {
          console.error(`Download failed for ${url}:`, error);
          message.error(`URL ${url} 下载启动失败：${error.message}`);
          failCount++;
        }
      }

      // 清空输入框并关闭模态框
      setDownloadUrls('');
      setDownloadModalVisible(false);

      if (successCount > 0) {
        message.success(`成功启动 ${successCount} 个下载任务${failCount > 0 ? `，${failCount} 个失败` : ''}`);
      }
    } catch (error) {
      console.error('Batch download failed:', error);
      message.error('批量下载失败：' + error.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const pollDownloadProgress = async (taskId) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/download-progress/${taskId}`);

        if (!response.ok) {
          clearInterval(pollInterval);
          return;
        }

        const progress = await response.json();

        // 更新下载任务状态
        setDownloadTasks((prev) => {
          const newTasks = new Map(prev);
          newTasks.set(taskId, {
            ...newTasks.get(taskId),
            status: progress.status,
            progress: progress.progress,
            speed: progress.speed,
            eta: progress.eta,
            filename: progress.filename || newTasks.get(taskId)?.filename,
            error_message: progress.error_message,
          });
          return newTasks;
        });

        // 如果下载完成，停止轮询并处理文件
        if (progress.status === 'completed') {
          clearInterval(pollInterval);
          await handleDownloadCompleted(taskId, progress);
        } else if (progress.status === 'failed' || progress.status === 'cancelled') {
          clearInterval(pollInterval);
          if (progress.status === 'failed') {
            message.error(`下载失败: ${progress.error_message || '未知错误'}`);
          }
        }
      } catch (error) {
        console.error('Failed to poll download progress:', error);
        clearInterval(pollInterval);
      }
    }, 2000); // 每2秒检查一次
  };

  const handleDownloadCompleted = async (taskId, progress) => {
    try {
      // 获取下载任务信息
      const task = downloadTasks.get(taskId);
      const shouldAutoTranscribe = task?.autoTranscribe || false;

      // 创建一个虚拟文件对象来模拟上传的文件
      const downloadedFile = {
        id: `downloaded-${taskId}-${Date.now()}`,
        name: progress.filename,
        type:
          progress.filename.toLowerCase().includes('.mp4') ||
          progress.filename.toLowerCase().includes('.avi') ||
          progress.filename.toLowerCase().includes('.mov') ||
          progress.filename.toLowerCase().includes('.mkv')
            ? 'video'
            : 'audio',
        url: `http://localhost:8000/uploads/${progress.filename}`,
        file: null, // 下载的文件没有原始File对象
        status: shouldAutoTranscribe ? 'transcribing' : 'waiting',
        transcription: null,
        summary: '',
        detailedSummary: '',
        mindmapData: null,
        isDownloaded: true, // 标记为下载的文件
        downloadTaskId: taskId,
      };

      setUploadedFiles((prev) => [...prev, downloadedFile]);

      // 如果是第一个文件，自动设置为当前预览文件
      if (uploadedFiles.length === 0) {
        setCurrentFile(downloadedFile);
        setMediaUrl({ url: downloadedFile.url, type: downloadedFile.type });
      }

      message.success(`视频下载完成: ${progress.filename}`);

      // 如果启用了自动转录，立即开始转录
      if (shouldAutoTranscribe) {
        startTranscription(downloadedFile);
      }
    } catch (error) {
      console.error('Failed to handle download completion:', error);
      message.error('处理下载完成事件失败');
    }
  };

  const handleCancelDownload = async (taskId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/cancel-download/${taskId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('取消下载失败');
      }

      message.success('下载任务已取消');
    } catch (error) {
      console.error('Failed to cancel download:', error);
      message.error('取消下载失败：' + error.message);
    }
  };

  // 优化后的直接转录函数
  const startTranscription = async (fileData) => {
    // 检查是否已经在转录中
    if (transcribingFiles.has(fileData.id)) {
      return;
    }

    try {
      // 标记为转录中
      setTranscribingFiles((prev) => new Set([...prev, fileData.id]));

      // 更新文件状态为转录中
      setUploadedFiles((prev) => prev.map((f) => (f.id === fileData.id ? { ...f, status: 'transcribing' } : f)));

      message.info(`开始转录: ${fileData.name}`);

      const response = await fetch('http://localhost:8000/api/transcribe-downloaded', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: fileData.name,
          file_path: `uploads/${fileData.name}`,
        }),
      });

      const data = await response.json();

      if (response.status === 499) {
        // 处理转录中断
        setUploadedFiles((prev) => prev.map((f) => (f.id === fileData.id ? { ...f, status: 'interrupted' } : f)));
        message.warning(`转录被中断: ${fileData.name}`);
      } else if (!response.ok) {
        throw new Error(data.detail || `转录失败: ${fileData.name}`);
      } else {
        // 转录成功
        setUploadedFiles((prev) => prev.map((f) => (f.id === fileData.id ? { ...f, status: 'done', transcription: data.transcription } : f)));

        // 如果是当前文件，也要更新currentFile
        if (currentFile?.id === fileData.id) {
          setCurrentFile((prev) => ({
            ...prev,
            status: 'done',
            transcription: data.transcription,
          }));
        }

        message.success(`转录完成: ${fileData.name}`);
      }
    } catch (error) {
      console.error('Transcription failed:', error);
      setUploadedFiles((prev) => prev.map((f) => (f.id === fileData.id ? { ...f, status: 'error' } : f)));
      message.error(`转录失败: ${error.message}`);
    } finally {
      // 移除转录中标记
      setTranscribingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fileData.id);
        return newSet;
      });
    }
  };

  // 修改简单总结函数
  const handleSummary = async () => {
    if (!checkTranscription()) return;
    if (!currentFile) return;

    const fileId = currentFile.id;

    if (summaryLoadingFiles.has(fileId)) {
      message.warning('该文件正在生成总结，请稍候');
      return;
    }

    const text = currentFile.transcription.map((item) => item.text).join('\n');
    try {
      setSummaryLoadingFiles((prev) => new Set([...prev, fileId]));

      // 找到文件在 uploadedFiles 中的引用
      const fileRef = uploadedFiles.find((f) => f.id === fileId);
      if (!fileRef) return;

      // 初始化内容
      fileRef.summary = '';
      // 强制更新 uploadedFiles 以触发重渲染
      setUploadedFiles([...uploadedFiles]);

      const response = await fetch('http://localhost:8000/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, stream: useStreamResponse }),
      });

      if (!response.ok) {
        throw new Error('生成总结失败');
      }

      if (useStreamResponse) {
        // 流式响应处理
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let summaryText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          summaryText += chunk;

          // 直接更新文件引用中的内容
          fileRef.summary = summaryText;
          // 强制更新 uploadedFiles 以触发重渲染
          setUploadedFiles([...uploadedFiles]);
          // 如果是当前文件，也要更新currentFile
          if (currentFile?.id === fileId) {
            setCurrentFile((prev) => ({ ...prev, summary: summaryText }));
          }
        }
      } else {
        // 非流式响应处理
        const data = await response.json();
        fileRef.summary = data.summary;
        // 强制更新 uploadedFiles 以触发重渲染
        setUploadedFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, summary: data.summary } : f)));
        // 如果是当前文件，也要更新currentFile
        if (currentFile?.id === fileId) {
          setCurrentFile((prev) => ({ ...prev, summary: data.summary }));
        }
      }
    } catch (error) {
      console.error('Summary generation failed:', error);
      message.error('生成总结失败：' + error.message);
    } finally {
      setSummaryLoadingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    }
  };

  // 修改生成思维导图的函数
  const handleMindmap = async () => {
    if (!checkTranscription()) return;
    if (!currentFile) return;

    const fileId = currentFile.id; // 保存当前文件ID

    // 检查当前文件是否正在生成思维导图
    if (mindmapLoadingFiles.has(fileId)) {
      message.warning('该文件正在生成思维导图，请稍候');
      return;
    }

    const text = currentFile.transcription.map((item) => item.text).join('\n');
    try {
      // 将当前文件添加到正在生成的集合中
      setMindmapLoadingFiles((prev) => new Set([...prev, fileId]));

      // 找到文件在 uploadedFiles 中的引用
      const fileRef = uploadedFiles.find((f) => f.id === fileId);
      if (!fileRef) return;

      // 初始化内容
      fileRef.mindmapData = null;
      // 强制更新 uploadedFiles 以触发重渲染
      setUploadedFiles([...uploadedFiles]);

      const response = await fetch('http://localhost:8000/api/mindmap-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text }),
      });

      if (!response.ok) {
        throw new Error('生成思维导图失败');
      }

      const data = await response.json();

      // 更新文件对象中的思维导图数据（图片URL）
      fileRef.mindmapData = data.image_url;
      // 强制更新 uploadedFiles 以触发重渲染
      setUploadedFiles([...uploadedFiles]);
    } catch (error) {
      console.error('Failed to generate mindmap:', error);
      message.error('生成思维导图失败：' + error.message);
    } finally {
      // 从正在生成的集合中移除当前文件
      setMindmapLoadingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    }
  };

  // 在组件卸载时清理
  useEffect(() => {
    return () => {
      if (jmInstanceRef.current) {
        jmInstanceRef.current = null;
      }
    };
  }, []);

  // 修改 jsMind 的初始化和主题注册
  useEffect(() => {
    // 创建自定义主题
    const customTheme = {
      'background': '#fff',
      'color': '#333',

      'main-color': '#333',
      'main-radius': '4px',
      'main-background-color': '#f0f2f5',
      'main-padding': '10px',
      'main-margin': '0px',
      'main-font-size': '16px',
      'main-font-weight': 'bold',

      'sub-color': '#333',
      'sub-radius': '4px',
      'sub-background-color': '#fff',
      'sub-padding': '8px',
      'sub-margin': '0px',
      'sub-font-size': '14px',
      'sub-font-weight': 'normal',

      'line-width': '2px',
      'line-color': '#558B2F',
    };

    // 册主和样式
    if (jsMind.hasOwnProperty('register_theme')) {
      jsMind.register_theme('primary', customTheme);
    } else if (jsMind.hasOwnProperty('util') && jsMind.util.hasOwnProperty('register_theme')) {
      jsMind.util.register_theme('primary', customTheme);
    }

    // 注册节点式
    const nodeStyles = {
      important: {
        'background-color': '#e6f7ff',
        'border-radius': '4px',
        'padding': '4px 8px',
        'border': '1px solid #91d5ff',
      },
    };

    if (jsMind.hasOwnProperty('register_node_style')) {
      Object.keys(nodeStyles).forEach((style) => {
        jsMind.register_node_style(style, nodeStyles[style]);
      });
    } else if (jsMind.hasOwnProperty('util') && jsMind.util.hasOwnProperty('register_node_style')) {
      Object.keys(nodeStyles).forEach((style) => {
        jsMind.util.register_node_style(style, nodeStyles[style]);
      });
    }
  }, []);

  // 修改发送消息函数
  const handleSendMessage = async () => {
    // 如果正在生成，则停止生成
    if (isGenerating) {
      abortController.current?.abort();
      setIsGenerating(false);
      // 更新最后一条息为"已停止生成"
      setMessages((prevMessages) => {
        const newMessages = [...prevMessages];
        if (newMessages.length > 0) {
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.role === 'assistant') {
            lastMessage.content += '\n\n*[已停止生成]*';
          }
        }
        return newMessages;
      });
      return;
    }

    // 检查转录和输入
    if (!checkTranscription()) return;
    if (!inputMessage.trim()) {
      message.warning('请输入消息内容');
      return;
    }

    const newMessage = { role: 'user', content: inputMessage };
    const currentMessages = [...messages, newMessage];
    setMessages(currentMessages);
    setInputMessage('');
    setIsGenerating(true);

    // 创建新的 AbortController
    abortController.current = new AbortController();

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages,
          context: currentFile?.transcription.map((item) => item.text).join('\n'),
          stream: useStreamResponse,
        }),
        signal: abortController.current.signal,
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      if (useStreamResponse) {
        // 流式响应处理
        const reader = response.body.getReader();
        let aiResponse = '';

        // 创建 AI 消息占位
        setMessages([...currentMessages, { role: 'assistant', content: '' }]);

        while (true) {
          try {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            aiResponse += chunk;

            setMessages([...currentMessages, { role: 'assistant', content: aiResponse }]);
          } catch (error) {
            if (error.name === 'AbortError') {
              // 在被中断时立即退出循环
              break;
            }
            throw error;
          }
        }
      } else {
        // 非流式响应处理
        const data = await response.json();
        setMessages([...currentMessages, { role: 'assistant', content: data.response }]);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        message.info('已停止生成');
      } else {
        console.error('Error sending message:', error);
        message.error('发送消息失败：' + error.message);
      }
    } finally {
      setIsGenerating(false);
      abortController.current = null;
    }
  };

  // 添加时点转函数
  const handleTimeClick = (time) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = time;
      mediaRef.current.play();
    }
  };

  // 添加时间格式化函数
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 定义表格列
  const transcriptionColumns = [
    {
      title: '时间点',
      dataIndex: 'time',
      key: 'time',
      width: '30%',
      render: (_, record) => (
        <Button type='link' onClick={() => handleTimeClick(record.start)} style={{ padding: 0 }}>
          [{formatTime(record.start)} - {formatTime(record.end)}]
        </Button>
      ),
    },
    {
      title: '内容',
      dataIndex: 'text',
      key: 'text',
    },
  ];

  // 修改导出函数
  const handleExport = async (format) => {
    // 查是否有选中的文件
    if (selectedFiles.length === 0) {
      message.warning('请选择需要导出的文件');
      return;
    }

    try {
      // 显示导进度
      message.loading('正在导出选中的文件...', 0);

      // 遍历选中的文件
      for (const fileId of selectedFiles) {
        const file = uploadedFiles.find((f) => f.id === fileId);

        // 检查文件是否有转录结果
        if (!file || !file.transcription || file.transcription.length === 0) {
          message.warning(`文件 "${file?.name}" 没有转录结果，已跳过`);
          continue;
        }

        try {
          const response = await fetch(`http://localhost:8000/api/export/${format}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(file.transcription),
          });

          if (!response.ok) {
            throw new Error(`导出失败: ${file.name}`);
          }

          // 获取文件名
          const contentDisposition = response.headers.get('content-disposition');
          let filename = `${file.name.replace(/\.[^/.]+$/, '')}_transcription.${format}`;
          if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
            if (filenameMatch) {
              filename = filenameMatch[1];
            }
          }

          // 下载文件
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          message.success(`文件 "${file.name}" 导出成功`);
        } catch (error) {
          message.error(`文件 "${file.name}" 导出失败：${error.message}`);
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
      message.error('导出失败：' + error.message);
    } finally {
      message.destroy(); // 清除loading息
    }
  };

  // 修改详细总结函数
  const handleDetailedSummary = async () => {
    if (!checkTranscription()) return;
    if (!currentFile) return;

    const fileId = currentFile.id;

    if (detailedSummaryLoadingFiles.has(fileId)) {
      message.warning('该文件正在生成详细总结，请稍候');
      return;
    }

    const text = currentFile.transcription.map((item) => item.text).join('\n');
    try {
      setDetailedSummaryLoadingFiles((prev) => new Set([...prev, fileId]));

      // 找到文件在 uploadedFiles 中的引用
      const fileRef = uploadedFiles.find((f) => f.id === fileId);
      if (!fileRef) return;

      // 初始化内容
      fileRef.detailedSummary = '';
      // 强制更新 uploadedFiles 以触发重渲染
      setUploadedFiles([...uploadedFiles]);

      const response = await fetch('http://localhost:8000/api/detailed-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, stream: useStreamResponse }),
      });

      if (!response.ok) {
        throw new Error('生成详细总结失败');
      }

      if (useStreamResponse) {
        // 流式响应处理
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let summaryText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          summaryText += chunk;

          // 直接更新文件引用中的内容
          fileRef.detailedSummary = summaryText;
          // 强制更新 uploadedFiles 以触发重渲染
          setUploadedFiles([...uploadedFiles]);
          // 如果是当前文件，也要更新currentFile
          if (currentFile?.id === fileId) {
            setCurrentFile((prev) => ({ ...prev, detailedSummary: summaryText }));
          }
        }
      } else {
        // 非流式响应处理
        const data = await response.json();
        fileRef.detailedSummary = data.detailed_summary;
        // 强制更新 uploadedFiles 以触发重渲染
        setUploadedFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, detailedSummary: data.detailed_summary } : f)));
        // 如果是当前文件，也要更新currentFile
        if (currentFile?.id === fileId) {
          setCurrentFile((prev) => ({ ...prev, detailedSummary: data.detailed_summary }));
        }
      }
    } catch (error) {
      console.error('Detailed summary generation failed:', error);
      message.error('生成详细总结失败：' + error.message);
    } finally {
      setDetailedSummaryLoadingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    }
  };

  // 添加导出总结函数
  const handleExportSummary = async (summaryText, type = 'summary') => {
    if (!summaryText) {
      message.warning('没有可导出的内容');
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/export/summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(summaryText),
      });

      if (!response.ok) {
        throw new Error('导出失败');
      }

      // 下载文件
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_${new Date().toISOString().slice(0, 10)}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      message.success('导出成功');
    } catch (error) {
      console.error('Export failed:', error);
      message.error('导出失败：' + error.message);
    }
  };

  // 添加复制功能
  const handleCopyMessage = (content) => {
    navigator.clipboard
      .writeText(content)
      .then(() => {
        message.success('复制成功');
      })
      .catch(() => {
        message.error('复制失败');
      });
  };

  // 添加滚动处理函数
  const handleScroll = (e) => {
    const element = e.target;
    const isScrolledToBottom = Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 10;
    setIsUserScrolling(!isScrolledToBottom);
  };

  // 添加滚动到底部的函数
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current && !isUserScrolling) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isUserScrolling]);

  // 监听消息变化，自动滚动
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 添加全部删除的处理函数
  const handleDeleteAll = () => {
    if (selectedFiles.length === 0) {
      message.warning('请选择需要删除的文件');
      return;
    }

    // 删除选中的文件
    setUploadedFiles((prev) => prev.filter((file) => !selectedFiles.includes(file.id)));
    setSelectedFiles([]); // 清空选中状态

    // 如果当前预览的文件被删除，则切换到第一个可用文件
    if (currentFile && selectedFiles.includes(currentFile.id)) {
      const remainingFiles = uploadedFiles.filter((file) => !selectedFiles.includes(file.id));
      const nextFile = remainingFiles[0];
      if (nextFile) {
        setCurrentFile(nextFile);
        setMediaUrl({ url: nextFile.url, type: nextFile.type });
      } else {
        setCurrentFile(null);
        setMediaUrl(null);
      }
    }

    message.success('已删除选中的文件');
  };

  // 添加一个函数来计算选中的已转录文件数量
  const getSelectedTranscribedFilesCount = () => {
    return uploadedFiles.filter((file) => selectedFiles.includes(file.id) && file.status === 'done').length;
  };

  // 修改标签页内容
  const tabItems = [
    {
      key: '1',
      label: '转录结果',
      children: (
        <div className='tab-content'>
          <div className='export-section'>
            <div className='selection-tip'>{selectedFiles.length > 0 && <span>已选择 {getSelectedTranscribedFilesCount()} 个转录文件</span>}</div>
            <div className='export-buttons'>
              <Button.Group size='small'>
                <Button onClick={() => handleExport('vtt')} icon={<DownloadOutlined />} disabled={!currentFile?.transcription}>
                  VTT
                </Button>
                <Button onClick={() => handleExport('srt')} icon={<DownloadOutlined />} disabled={!currentFile?.transcription}>
                  SRT
                </Button>
                <Button onClick={() => handleExport('txt')} icon={<DownloadOutlined />} disabled={!currentFile?.transcription}>
                  TXT
                </Button>
              </Button.Group>
            </div>
          </div>
          {!currentFile ? (
            <div className='empty-state'>
              <p>请在左侧选择要查看转录结果的文件</p>
            </div>
          ) : (
            <>
              {currentFile && (
                <div className='current-file-tip'>
                  <span>当前文件：{currentFile.name}</span>
                </div>
              )}
              {!currentFile.transcription ? (
                <div className='empty-state'>
                  <p>当前文件尚未完成转录</p>
                </div>
              ) : (
                <Table
                  dataSource={currentFile.transcription.map((item, index) => ({
                    ...item,
                    key: index,
                  }))}
                  columns={transcriptionColumns}
                  pagination={false}
                  size='small'
                  className='transcription-table full-height'
                />
              )}
            </>
          )}
        </div>
      ),
    },
    {
      key: '2',
      label: '简单总结',
      children: (
        <div className='tab-content'>
          {currentFile && (
            <div className='current-file-tip'>
              <span>当前文件：{currentFile.name}</span>
            </div>
          )}
          <div className='button-group'>
            <Button onClick={handleSummary} loading={summaryLoadingFiles.has(currentFile?.id)} disabled={!currentFile?.transcription || summaryLoadingFiles.has(currentFile?.id)}>
              {summaryLoadingFiles.has(currentFile?.id) ? '生成中...' : '生成总结'}
            </Button>
            <Button onClick={() => handleExportSummary(currentFile?.summary)} icon={<DownloadOutlined />} disabled={!currentFile?.summary}>
              导出总结
            </Button>
          </div>
          {!currentFile ? (
            <div className='empty-state'>
              <p>请在左侧选择要查看总结的文件</p>
            </div>
          ) : !currentFile.transcription ? (
            <div className='empty-state'>
              <p>当前文件尚未完成转录</p>
            </div>
          ) : !currentFile.summary && !summaryLoadingFiles.has(currentFile.id) ? (
            <div className='empty-state'>
              <p>点击上方按钮生成简单总结</p>
            </div>
          ) : (
            <SummaryContent fileId={currentFile.id} content={currentFile.summary} isLoading={summaryLoadingFiles.has(currentFile.id)} />
          )}
        </div>
      ),
    },
    {
      key: '3',
      label: '详细总结',
      children: (
        <div className='tab-content'>
          {currentFile && (
            <div className='current-file-tip'>
              <span>当前文件：{currentFile.name}</span>
            </div>
          )}
          <div className='button-group'>
            <Button
              onClick={handleDetailedSummary}
              loading={detailedSummaryLoadingFiles.has(currentFile?.id)}
              disabled={!currentFile?.transcription || detailedSummaryLoadingFiles.has(currentFile?.id)}>
              {detailedSummaryLoadingFiles.has(currentFile?.id) ? '生成中...' : '生成详细总结'}
            </Button>
            <Button onClick={() => handleExportSummary(currentFile?.detailedSummary, 'detailed_summary')} icon={<DownloadOutlined />} disabled={!currentFile?.detailedSummary}>
              导出总结
            </Button>
          </div>
          {!currentFile ? (
            <div className='empty-state'>
              <p>请在左侧选择要查看详细总结的文件</p>
            </div>
          ) : !currentFile.transcription ? (
            <div className='empty-state'>
              <p>当前文件尚未完成转录</p>
            </div>
          ) : !currentFile.detailedSummary && !detailedSummaryLoadingFiles.has(currentFile.id) ? (
            <div className='empty-state'>
              <p>点击上方按钮生成详细总结</p>
            </div>
          ) : (
            <DetailedSummaryContent fileId={currentFile.id} content={currentFile.detailedSummary} isLoading={detailedSummaryLoadingFiles.has(currentFile.id)} />
          )}
        </div>
      ),
    },
    {
      key: '4',
      label: '思维导图',
      children: (
        <div className='tab-content'>
          {currentFile && (
            <div className='current-file-tip'>
              <span>当前文件：{currentFile.name}</span>
            </div>
          )}
          <Button onClick={handleMindmap} loading={mindmapLoadingFiles.has(currentFile?.id)} disabled={!currentFile?.transcription || mindmapLoadingFiles.has(currentFile?.id)}>
            {mindmapLoadingFiles.has(currentFile?.id) ? '生成中...' : '生成思维导图'}
          </Button>
          {!currentFile ? (
            <div className='empty-state'>
              <p>请在左侧选择要查看思维导图的文件</p>
            </div>
          ) : !currentFile.transcription ? (
            <div className='empty-state'>
              <p>当前文件尚未完成转录</p>
            </div>
          ) : !currentFile.mindmapData && !mindmapLoadingFiles.has(currentFile.id) ? (
            <div className='empty-state'>
              <p>点击上方按钮生成思维导图</p>
            </div>
          ) : (
            <MindmapContent fileId={currentFile.id} content={currentFile.mindmapData} isLoading={mindmapLoadingFiles.has(currentFile.id)} />
          )}
        </div>
      ),
    },
    {
      key: '5',
      label: '对话交互',
      children: (
        <div className='tab-content chat-tab'>
          {!currentFile ? (
            <div className='empty-state'>
              <p>请在左侧选择要查看对话交互的文件</p>
            </div>
          ) : !currentFile.transcription ? (
            <div className='empty-state'>
              <p>当前文件尚未完成转录</p>
            </div>
          ) : (
            <>
              <div className='current-file-tip'>
                <span>当前文件：{currentFile.name}</span>
              </div>
              <div className='chat-messages' onScroll={handleScroll}>
                {messages.map((msg, index) => (
                  <div key={index} className={`message-wrapper ${msg.role === 'user' ? 'user' : 'assistant'}`}>
                    <div className='message-bubble'>
                      <div className='message-content'>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      <Button type='text' className='copy-button' icon={<CopyOutlined />} onClick={() => handleCopyMessage(msg.content)}>
                        复制
                      </Button>
                    </div>
                    <div className='message-time'>{new Date().toLocaleTimeString()}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className='chat-input-area'>
                <TextArea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      if (!isComposing) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }
                  }}
                  placeholder='输入消息按Enter发送，Shift+Enter换行'
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  disabled={isGenerating}
                />
                <Button type='primary' icon={isGenerating ? <StopOutlined /> : <SendOutlined />} onClick={handleSendMessage} danger={isGenerating}>
                  {isGenerating ? '停止' : '发送'}
                </Button>
              </div>
            </>
          )}
        </div>
      ),
    },
  ];

  // 修改左侧标签页内容
  const leftTabItems = [
    {
      key: '1',
      label: '音视频预览',
      children: (
        <div className='tab-content'>
          <div className='preview-section'>
            {mediaUrl ? (
              <div className='media-preview'>
                {mediaUrl.type === 'video' ? (
                  <div className='video-container'>
                    <video ref={mediaRef} src={mediaUrl.url} controls className='video-player' />
                  </div>
                ) : (
                  <div className='audio-container'>
                    <div className='audio-placeholder'>
                      <SoundOutlined style={{ fontSize: '24px' }} />
                      <span>音频文件</span>
                    </div>
                    <audio ref={mediaRef} src={mediaUrl.url} controls className='audio-player' />
                  </div>
                )}
              </div>
            ) : (
              <div className='upload-placeholder'>
                <div className='placeholder-content'>
                  <div className='placeholder-icon'>
                    <UploadOutlined style={{ fontSize: '48px', color: '#999' }} />
                  </div>
                  <p>等待上传本地文件</p>
                </div>
              </div>
            )}
          </div>

          <div className='file-list-section'>
            <div className='section-header'>
              <div className='section-title'>
                <h3>文件列表</h3>
              </div>
              <div className='action-buttons'>
                <Button
                  onClick={() => {
                    const allFileIds = uploadedFiles.map((file) => file.id);
                    setSelectedFiles(allFileIds);
                  }}>
                  全选
                </Button>
                <Button onClick={() => setSelectedFiles([])}>取消全选</Button>
                <Button
                  type='primary'
                  danger
                  onClick={handleDeleteAll}
                  disabled={selectedFiles.length === 0 || selectedFiles.some((id) => uploadedFiles.find((f) => f.id === id)?.status === 'transcribing')}>
                  删除选中
                </Button>
                <Button type='primary' onClick={handleBatchTranscribe} disabled={selectedFiles.length === 0} danger={isTranscribing}>
                  {isTranscribing ? '停止转录' : '开始转录'}
                </Button>
              </div>
            </div>
            <Table
              rowSelection={{
                selectedRowKeys: selectedFiles,
                onChange: handleFileSelect,
                preserveSelectedRowKeys: true,
              }}
              dataSource={getPageData()} // 使用分页后的数据
              columns={fileColumns}
              rowKey='id'
              size='small'
              onRow={(record) => ({
                onClick: () => handleFilePreview(record),
                style: {
                  cursor: 'pointer',
                  background: currentFile?.id === record.id ? '#e6f7ff' : 'inherit',
                },
              })}
              pagination={false}
            />
            <div className='pagination-container'>
              <Pagination {...paginationConfig} total={uploadedFiles.length} />
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <div className='app-header' style={{ background: '#fff' }}>
        <div className='title'>
          <h1 style={{ color: '#000' }}>VideoChat：一键总结视频与音频内容｜帮助解读的 AI 助手</h1>
        </div>
        <div className='header-right'>
          <Button icon={<SettingOutlined />} onClick={() => setSettingsVisible(true)} style={{ marginRight: '16px' }}>
            设置
          </Button>
          <a href='https://github.com/Airmomo/VideoChat' target='_blank' rel='noopener noreferrer' className='github-link'>
            <GithubOutlined />
            <span className='author-info'>By Airmomo</span>
          </a>
        </div>
        <div className='upload-section'>
          <Upload beforeUpload={handleUpload} accept='video/*,audio/*' showUploadList={false} multiple={true} directory={false}>
            <Button icon={<UploadOutlined />}>上传本地文件</Button>
          </Upload>
          <Button icon={<LinkOutlined />} onClick={() => setDownloadModalVisible(true)} style={{ marginLeft: '8px' }}>
            下载在线视频
          </Button>
        </div>
        <div className='support-text'>支持多个视频和音频文件格式，以及在线视频下载</div>
      </div>

      <div className='app-content'>
        <div className='main-layout'>
          <div className='media-panel'>
            <Card className='media-card'>
              <Tabs items={leftTabItems} />
            </Card>
          </div>

          <div className='feature-panel'>
            <Card className='feature-card'>
              <Tabs items={tabItems} />
            </Card>
          </div>
        </div>
      </div>

      {/* 设置抽屉 */}
      <Drawer title='应用设置' placement='right' onClose={() => setSettingsVisible(false)} open={settingsVisible} width={400}>
        <Space direction='vertical' size='large' style={{ width: '100%' }}>
          <div>
            <h3>AI响应设置</h3>
            <div style={{ marginTop: '16px' }}>
              <Space align='center'>
                <span>启用流式响应：</span>
                <Switch checked={useStreamResponse} onChange={setUseStreamResponse} />
              </Space>
              <div style={{ marginTop: '8px', color: '#666', fontSize: '12px' }}>{useStreamResponse ? '✅ 流式响应：实时显示生成过程，体验更流畅' : '⚡ 非流式响应：等待完整结果，更稳定可靠'}</div>
            </div>
          </div>

          <div>
            <h3>功能说明</h3>
            <div style={{ color: '#666', fontSize: '14px', lineHeight: '1.6' }}>
              <p>
                <strong>流式响应：</strong>
              </p>
              <p>• 实时显示AI生成过程</p>
              <p>• 响应速度更快</p>
              <p>• 可以提前看到部分结果</p>

              <p style={{ marginTop: '16px' }}>
                <strong>非流式响应：</strong>
              </p>
              <p>• 等待完整结果后一次性显示</p>
              <p>• 网络不稳定时更可靠</p>
              <p>• 适合需要完整结果的场景</p>
            </div>
          </div>
        </Space>
      </Drawer>

      {/* 下载视频模态框 */}
      <Modal
        title='下载在线视频'
        open={downloadModalVisible}
        onOk={handleDownloadVideo}
        onCancel={() => setDownloadModalVisible(false)}
        confirmLoading={isDownloading}
        okText='开始下载'
        cancelText='取消'
        width={600}>
        <Space direction='vertical' size='middle' style={{ width: '100%' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>视频URL * （每行一个链接，支持批量下载）</label>
            <TextArea
              placeholder='请输入视频链接，每行一个（支持YouTube、Bilibili等平台）&#10;例如：&#10;https://www.youtube.com/watch?v=xxxxx&#10;https://www.bilibili.com/video/BVxxxxx'
              value={downloadUrls}
              onChange={(e) => setDownloadUrls(e.target.value)}
              rows={4}
              size='large'
            />
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <Switch checked={autoTranscribe} onChange={setAutoTranscribe} style={{ marginRight: '8px' }} />
              <span style={{ fontWeight: 'bold' }}>下载完成后自动转录</span>
            </label>
            <div style={{ color: '#666', fontSize: '12px', marginLeft: '32px' }}>开启后，视频下载完成将立即开始转录，无需手动操作</div>
          </div>
          <div style={{ color: '#666', fontSize: '12px' }}>
            <p>• 支持的平台：YouTube、Bilibili、以及其他主流视频网站</p>
            <p>• 支持的格式：MP4、WebM、MKV等常见视频格式</p>
            <p>• 支持批量下载：每行输入一个视频链接</p>
            <p>• 下载完成后将自动添加到文件列表中</p>
          </div>
        </Space>
      </Modal>

      {/* 下载进度显示 */}
      {(downloadTasks.size > 0 || transcribingFiles.size > 0) && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '350px',
            maxHeight: '400px',
            overflowY: 'auto',
            backgroundColor: '#fff',
            border: '1px solid #d9d9d9',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
          }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
            <h4 style={{ margin: 0 }}>
              下载任务
              {transcribingFiles.size > 0 && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#1890ff' }}>(转录中: {transcribingFiles.size})</span>}
            </h4>
          </div>
          <div style={{ padding: '8px' }}>
            {Array.from(downloadTasks.values()).map((task) => (
              <div
                key={task.id}
                style={{
                  padding: '12px',
                  borderBottom: '1px solid #f0f0f0',
                  backgroundColor: task.status === 'completed' ? '#f6ffed' : task.status === 'failed' ? '#fff2f0' : '#fff',
                }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 'bold',
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                    {task.filename}
                  </span>
                  {(task.status === 'downloading' || task.status === 'pending') && <Button type='text' size='small' icon={<CloseOutlined />} onClick={() => handleCancelDownload(task.id)} />}
                </div>

                {task.status === 'downloading' && (
                  <>
                    <Progress percent={Math.round(task.progress)} size='small' status='active' />
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        color: '#666',
                        marginTop: '4px',
                      }}>
                      <span>{task.speed}</span>
                      <span>剩余: {task.eta}</span>
                    </div>
                  </>
                )}

                {task.status === 'pending' && <div style={{ fontSize: '12px', color: '#1890ff' }}>等待开始下载...</div>}

                {task.status === 'completed' && <div style={{ fontSize: '12px', color: '#52c41a' }}>✅ 下载完成</div>}

                {task.status === 'failed' && <div style={{ fontSize: '12px', color: '#ff4d4f' }}>❌ 下载失败: {task.error_message}</div>}

                {task.status === 'cancelled' && <div style={{ fontSize: '12px', color: '#faad14' }}>⏸️ 已取消</div>}
              </div>
            ))}

            {/* 转录状态显示 */}
            {transcribingFiles.size > 0 && (
              <>
                <div
                  style={{
                    padding: '8px 12px',
                    borderTop: '1px solid #f0f0f0',
                    backgroundColor: '#f8f9fa',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: '#666',
                  }}>
                  转录状态
                </div>

                {/* 正在转录的文件 */}
                {uploadedFiles
                  .filter((file) => file.status === 'transcribing')
                  .map((file) => (
                    <div
                      key={`transcribing-${file.id}`}
                      style={{
                        padding: '12px',
                        borderBottom: '1px solid #f0f0f0',
                        backgroundColor: '#e6f7ff',
                      }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '8px',
                        }}>
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: 'bold',
                            maxWidth: '200px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                          {file.name}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#1890ff' }}>🎯 正在转录中...</div>
                    </div>
                  ))}
              </>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}

export default App;
