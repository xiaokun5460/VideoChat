/**
 * 侧边栏内容组件
 * 负责显示文件管理器和应用设置
 */

import React, { useState } from 'react';
import { Layout, Typography, Space, Button, Tooltip, Tabs } from 'antd';
import {
  SettingOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  FileOutlined,
  CloudDownloadOutlined
} from '@ant-design/icons';
import { useUIState, useFiles } from '../../hooks/useAppContext';
import { useFileManager } from '../../hooks/useFileManager';
import ModernFileManager from '../FileManager/ModernFileManager';
import { SuspenseDownloadManager } from '../LazyComponents';

const { Sider } = Layout;
const { Title } = Typography;

/**
 * 侧边栏内容组件
 */
const SiderContent = () => {
  const {
    downloadTasksCount,
    openSettings
  } = useUIState();

  const { files, selectedFiles, transcribingFiles } = useFiles();

  const {
    handleFileUpload,
    handleFileDelete,
    handleFileSelect,
    handleTranscribe,
    handleStopTranscription,
    handleTranscribeDownloaded
  } = useFileManager();

  // 本地状态：当前活动的标签页
  const [activeTab, setActiveTab] = useState('files');

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
            <Tooltip title="切换到下载管理">
              <Button
                type={activeTab === 'downloads' ? 'primary' : 'text'}
                icon={<DownloadOutlined />}
                onClick={() => setActiveTab('downloads')}
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
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="small"
          className="sider-tabs"
          items={[
            {
              key: 'files',
              label: (
                <Space size="small">
                  <FileOutlined />
                  <span>文件管理</span>
                  {files.length > 0 && (
                    <span className="tab-badge">{files.length}</span>
                  )}
                </Space>
              ),
              children: (
                <ModernFileManager
                  files={files}
                  onFileUpload={handleFileUpload}
                  onFileDelete={handleFileDelete}
                  onFileSelect={handleFileSelect}
                  onTranscribe={handleTranscribe}
                  onStopTranscription={handleStopTranscription}
                  onTranscribeDownloaded={handleTranscribeDownloaded}
                  selectedFiles={selectedFiles}
                  transcribingFiles={transcribingFiles}
                />
              )
            },
            {
              key: 'downloads',
              label: (
                <Space size="small">
                  <CloudDownloadOutlined />
                  <span>下载管理</span>
                  {downloadTasksCount > 0 && (
                    <span className="tab-badge">{downloadTasksCount}</span>
                  )}
                </Space>
              ),
              children: <SuspenseDownloadManager />
            }
          ]}
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

        .sider-tabs {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .sider-tabs .ant-tabs-content-holder {
          flex: 1;
          overflow: hidden;
        }

        .sider-tabs .ant-tabs-tabpane {
          height: 100%;
          overflow: hidden;
        }

        .sider-tabs .ant-tabs-nav {
          margin-bottom: 0;
          padding: 0 16px;
          background: #fafafa;
          border-bottom: 1px solid #f0f0f0;
        }

        .tab-badge {
          background: #1890ff;
          color: white;
          border-radius: 8px;
          font-size: 10px;
          min-width: 16px;
          height: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          margin-left: 4px;
        }
      `}</style>
    </Sider>
  );
};

export default SiderContent;
