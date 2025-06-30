/**
 * 现代化AI功能组件
 * 高端、友好、智能的AI功能界面
 */

import { useState } from 'react';
import {
  Card,
  Tabs,
  Button,
  Space,
  Typography,
  Spin,
  Empty,
  message
} from 'antd';
import {
  BulbOutlined,
  BranchesOutlined,
  MessageOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  StarOutlined
} from '@ant-design/icons';
import ModernSummaryView from './ModernSummaryView';
import ModernMindmapView from './ModernMindmapView';
import ModernChatInterface from './ModernChatInterface';
import ModernEvaluationView from './ModernEvaluationView';
import './ModernAIFeatures.css';

const { Title, Text } = Typography;

const ModernAIFeatures = ({
  currentFile,
  onGenerateSummary,
  onGenerateMindmap,
  onSendMessage,
  onGenerateEvaluation,
  summaryLoading = false,
  mindmapLoading = false,
  chatLoading = false,
  evaluationLoading = false,
  // 流式API状态
  summaryStreamAPI,
  detailedSummaryStreamAPI,
  evaluationStreamAPI,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState('summary');

  // 检查是否有转录结果
  const hasTranscription = currentFile?.transcription && 
    currentFile.transcription.length > 0;

  // 生成总结
  const handleGenerateSummary = async (file, type = 'brief') => {
    if (!hasTranscription) {
      message.warning('请先完成转录');
      return;
    }
    await onGenerateSummary?.(file || currentFile, type);
  };

  // 生成智能评价
  const handleGenerateEvaluation = async () => {
    if (!hasTranscription) {
      message.warning('请先完成转录');
      return;
    }
    await onGenerateEvaluation?.(currentFile);
  };

  // 生成思维导图
  const handleGenerateMindmap = async () => {
    if (!hasTranscription) {
      message.warning('请先完成转录');
      return;
    }
    await onGenerateMindmap?.(currentFile);
  };

  // Tab项配置
  const tabItems = [
    {
      key: 'summary',
      label: (
        <div className="tab-label">
          <BulbOutlined />
          <span>智能总结</span>
        </div>
      ),
      children: (
        <div className="animate-fade-in">
          <ModernSummaryView
            file={currentFile}
            onGenerate={handleGenerateSummary}
            loading={summaryLoading}
            summaryStreamAPI={summaryStreamAPI}
            detailedSummaryStreamAPI={detailedSummaryStreamAPI}
          />
        </div>
      ),
    },
    {
      key: 'mindmap',
      label: (
        <div className="tab-label">
          <BranchesOutlined />
          <span>思维导图</span>
        </div>
      ),
      children: (
        <div className="animate-fade-in">
          <ModernMindmapView
            file={currentFile}
            onGenerate={handleGenerateMindmap}
            loading={mindmapLoading}
          />
        </div>
      ),
    },{
      key: 'evaluation',
      label: (
        <div className="tab-label">
          <StarOutlined />
          <span>智能评价</span>
        </div>
      ),
      children: (
        <div className="animate-fade-in">
          <ModernEvaluationView
            file={currentFile}
            onGenerate={handleGenerateEvaluation}
            loading={evaluationLoading}
            evaluationStreamAPI={evaluationStreamAPI}
          />
        </div>
      ),
    },
    {
      key: 'chat',
      label: (
        <div className="tab-label">
          <MessageOutlined />
          <span>AI对话</span>
        </div>
      ),
      children: (
        <div className="animate-fade-in">
          <ModernChatInterface
            file={currentFile}
            onSendMessage={onSendMessage}
            loading={chatLoading}
          />
        </div>
      ),
    },
  ];

  if (!currentFile) {
    return (
      <Card className={`modern-ai-features empty ${className}`} variant="outlined">
        <Empty
          image={<RobotOutlined className="empty-icon" />}
          description="请选择文件"
          className="empty-state"
        >
          <Text type="secondary">选择文件后即可使用AI功能</Text>
        </Empty>
      </Card>
    );
  }

  if (!hasTranscription) {
    return (
      <Card className={`modern-ai-features no-transcription ${className}`} variant="outlined">
        <div className="no-transcription-content">
          <div className="no-transcription-icon">
            <ThunderboltOutlined />
          </div>
          <Title level={4} className="no-transcription-title">
            等待转录完成
          </Title>
          <Text type="secondary" className="no-transcription-description">
            请先完成文件转录，然后即可使用AI功能进行智能分析
          </Text>
          <div className="transcription-status">
            <Spin size="small" />
            <Text type="secondary">转录进行中...</Text>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`modern-ai-features ${className}`} variant="outlined">
      {/* AI功能头部 */}
      <div className="ai-features-header">
        <div className="header-left">
          <div className="ai-icon">
            <RobotOutlined />
          </div>
          <div className="header-info">
            <Title level={4} className="ai-title">AI智能分析</Title>
            <Text type="secondary" className="ai-description">
              基于转录内容的智能分析和对话
            </Text>
          </div>
        </div>
        
        <div className="header-right">
          <Space>
            <Button
              type="primary"
              icon={<BulbOutlined />}
              onClick={() => handleGenerateSummary(currentFile, 'brief')}
              loading={summaryLoading}
              className="quick-action-btn"
              size="small"
            >
              快速总结
            </Button>
            <Button
              type="primary"
              icon={<BranchesOutlined />}
              onClick={handleGenerateMindmap}
              loading={mindmapLoading}
              className="quick-action-btn"
              size="small"
            >
              生成导图
            </Button>
            <Button
              type="primary"
              icon={<StarOutlined />}
              onClick={handleGenerateEvaluation}
              loading={evaluationLoading}
              className="quick-action-btn"
              size="small"
            >
              智能评价
            </Button>
          </Space>
        </div>
      </div>

      {/* AI功能标签页 */}
      <div className="ai-features-content">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          className="ai-tabs"
          size="large"
          tabBarStyle={{
            marginBottom: 24,
            borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        />
      </div>

      {/* 文件信息 */}
      <div className="file-info-footer">
        <Space split={<span className="divider">|</span>}>
          <Text type="secondary" className="file-name">
            文件: {currentFile.name}
          </Text>
          <Text type="secondary" className="transcription-length">
            转录: {currentFile.transcription?.length || 0} 条记录
          </Text>
          <Text type="secondary" className="file-duration">
            时长: {currentFile.duration ? 
              `${Math.floor(currentFile.duration / 60)}:${Math.floor(currentFile.duration % 60).toString().padStart(2, '0')}` : 
              '未知'
            }
          </Text>
        </Space>
      </div>
    </Card>
  );
};

export default ModernAIFeatures;
