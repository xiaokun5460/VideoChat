/**
 * 侧边栏内容组件
 * 负责显示文件管理器和应用设置
 */

import React from 'react';
import { Layout, Typography, Space, Button, Tooltip } from 'antd';
import {
  SettingOutlined,
  DownloadOutlined,
  ExperimentOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useUIState, useFiles } from '../../hooks/useAppContext';
import { useFileManager } from '../../hooks/useFileManager';
import ModernFileManager from '../FileManager/ModernFileManager';
import { ThemeToggle } from '../Theme';

const { Sider } = Layout;
const { Title } = Typography;

/**
 * 侧边栏内容组件
 */
const SiderContent = () => {
  const {
    downloadTasksCount,
    showStreamDemo,
    openSettings,
    openDownloadModal,
    toggleStreamDemo
  } = useUIState();

  const { files, selectedFiles, transcribingFiles } = useFiles();

  const {
    handleFileUpload,
    handleFileDelete,
    handleFileSelect,
    handleTranscribe
  } = useFileManager();

  return (
    <Sider 
      width={400} 
      className="app-sider"
      theme="light"
    >
      <div className="sider-header">
        <div className="header-title">
          <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
            VideoChat
          </Title>
        </div>
        
        <div className="header-actions">
          <Space size="small">
            <Tooltip title="流式响应演示">
              <Button
                type={showStreamDemo ? 'primary' : 'text'}
                icon={<ExperimentOutlined />}
                onClick={toggleStreamDemo}
                size="small"
              />
            </Tooltip>

            <ThemeToggle size="small" />

            <Tooltip title="下载管理">
              <Button
                type="text"
                icon={<DownloadOutlined />}
                onClick={openDownloadModal}
                size="small"
              >
                {downloadTasksCount > 0 && (
                  <span className="download-badge">{downloadTasksCount}</span>
                )}
              </Button>
            </Tooltip>

            <Tooltip title="设置">
              <Button
                type="text"
                icon={<SettingOutlined />}
                onClick={openSettings}
                size="small"
              />
            </Tooltip>

            <Tooltip title="关于">
              <Button
                type="text"
                icon={<InfoCircleOutlined />}
                size="small"
              />
            </Tooltip>
          </Space>
        </div>
      </div>

      <div className="sider-content">
        <ModernFileManager
          files={files}
          onFileUpload={handleFileUpload}
          onFileDelete={handleFileDelete}
          onFileSelect={handleFileSelect}
          onTranscribe={handleTranscribe}
          selectedFiles={selectedFiles}
          transcribingFiles={transcribingFiles}
        />
      </div>

      <style>{`
        .app-sider {
          background: white;
          border-right: 1px solid #f0f0f0;
          box-shadow: 2px 0 8px rgba(0, 0, 0, 0.06);
        }
        
        .sider-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #f0f0f0;
          background: white;
        }
        
        .header-title {
          display: flex;
          align-items: center;
        }
        
        .header-actions {
          display: flex;
          align-items: center;
        }
        
        .download-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          background: #ff4d4f;
          color: white;
          border-radius: 50%;
          font-size: 10px;
          min-width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }
        
        .sider-content {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
      `}</style>
    </Sider>
  );
};

export default SiderContent;
