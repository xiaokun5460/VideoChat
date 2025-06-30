/**
 * 现代化文件管理器
 * 高端、友好、直观的文件管理界面
 */

import React, { useState } from 'react';
import {
  Upload,
  Button,
  Card,
  Progress,
  Tag,
  Tooltip,
  Empty,
  Space,
  Dropdown
} from 'antd';
import {
  PlayCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
  AudioOutlined,
  MoreOutlined,
  CloudUploadOutlined,
  CheckCircleOutlined,
  SyncOutlined
} from '@ant-design/icons';
import './ModernFileManager.css';

const { Dragger } = Upload;

const ModernFileManager = ({
  files = [],
  onFileUpload,
  onFileDelete,
  onFileSelect,
  onTranscribe,
  selectedFiles = [],
  transcribingFiles = new Set(),
  className = ''
}) => {
  const [dragOver, setDragOver] = useState(false);

  // 文件类型图标映射
  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext)) {
      return <VideoCameraOutlined className="file-icon video" />;
    }
    if (['mp3', 'wav', 'flac', 'aac', 'm4a'].includes(ext)) {
      return <AudioOutlined className="file-icon audio" />;
    }
    return <FileTextOutlined className="file-icon document" />;
  };

  // 文件大小格式化
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 获取文件状态
  const getFileStatus = (file) => {
    if (transcribingFiles.has(file.name)) {
      return { status: 'processing', text: '转录中', color: 'processing' };
    }
    if (file.transcription) {
      return { status: 'done', text: '已完成', color: 'success' };
    }
    return { status: 'waiting', text: '待处理', color: 'default' };
  };

  // 文件操作菜单
  const getFileActions = (file) => [
    {
      key: 'transcribe',
      label: '开始转录',
      icon: <PlayCircleOutlined />,
      disabled: transcribingFiles.has(file.name) || file.transcription,
      onClick: () => onTranscribe(file)
    },
    {
      key: 'download',
      label: '下载文件',
      icon: <DownloadOutlined />,
      onClick: () => {
        const link = document.createElement('a');
        link.href = file.url;
        link.download = file.name;
        link.click();
      }
    },
    {
      type: 'divider'
    },
    {
      key: 'delete',
      label: '删除文件',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => onFileDelete(file)
    }
  ];

  // 上传配置
  const uploadProps = {
    name: 'file',
    multiple: true,
    accept: '.mp4,.avi,.mov,.mkv,.webm,.mp3,.wav,.flac,.aac,.m4a',
    showUploadList: false,
    customRequest: ({ file, onSuccess, onError }) => {
      onFileUpload(file, onSuccess, onError);
    },
    onDrop: () => setDragOver(false),
    onDragEnter: () => setDragOver(true),
    onDragLeave: () => setDragOver(false),
  };

  return (
    <div className={`modern-file-manager ${className}`}>
      {/* 上传区域 */}
      <Card className="upload-card glass" variant="outlined">
        <Dragger 
          {...uploadProps} 
          className={`modern-uploader ${dragOver ? 'drag-over' : ''}`}
        >
          <div className="upload-content">
            <div className="upload-icon">
              <CloudUploadOutlined />
            </div>
            <h3 className="upload-title">拖拽文件到这里</h3>
            <p className="upload-description">
              支持视频和音频文件
            </p>
            <Button type="primary" className="upload-btn">
              选择文件
            </Button>
          </div>
        </Dragger>
      </Card>

      {/* 文件列表 */}
      <div className="file-list-container">
        <div className="file-list-header">
          <h3 className="list-title">文件列表</h3>
          <div className="list-stats">
            <Tag color="blue">{files.length} 个文件</Tag>
            <Tag color="green">{files.filter(f => f.transcription).length} 已完成</Tag>
          </div>
        </div>

        {files.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无文件"
            className="empty-state"
          />
        ) : (
          <div className="file-list">
            {files.map((file, index) => {
              const status = getFileStatus(file);
              const isSelected = selectedFiles.includes(file.name);
              const isTranscribing = transcribingFiles.has(file.name);

              return (
                <Card
                  key={file.name}
                  className={`file-item ${isSelected ? 'selected' : ''} ${isTranscribing ? 'transcribing' : ''}`}
                  hoverable
                  onClick={() => onFileSelect(file)}
                  variant="outlined"
                >
                  <div className="file-content">
                    <div className="file-info">
                      <div className="file-icon-wrapper">
                        {getFileIcon(file.name)}
                        {status.status === 'done' && (
                          <CheckCircleOutlined className="status-overlay success" />
                        )}
                        {isTranscribing && (
                          <SyncOutlined className="status-overlay processing" spin />
                        )}
                      </div>
                      
                      <div className="file-details">
                        <Tooltip title={file.name}>
                          <h4 className="file-name">{file.name}</h4>
                        </Tooltip>
                        <div className="file-meta">
                          <span className="file-size">{formatFileSize(file.size)}</span>
                          <Tag color={status.color} size="small">
                            {status.text}
                          </Tag>
                        </div>
                      </div>
                    </div>

                    <div className="file-actions">
                      {isTranscribing && (
                        <Progress
                          type="circle"
                          size={32}
                          percent={75}
                          showInfo={false}
                          strokeColor={{
                            '0%': '#6366f1',
                            '100%': '#8b5cf6',
                          }}
                        />
                      )}
                      
                      <Dropdown
                        menu={{ items: getFileActions(file) }}
                        trigger={['click']}
                        placement="bottomRight"
                      >
                        <Button
                          type="text"
                          icon={<MoreOutlined />}
                          className="action-btn"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Dropdown>
                    </div>
                  </div>

                  {/* 转录进度条 */}
                  {isTranscribing && (
                    <div className="transcription-progress">
                      <Progress
                        percent={75}
                        size="small"
                        strokeColor={{
                          '0%': '#6366f1',
                          '100%': '#8b5cf6',
                        }}
                        showInfo={false}
                      />
                      <span className="progress-text">正在转录...</span>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 批量操作 */}
      {selectedFiles.length > 0 && (
        <Card className="batch-actions glass" variant="outlined">
          <div className="batch-content">
            <div className="batch-info">
              <span>已选择 {selectedFiles.length} 个文件</span>
            </div>
            <Space>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => {
                  selectedFiles.forEach(fileName => {
                    const file = files.find(f => f.name === fileName);
                    if (file && !transcribingFiles.has(fileName) && !file.transcription) {
                      onTranscribe(file);
                    }
                  });
                }}
              >
                批量转录
              </Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => {
                  selectedFiles.forEach(fileName => {
                    const file = files.find(f => f.name === fileName);
                    if (file) onFileDelete(file);
                  });
                }}
              >
                批量删除
              </Button>
            </Space>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ModernFileManager;
