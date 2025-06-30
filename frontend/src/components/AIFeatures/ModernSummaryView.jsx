/**
 * 现代化总结视图组件
 * 高端、友好、智能的总结展示界面
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
  Empty,
  Spin
} from 'antd';
import {
  BulbOutlined,
  CopyOutlined,
  DownloadOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  TagsOutlined,
  PictureOutlined
} from '@ant-design/icons';
import { useContentExport } from '../../hooks/useContentExport';
import { useClipboard } from '../../hooks/useClipboard';
import { exportSummaryReport } from '../../utils/exportUtils';
import './StreamingStyles.css';

const { Title, Paragraph, Text } = Typography;

const ModernSummaryView = ({
  file,
  onGenerate,
  summaryStreamAPI,
  detailedSummaryStreamAPI,
  className = ''
}) => {
  // 剪贴板Hook
  const { copyToClipboard, loading: copyLoading } = useClipboard();

  // 内容导出Hook
  const { loading: exportLoading, exportToImage } = useContentExport();

  // 复制总结内容
  const handleCopy = async (content) => {
    await copyToClipboard(content);
  };

  // 导出总结
  const handleExport = () => {
    exportSummaryReport(file);
  };

  // 导出总结为图片
  const handleExportImage = async () => {
    // 组合简要总结和详细总结内容
    const content = `# ${file.name} - 智能总结

## 简要总结
${file.summary || '暂无总结'}

## 详细总结
${file.detailedSummary || '暂无详细总结'}

---
**生成时间**: ${new Date().toLocaleString()}
**文件名**: ${file.name}`;

    // 调用导出Hook
    await exportToImage(
      content,
      `${file.name} - 智能总结报告`,
      'summary'
    );
  };


  // 如果没有总结
  if (!file?.summary && !file?.detailedSummary) {
    return (
      <div className="summary-empty">
        <Empty
          image={<BulbOutlined className="empty-icon" />}
          description="暂无总结"
          className="empty-state"
        >
          <Text type="secondary" className="empty-description">
            点击下方按钮生成AI智能总结
          </Text>
          <Button
            type="primary"
            icon={<BulbOutlined />}
            onClick={() => onGenerate?.(file)}
            className="generate-btn"
            size="large"
            loading={summaryStreamAPI?.loading && !summaryStreamAPI?.streaming}
          >
            生成智能总结
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div className={`modern-summary-view ${className}`}>


      {/* 操作工具栏 */}
      <div className="summary-toolbar">
        <div className="toolbar-left">
          <Tag color="blue" icon={<FileTextOutlined />}>
            智能总结
          </Tag>
          <Text type="secondary" className="file-info">
            基于 {file.name} 生成
          </Text>
        </div>
        
        <div className="toolbar-right">
          <Space>
            <Tooltip title="生成简要总结">
              <Button
                icon={<BulbOutlined />}
                onClick={() => onGenerate?.(file, 'brief')}
                className="action-btn"
                size="small"
                type={file.summary ? "default" : "primary"}
                loading={summaryStreamAPI?.loading && !summaryStreamAPI?.streaming}
              />
            </Tooltip>

            <Tooltip title="生成详细总结">
              <Button
                icon={<FileTextOutlined />}
                onClick={() => onGenerate?.(file, 'detailed')}
                className="action-btn"
                size="small"
                type={file.detailedSummary ? "default" : "primary"}
                loading={detailedSummaryStreamAPI?.loading && !detailedSummaryStreamAPI?.streaming}
              />
            </Tooltip>

            <Tooltip title="复制总结">
              <Button
                icon={<CopyOutlined />}
                onClick={() => handleCopy(`${file.summary || ''}\n\n${file.detailedSummary || ''}`)}
                loading={copyLoading}
                className="action-btn"
                size="small"
                disabled={!file.summary && !file.detailedSummary}
              />
            </Tooltip>

            <Tooltip title="导出总结">
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExport}
                className="action-btn"
                size="small"
                disabled={!file.summary && !file.detailedSummary}
              />
            </Tooltip>

            <Tooltip title="导出为图片">
              <Button
                icon={<PictureOutlined />}
                onClick={handleExportImage}
                className="action-btn"
                size="small"
                loading={exportLoading}
                disabled={!file.summary && !file.detailedSummary}
              />
            </Tooltip>
          </Space>
        </div>
      </div>

      <Divider className="toolbar-divider" />

      {/* 无总结时的提示 */}
      {!file.summary && !file.detailedSummary &&
       !summaryStreamAPI?.loading && !summaryStreamAPI?.streaming &&
       !detailedSummaryStreamAPI?.loading && !detailedSummaryStreamAPI?.streaming && (
        <Card className="summary-card empty" variant="outlined">
          <Empty
            image={<BulbOutlined className="empty-summary-icon" />}
            description={
              <div className="empty-summary-content">
                <Title level={4} className="empty-title">
                  开始生成AI总结
                </Title>
                <Paragraph className="empty-description">
                  点击上方按钮生成简要总结或详细总结，AI将为您提供内容的核心要点和深度分析。
                </Paragraph>
                <Space>
                  <Button
                    type="primary"
                    icon={<BulbOutlined />}
                    onClick={() => onGenerate?.(file, 'brief')}
                    loading={summaryStreamAPI?.loading && !summaryStreamAPI?.streaming}
                  >
                    生成简要总结
                  </Button>
                  <Button
                    icon={<FileTextOutlined />}
                    onClick={() => onGenerate?.(file, 'detailed')}
                    loading={detailedSummaryStreamAPI?.loading && !detailedSummaryStreamAPI?.streaming}
                  >
                    生成详细总结
                  </Button>
                </Space>
              </div>
            }
          />
        </Card>
      )}

      {/* 简要总结 */}
      {(file.summary || summaryStreamAPI?.streaming || summaryStreamAPI?.loading ||
        (summaryStreamAPI?.content && summaryStreamAPI.content.length > 0)) && (
        <Card className="summary-card brief" variant="outlined">
          <div className="card-header">
            <Title level={4} className="card-title">
              <BulbOutlined className="title-icon" />
              简要总结
            </Title>
            <Tag color="processing" className="summary-tag">
              核心要点
            </Tag>
          </div>

          <div className="summary-content brief-content">
            {}
 
            {/* 显示总结内容：优先流式内容，否则显示文件内容 */}
            {(() => {
              const streamContent = summaryStreamAPI?.content;
              const fileContent = file?.summary;
              const isStreaming = summaryStreamAPI?.streaming;

              // 选择要显示的内容：流式内容 > 文件内容
              const displayContent = streamContent || fileContent;
              const hasContent = displayContent && displayContent.length > 0;

              if (hasContent) {
                // 过滤掉<think>标签内容，只显示实际的总结内容
                const cleanContent = displayContent
                  .replace(/<think>[\s\S]*?<\/think>/g, '')
                  .trim();

                return (
                  <div className="summary-content">
                    <ReactMarkdown>{cleanContent || '内容生成中...'}</ReactMarkdown>
                    {isStreaming && (
                      <span className="streaming-cursor">|</span>
                    )}
                  </div>
                );
              } else if (summaryStreamAPI?.loading) {
                console.log('⏳ 渲染加载状态');
                return (
                  <div className="loading-content">
                    <Spin size="small" />
                    <span style={{ marginLeft: 8 }}>AI正在分析内容，生成智能总结...</span>
                  </div>
                );
              } else if (file.summary) {
                console.log('📄 渲染静态内容');
                return <ReactMarkdown>{file.summary}</ReactMarkdown>;
              } else {
                console.log('❓ 渲染空状态');
                return <div>暂无内容</div>;
              }
            })()}
          </div>
          
          <div className="card-footer">
            <Space>
              <Text type="secondary" className="meta-info">
                <ClockCircleOutlined /> 快速概览
              </Text>
              <Button
                type="link"
                icon={<CopyOutlined />}
                onClick={() => handleCopy(file.summary)}
                size="small"
                className="copy-link"
              >
                复制
              </Button>
            </Space>
          </div>
        </Card>
      )}

      {/* 详细总结 */}
      {(file.detailedSummary || detailedSummaryStreamAPI?.streaming || detailedSummaryStreamAPI?.loading ||
        (detailedSummaryStreamAPI?.content && detailedSummaryStreamAPI.content.length > 0)) && (
        <Card className="summary-card detailed" variant="outlined">
          <div className="card-header">
            <Title level={4} className="card-title">
              <FileTextOutlined className="title-icon" />
              详细总结
            </Title>
            <Tag color="success" className="summary-tag">
              深度分析
            </Tag>
          </div>

          <div className="summary-content detailed-content">
            {/* 显示详细总结内容：优先流式内容，否则显示文件内容 */}
            {(() => {
              const streamContent = detailedSummaryStreamAPI?.content;
              const fileContent = file?.detailedSummary;
              const isStreaming = detailedSummaryStreamAPI?.streaming;
              const isLoading = detailedSummaryStreamAPI?.loading;

              // 选择要显示的内容：流式内容 > 文件内容
              const displayContent = streamContent || fileContent;
              const hasContent = displayContent && displayContent.length > 0;

              if (hasContent) {
                // 过滤掉<think>标签内容，只显示实际的总结内容
                const cleanContent = displayContent
                  .replace(/<think>[\s\S]*?<\/think>/g, '')
                  .trim();

                return (
                  <div className="summary-content">
                    <ReactMarkdown>{cleanContent}</ReactMarkdown>
                    {isStreaming && (
                      <span className="streaming-cursor">|</span>
                    )}
                  </div>
                );
              } else if (isLoading) {
                return (
                  <div className="loading-content">
                    <Spin size="small" />
                    <span style={{ marginLeft: 8 }}>AI正在深度分析内容，生成详细总结...</span>
                  </div>
                );
              } else {
                return (
                  <Empty
                    image={<FileTextOutlined className="empty-icon" />}
                    description="暂无详细总结"
                  />
                );
              }
            })()}
          </div>
          
          <div className="card-footer">
            <Space>
              <Text type="secondary" className="meta-info">
                <TagsOutlined /> 全面解析
              </Text>
              <Button
                type="link"
                icon={<CopyOutlined />}
                onClick={() => handleCopy(file.detailedSummary)}
                size="small"
                className="copy-link"
              >
                复制
              </Button>
            </Space>
          </div>
        </Card>
      )}

      {/* 总结统计 */}
      <Card className="summary-stats" variant="outlined">
        <div className="stats-content">
          <Space split={<Divider type="vertical" />} size="large">
            <div className="stat-item">
              <Text type="secondary" className="stat-label">简要总结</Text>
              <Text className="stat-value">
                {file.summary ? `${file.summary.length} 字` : '未生成'}
              </Text>
            </div>
            <div className="stat-item">
              <Text type="secondary" className="stat-label">详细总结</Text>
              <Text className="stat-value">
                {file.detailedSummary ? `${file.detailedSummary.length} 字` : '未生成'}
              </Text>
            </div>
            <div className="stat-item">
              <Text type="secondary" className="stat-label">原文长度</Text>
              <Text className="stat-value">
                {file.transcription ? 
                  `${file.transcription.reduce((sum, item) => sum + item.text.length, 0)} 字` : 
                  '0 字'
                }
              </Text>
            </div>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default ModernSummaryView;
