/**
 * 现代化下载管理器
 * 高端、友好、直观的下载管理界面
 */

import React, { useState } from 'react';
import {
  Card,
  Button,
  Input,
  Progress,
  Tag,
  Space,
  Switch,
  Tooltip,
  Empty,
  Divider,
  Modal,
  List,
  Typography
} from 'antd';
import {
  DownloadOutlined,
  StopOutlined,
  ClearOutlined,
  LinkOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useDownloadManager } from '../../hooks/useDownloadManager';
import './DownloadManager.css';

const { TextArea } = Input;
const { Text, Title } = Typography;

const DownloadManager = ({ className = '' }) => {
  const {
    downloadTasks,
    isDownloading,
    startDownload,
    cancelDownloadTask,
    clearCompletedTasks
  } = useDownloadManager();

  // 本地状态
  const [downloadModalVisible, setDownloadModalVisible] = useState(false);
  const [downloadUrls, setDownloadUrls] = useState('');
  const [autoTranscribe, setAutoTranscribe] = useState(true);

  // 处理下载
  const handleDownload = async () => {
    if (!downloadUrls.trim()) {
      return;
    }

    // 解析多个URL（按行分割）
    const urls = downloadUrls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    await startDownload(urls, autoTranscribe);
    
    // 清空输入并关闭模态框
    setDownloadUrls('');
    setDownloadModalVisible(false);
  };

  // 获取状态图标
  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <ClockCircleOutlined className="status-icon pending" />;
      case 'downloading':
        return <DownloadOutlined className="status-icon downloading" />;
      case 'completed':
        return <CheckCircleOutlined className="status-icon completed" />;
      case 'failed':
        return <ExclamationCircleOutlined className="status-icon failed" />;
      case 'cancelled':
        return <StopOutlined className="status-icon cancelled" />;
      default:
        return <ClockCircleOutlined className="status-icon" />;
    }
  };

  // 获取状态标签
  const getStatusTag = (status) => {
    const statusConfig = {
      pending: { color: 'blue', text: '等待中' },
      downloading: { color: 'processing', text: '下载中' },
      completed: { color: 'success', text: '已完成' },
      failed: { color: 'error', text: '失败' },
      cancelled: { color: 'default', text: '已取消' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 格式化URL显示
  const formatUrl = (url) => {
    if (url.length > 50) {
      return url.substring(0, 47) + '...';
    }
    return url;
  };

  const taskList = Array.from(downloadTasks.values());
  const hasCompletedTasks = taskList.some(task =>
    task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled'
  );

  return (
    <div className={`download-manager ${className}`}>
      <Card
        title={
          <Space>
            <DownloadOutlined />
            <span>下载管理</span>
            {taskList.length > 0 && (
              <Tag color="blue">{taskList.length}</Tag>
            )}
          </Space>
        }
        extra={
          <Space>
            {hasCompletedTasks && (
              <Tooltip title="清除已完成任务">
                <Button
                  type="text"
                  icon={<ClearOutlined />}
                  onClick={clearCompletedTasks}
                  size="small"
                />
              </Tooltip>
            )}
            <Button
              type="primary"
              icon={<LinkOutlined />}
              onClick={() => setDownloadModalVisible(true)}
              loading={isDownloading}
            >
              添加下载
            </Button>
          </Space>
        }
        className="download-manager-card"
      >
        {taskList.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无下载任务"
            className="download-empty"
          >
            <Button
              type="primary"
              icon={<LinkOutlined />}
              onClick={() => setDownloadModalVisible(true)}
            >
              开始下载
            </Button>
          </Empty>
        ) : (
          <List
            dataSource={taskList}
            renderItem={(task) => (
              <List.Item
                key={task.id}
                className={`download-task-item ${task.status}`}
                actions={[
                  task.status === 'downloading' || task.status === 'pending' ? (
                    <Tooltip title="取消下载">
                      <Button
                        type="text"
                        danger
                        icon={<StopOutlined />}
                        onClick={() => cancelDownloadTask(task.id)}
                        size="small"
                      />
                    </Tooltip>
                  ) : null
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  avatar={getStatusIcon(task.status)}
                  title={
                    <Space>
                      <Text strong className="task-filename">
                        {task.filename}
                      </Text>
                      {getStatusTag(task.status)}
                    </Space>
                  }
                  description={
                    <div className="task-details">
                      <div className="task-url">
                        <LinkOutlined className="url-icon" />
                        <Text type="secondary" className="url-text">
                          {formatUrl(task.url)}
                        </Text>
                      </div>
                      
                      {(task.status === 'downloading' || task.status === 'pending') && (
                        <div className="task-progress">
                          <Progress
                            percent={task.progress}
                            size="small"
                            status={task.status === 'downloading' ? 'active' : 'normal'}
                            format={(percent) => `${percent}%`}
                          />
                          <div className="progress-info">
                            <Text type="secondary" className="progress-text">
                              {task.speed} • ETA: {task.eta}
                            </Text>
                          </div>
                        </div>
                      )}
                      
                      {task.error_message && (
                        <div className="task-error">
                          <Text type="danger">{task.error_message}</Text>
                        </div>
                      )}
                      
                      {task.autoTranscribe && (
                        <div className="task-options">
                          <Tag icon={<PlayCircleOutlined />} color="green" size="small">
                            自动转录
                          </Tag>
                        </div>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* 下载配置模态框 */}
      <Modal
        title="添加下载任务"
        open={downloadModalVisible}
        onOk={handleDownload}
        onCancel={() => {
          setDownloadModalVisible(false);
          setDownloadUrls('');
        }}
        confirmLoading={isDownloading}
        okText="开始下载"
        cancelText="取消"
        width={600}
        className="download-modal"
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={5}>视频链接</Title>
            <Text type="secondary">
              支持 YouTube、Bilibili 等主流平台，每行一个链接
            </Text>
            <TextArea
              placeholder={`请输入视频链接，每行一个：
https://www.youtube.com/watch?v=xxxxx
https://www.bilibili.com/video/BVxxxxx`}
              value={downloadUrls}
              onChange={(e) => setDownloadUrls(e.target.value)}
              rows={6}
              className="download-urls-input"
            />
          </div>
          
          <Divider />
          
          <div>
            <Space align="center">
              <Switch
                checked={autoTranscribe}
                onChange={setAutoTranscribe}
                checkedChildren="开启"
                unCheckedChildren="关闭"
              />
              <span>下载完成后自动转录</span>
              <Tooltip title="开启后，下载完成的文件将自动进行语音转录">
                <Button type="text" icon={<ExclamationCircleOutlined />} size="small" />
              </Tooltip>
            </Space>
          </div>
        </Space>
      </Modal>
    </div>
  );
};

export default DownloadManager;
