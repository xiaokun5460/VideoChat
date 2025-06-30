/**
 * 现代化AI聊天界面组件
 * 高端、友好、智能的对话界面
 */

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Input,
  Button,
  Typography,
  Space,
  Avatar,
  Divider,
  Tag,
  Tooltip,
  Empty
} from 'antd';
import {
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  ClearOutlined,
  CopyOutlined,
  MessageOutlined,
  StopOutlined
} from '@ant-design/icons';

// 导入流式API Hook
import { useStreamAPI } from '../../hooks/useAPI';
import { chatWithAI, extractTranscriptionText } from '../../services/api';

const { TextArea } = Input;
const { Text } = Typography;

const ModernChatInterface = ({
  file,
  onSendMessage,
  loading = false,
  className = ''
}) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // 流式API Hook
  const chatStreamAPI = useStreamAPI();
  const [currentStreamingMessageId, setCurrentStreamingMessageId] = useState(null);

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 发送消息 - 支持流式响应和持续会话
  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading || chatStreamAPI.streaming) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    // 添加用户消息
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // 创建AI消息占位符
    const aiMessageId = Date.now() + 1;
    const aiMessage = {
      id: aiMessageId,
      type: 'ai',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };

    setMessages(prev => [...prev, aiMessage]);
    setCurrentStreamingMessageId(aiMessageId);

    try {
      // 构建完整的对话历史 - 这是持续会话的关键！
      const context = extractTranscriptionText(file.transcription);

      // 将UI消息转换为OpenAI格式的消息历史（不包含系统消息，让后端处理）
      const chatMessages = [
        // 历史对话消息
        ...messages.map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
        // 当前用户消息
        {
          role: 'user',
          content: userMessage.content
        }
      ];

      await chatStreamAPI.executeStream(
        (options) => chatWithAI(chatMessages, context, options), // 让后端处理context和系统消息
        {
          showMessages: false, // 不显示全局消息
          onChunk: (chunk) => {
            // 实时更新AI消息内容
            setMessages(prev => prev.map(msg =>
              msg.id === aiMessageId
                ? { ...msg, content: msg.content + chunk }
                : msg
            ));
          },
          onComplete: () => {
            // 标记流式完成
            setMessages(prev => prev.map(msg =>
              msg.id === aiMessageId
                ? { ...msg, isStreaming: false }
                : msg
            ));
            setCurrentStreamingMessageId(null);
            setIsTyping(false);
          },
          onError: (error) => {
            // 处理错误
            setMessages(prev => prev.map(msg =>
              msg.id === aiMessageId
                ? {
                    ...msg,
                    content: '抱歉，我遇到了一些问题，请稍后再试。',
                    isError: true,
                    isStreaming: false
                  }
                : msg
            ));
            setCurrentStreamingMessageId(null);
            setIsTyping(false);
          }
        }
      );

    } catch (error) {
      console.error('Chat failed:', error);
      // 如果流式API失败，回退到原有方式
      try {
        const response = await onSendMessage?.(userMessage.content, file);
        setMessages(prev => prev.map(msg =>
          msg.id === aiMessageId
            ? { ...msg, content: response, isStreaming: false }
            : msg
        ));
      } catch (fallbackError) {
        setMessages(prev => prev.map(msg =>
          msg.id === aiMessageId
            ? {
                ...msg,
                content: '抱歉，我遇到了一些问题，请稍后再试。',
                isError: true,
                isStreaming: false
              }
            : msg
        ));
      }
      setCurrentStreamingMessageId(null);
      setIsTyping(false);
    }
  };

  // 清空对话
  const handleClearChat = () => {
    setMessages([]);
  };

  // 复制消息
  const handleCopyMessage = (content) => {
    navigator.clipboard.writeText(content);
  };

  // 快速问题 - 展示持续会话能力
  const quickQuestions = [
    '请总结这段内容的主要观点',
    '有哪些关键信息？',
    '请提取重要的时间点',
    '有什么值得注意的地方？',
    '能详细解释一下吗？',
    '我还想了解更多'
  ];

  // 处理快速问题点击
  const handleQuickQuestion = (question) => {
    setInputValue(question);
    inputRef.current?.focus();
  };

  // 按键处理
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 如果没有转录内容
  if (!file?.transcription || file.transcription.length === 0) {
    return (
      <div className="chat-empty">
        <Empty
          image={<MessageOutlined className="empty-icon" />}
          description="需要转录内容"
          className="empty-state"
        >
          <Text type="secondary" className="empty-description">
            请先完成文件转录，然后即可与AI对话
          </Text>
        </Empty>
      </div>
    );
  }

  return (
    <div className={`modern-chat-interface ${className}`}>
      <style>{`
        .streaming-cursor {
          animation: blink 1s infinite;
          color: #1890ff;
          font-weight: bold;
        }

        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        .chat-bubble.streaming {
          border-left: 3px solid #1890ff;
        }

        .stop-btn {
          background: #ff4d4f;
          border-color: #ff4d4f;
        }

        .stop-btn:hover {
          background: #ff7875;
          border-color: #ff7875;
        }
      `}</style>
      {/* 聊天头部 */}
      <div className="chat-header">
        <div className="header-left">
          <Avatar 
            icon={<RobotOutlined />} 
            className="ai-avatar"
            style={{ 
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' 
            }}
          />
          <div className="header-info">
            <Text className="ai-name">AI助手</Text>
            <Text type="secondary" className="ai-status">
              基于 {file.name} 的内容对话
            </Text>
          </div>
        </div>
        
        <div className="header-right">
          <Space>
            <Tag color="blue" className="context-tag">
              {file.transcription.length} 条转录记录
            </Tag>
            <Tag color="green" className="context-tag">
              {messages.length} 条对话记录
            </Tag>
            <Tooltip title="清空对话历史">
              <Button
                icon={<ClearOutlined />}
                onClick={handleClearChat}
                className="action-btn"
                size="small"
                disabled={messages.length === 0 || chatStreamAPI.streaming}
              />
            </Tooltip>
          </Space>
        </div>
      </div>

      <Divider className="header-divider" />

      {/* 消息列表 */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="ai-empty-state">
            <MessageOutlined className="empty-icon" />
            <h3 className="empty-title">开始AI对话</h3>
            <p className="empty-description">
              你好！我是AI助手，可以基于转录内容与你进行持续对话。我会记住我们之前的对话内容，让交流更加自然流畅。试试下面的快速问题，或者直接输入你想了解的内容。
            </p>
            <div className="empty-actions">
              <div className="quick-questions-grid">
                {quickQuestions.map((question, index) => (
                  <Button
                    key={index}
                    type="dashed"
                    size="small"
                    onClick={() => handleQuickQuestion(question)}
                    className="quick-question-btn"
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="chat-messages-container">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chat-message-wrapper ${message.type}-message`}
              >
                {message.type === 'ai' && (
                  <div className="message-avatar-left">
                    <Avatar
                      icon={<RobotOutlined />}
                      className="ai-avatar"
                      size={36}
                      style={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        border: '2px solid rgba(255, 255, 255, 0.8)',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                      }}
                    />
                  </div>
                )}

                <div className={`chat-bubble ${message.type}-bubble ${message.isError ? 'error' : ''} ${message.isStreaming ? 'streaming' : ''}`}>
                  <div className="bubble-content">
                    {message.type === 'ai' ? (
                      <div className="ai-message-content">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                        {message.isStreaming && (
                          <span className="streaming-cursor">▊</span>
                        )}
                      </div>
                    ) : (
                      <div className="user-message-content">
                        {message.content}
                      </div>
                    )}
                  </div>

                  <div className="bubble-footer">
                    <Text type="secondary" className="message-timestamp">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                    <Tooltip title="复制消息">
                      <Button
                        type="text"
                        icon={<CopyOutlined />}
                        onClick={() => handleCopyMessage(message.content)}
                        className="copy-message-btn"
                        size="small"
                      />
                    </Tooltip>
                  </div>
                </div>

                {message.type === 'user' && (
                  <div className="message-avatar-right">
                    <Avatar
                      icon={<UserOutlined />}
                      className="user-avatar"
                      size={36}
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        border: '2px solid rgba(255, 255, 255, 0.8)',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
            
            {/* 正在输入指示器 */}
            {isTyping && (
              <div className="message-item ai typing">
                <div className="message-avatar">
                  <Avatar
                    icon={<RobotOutlined />}
                    className="ai-avatar"
                    style={{
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                    }}
                  />
                </div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <div className="input-container">
        <div className="input-wrapper">
          <TextArea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="输入你的问题..."
            autoSize={{ minRows: 1, maxRows: 4 }}
            className="message-input"
            disabled={loading}
          />
          {chatStreamAPI.streaming ? (
            <Button
              danger
              icon={<StopOutlined />}
              onClick={chatStreamAPI.cancel}
              className="stop-btn"
            >
              停止
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSendMessage}
              loading={loading || chatStreamAPI.loading}
              disabled={!inputValue.trim()}
              className="send-btn"
            >
              发送
            </Button>
          )}
        </div>
        
        <div className="input-hint">
          <Text type="secondary" className="hint-text">
            💡 按 Enter 发送，Shift + Enter 换行
          </Text>
        </div>
      </div>
    </div>
  );
};

export default ModernChatInterface;
