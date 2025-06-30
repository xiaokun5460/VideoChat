/**
 * 现代化智能评价视图组件
 * 高端、友好、智能的教学评价界面
 */



import ReactMarkdown from 'react-markdown';
import {
  Card,
  Button,
  Typography,
  Space,
  Divider,
  Tag,
  Tooltip,
  Spin
} from 'antd';
import {
  StarOutlined,
  CopyOutlined,
  DownloadOutlined,
  ReloadOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  UserOutlined,
  BookOutlined,
  PictureOutlined
} from '@ant-design/icons';
import { useContentExport } from '../../hooks/useContentExport';
import { useClipboard } from '../../hooks/useClipboard';
import { exportEvaluationReport } from '../../utils/exportUtils';

import './StreamingStyles.css';

const { Title, Text } = Typography;

const ModernEvaluationView = ({
  file,
  onGenerate,
  loading = false,
  className = ''
}) => {
  // 剪贴板Hook
  const { copyToClipboard, loading: copyLoading } = useClipboard();

  // 内容导出Hook
  const { loading: exportLoading, exportToImage } = useContentExport();

  // 复制评价内容
  const handleCopy = async (content) => {
    await copyToClipboard(content);
  };

  // 导出评价报告
  const handleExport = () => {
    if (!file?.evaluation) return;
    exportEvaluationReport(file);
  };

  // 导出评价为图片
  const handleExportImage = async () => {
    if (!file?.evaluation) return;

    // 组合评价内容
    const content = `# ${file.name} - 智能教学评价报告

## 课程信息
- **文件名**: ${file.name}
- **评价时间**: ${new Date().toLocaleString()}
- **评价类型**: AI专业评价

## 评价内容

${file.evaluation}

---
**生成时间**: ${new Date().toLocaleString()}
**评价系统**: VideoChat AI 智能教学评价系统`;

    // 调用导出Hook
    await exportToImage(
      content,
      `${file.name} - 智能教学评价报告`,
      'evaluation'
    );
  };

  // 如果正在加载
  if (loading) {
    return (
      <div className="evaluation-loading">
        <Spin size="large" />
        <Text className="loading-text">AI正在分析教学内容，生成智能评价...</Text>
      </div>
    );
  }

  // 如果没有评价内容，显示空状态
  if (!file?.evaluation) {
    return (
      <div className="ai-empty-state">
        <StarOutlined className="empty-icon" />
        <h3 className="empty-title">开始智能评价</h3>
        <p className="empty-description">
          AI将从课堂导入、课程重点、课程难点、课堂设计、内容讲解深度、内容讲解广度、知识延伸、课堂总结等8个专业维度对教学进行全面评价，并给出综合评分。
        </p>
        <div className="empty-actions">
          <Button
            type="primary"
            icon={<StarOutlined />}
            onClick={() => onGenerate?.(file)}
            className="generate-btn"
            size="large"
            loading={loading}
          >
            生成智能评价
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`modern-evaluation-view ${className}`}>
      {/* 操作工具栏 */}
      <div className="evaluation-toolbar">
        <div className="toolbar-left">
          <Tag color="gold" icon={<StarOutlined />}>
            智能评价
          </Tag>
          <Text type="secondary" className="file-info">
            基于 {file.name} 生成
          </Text>
        </div>
        
        <div className="toolbar-right">
          <Space>
            <Tooltip title="重新生成">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => onGenerate?.(file)}
                className="action-btn"
                size="small"
              />
            </Tooltip>
            
            <Tooltip title="复制评价">
              <Button
                icon={<CopyOutlined />}
                onClick={() => handleCopy(file.evaluation)}
                loading={copyLoading}
                className="action-btn"
                size="small"
              />
            </Tooltip>
            
            <Tooltip title="导出报告">
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExport}
                className="action-btn"
                size="small"
              />
            </Tooltip>

            <Tooltip title="导出为图片">
              <Button
                icon={<PictureOutlined />}
                onClick={handleExportImage}
                className="action-btn"
                size="small"
                loading={exportLoading}
                disabled={!file.evaluation}
              />
            </Tooltip>
          </Space>
        </div>
      </div>

      <Divider className="toolbar-divider" />

      {/* 评价内容 */}
      <Card className="evaluation-card" variant="outlined">
        <div className="card-header">
          <Title level={4} className="card-title">
            <TrophyOutlined className="title-icon" />
            教学评价报告
          </Title>
          <Tag color="success" className="evaluation-tag">
            AI专业评价
          </Tag>
        </div>
        
        <div className="evaluation-content">
          {(() => {
            const fileContent = file?.evaluation;



            if (fileContent && fileContent.length > 0) {
              // 过滤掉<think>标签内容，只显示实际的评价内容
              const cleanContent = fileContent
                .replace(/<think>[\s\S]*?<\/think>/g, '')
                .trim();

              return (
                <div className="evaluation-content">
                  <ReactMarkdown>{cleanContent || '内容生成中...'}</ReactMarkdown>
                </div>
              );
            } else if (loading) {
              return (
                <div className="loading-content">
                  <Spin size="small" />
                  <span style={{ marginLeft: 8 }}>AI正在分析内容，生成智能评价...</span>
                </div>
              );
            } else {
              return <div>暂无评价内容</div>;
            }
          })()}
        </div>
        
        <div className="card-footer">
          <Space>
            <Text type="secondary" className="meta-info">
              <ClockCircleOutlined /> 专业分析
            </Text>
            <Button
              type="link"
              icon={<CopyOutlined />}
              onClick={() => handleCopy(file.evaluation)}
              size="small"
              className="copy-link"
            >
              复制
            </Button>
          </Space>
        </div>
      </Card>

      {/* 评价统计 */}
      <Card className="evaluation-stats" variant="outlined">
        <div className="stats-content">
          <Space split={<Divider type="vertical" />} size="large">
            <div className="stat-item">
              <BookOutlined className="stat-icon" />
              <div className="stat-info">
                <Text className="stat-label">评价维度</Text>
                <Text className="stat-value">8个维度</Text>
              </div>
            </div>
            <div className="stat-item">
              <TrophyOutlined className="stat-icon" />
              <div className="stat-info">
                <Text className="stat-label">评价类型</Text>
                <Text className="stat-value">教学质量</Text>
              </div>
            </div>
            <div className="stat-item">
              <UserOutlined className="stat-icon" />
              <div className="stat-info">
                <Text className="stat-label">生成时间</Text>
                <Text className="stat-value">{new Date().toLocaleDateString()}</Text>
              </div>
            </div>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default ModernEvaluationView;
