/**
 * 主要内容区域组件
 * 负责显示当前选中文件的AI功能界面
 * 已优化：懒加载、性能监控、memoization
 */

import React, { Suspense, useRef, useCallback } from 'react';
import { Layout, Empty, Typography, Spin, Row, Col } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { useFiles } from '../../hooks/useAppContext';
import { useAIFeatures } from '../../hooks/useAIFeatures';
import { useRenderPerformance } from '../../utils/performance';

// 懒加载组件
const LazyModernAIFeatures = React.lazy(() => import('../AIFeatures/ModernAIFeatures'));
const LazyModernMediaPlayer = React.lazy(() => import('../MediaPlayer/ModernMediaPlayer'));
const LazyModernTranscriptionView = React.lazy(() => import('../TranscriptionView/ModernTranscriptionView'));

const { Content } = Layout;
const { Title, Text } = Typography;

/**
 * 主要内容区域组件
 * 已优化：性能监控、懒加载、条件渲染
 */
const MainContent = React.memo(() => {
  const { currentFile } = useFiles();

  // 媒体播放器引用
  const mediaPlayerRef = useRef(null);

  // AI功能Hook
  const {
    generateSummaryContent,
    generateMindmap,
    sendMessage,
    generateEvaluation,
    getAIStatus,
    summaryStreamAPI,
    detailedSummaryStreamAPI,
    chatStreamAPI,
    evaluationStreamAPI
  } = useAIFeatures();

  // 获取AI功能状态
  const aiStatus = getAIStatus();

  // 时间跳转功能
  const handleTimeSeek = useCallback((time) => {
    if (mediaPlayerRef.current && mediaPlayerRef.current.seekTo) {
      mediaPlayerRef.current.seekTo(time);
    }
  }, []);

  // 性能监控
  useRenderPerformance('MainContent', [currentFile?.name]);

  return (
    <Content className="main-content-area">
      {currentFile ? (
        <Row gutter={[16, 16]} style={{ height: '100%' }}>
          {/* 左侧：视频预览和转录数据 */}
          <Col xs={24} xl={14} style={{ height: '100%' }}>
            <div className="media-section" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* 视频/音频播放器 */}
              <div style={{ flex: '0 0 auto' }}>
                <Suspense fallback={<Spin tip="加载媒体播放器..." />}>
                  <LazyModernMediaPlayer
                    ref={mediaPlayerRef}
                    src={currentFile.url}
                    type={currentFile.type}
                    poster={currentFile.poster}
                    className="media-player-container"
                  />
                </Suspense>
              </div>

              {/* 转录数据 */}
              <div style={{ flex: '1 1 auto', minHeight: '300px' }}>
                <Suspense fallback={<Spin tip="加载转录数据..." />}>
                  <LazyModernTranscriptionView
                    transcriptionData={currentFile.transcription || []}
                    isLoading={false}
                    onTimeSeek={handleTimeSeek}
                    className="transcription-container"
                  />
                </Suspense>
              </div>
            </div>
          </Col>

          {/* 右侧：AI功能 */}
          <Col xs={24} xl={10} style={{ height: '100%' }}>
            <Suspense fallback={
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                minHeight: '60vh'
              }}>
                <Spin size="large" tip="加载AI功能模块..." />
              </div>
            }>
              <LazyModernAIFeatures
                currentFile={currentFile}
                onGenerateSummary={generateSummaryContent}
                onGenerateMindmap={generateMindmap}
                onSendMessage={sendMessage}
                onGenerateEvaluation={generateEvaluation}
                summaryLoading={aiStatus.summaryLoading}
                mindmapLoading={false} // 思维导图暂时没有loading状态
                chatLoading={aiStatus.chatLoading}
                evaluationLoading={aiStatus.evaluationLoading}
                // 流式API状态
                summaryStreamAPI={summaryStreamAPI}
                detailedSummaryStreamAPI={detailedSummaryStreamAPI}
                chatStreamAPI={chatStreamAPI}
                evaluationStreamAPI={evaluationStreamAPI}
                className="ai-features-container"
              />
            </Suspense>
          </Col>
        </Row>
      ) : (
        <div className="empty-content">
          <Empty
            image={<FileTextOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
            styles={{ image: { height: 80 } }}
            description={
              <div className="empty-description">
                <Title level={4} type="secondary">
                  欢迎使用 VideoChat
                </Title>
                <Text type="secondary">
                  请从左侧选择或上传一个视频/音频文件开始使用AI功能
                </Text>
              </div>
            }
          />
        </div>
      )}

      <style>{`
        .main-content-area {
          padding: 24px;
          background: #f5f5f5;
          min-height: 100vh;
          overflow-y: auto;
        }

        .media-section {
          height: 100%;
        }

        .media-player-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          overflow: hidden;
        }

        .transcription-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          height: 100%;
        }

        .ai-features-container {
          height: 100%;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .empty-content {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          min-height: 60vh;
        }

        .empty-description {
          text-align: center;
          margin-top: 16px;
        }

        .empty-description .ant-typography {
          margin-bottom: 8px;
        }

        /* 响应式布局 */
        @media (max-width: 1200px) {
          .main-content-area {
            padding: 16px;
          }

          .media-section {
            margin-bottom: 20px;
          }

          .media-player-container {
            min-height: 200px;
          }

          .transcription-container {
            min-height: 250px;
          }
        }

        @media (max-width: 768px) {
          .main-content-area {
            padding: 12px;
          }

          .media-section {
            margin-bottom: 16px;
          }

          .media-player-container {
            min-height: 180px;
          }

          .transcription-container {
            min-height: 200px;
          }
        }

        /* 流式文本样式 */
        .streaming-summary,
        .streaming-evaluation {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
        }

        .streaming-summary .streaming-cursor,
        .streaming-evaluation .streaming-cursor {
          color: #1890ff;
          animation: blink 1s infinite;
        }

        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </Content>
  );
});

export default MainContent;
