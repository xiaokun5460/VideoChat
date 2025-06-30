/**
 * 流式文本显示组件
 * 用于显示实时流式文本内容，支持打字机效果和光标动画
 */

import React, { useState, useEffect, useRef } from 'react';
import { Typography } from 'antd';
import PropTypes from 'prop-types';

const { Paragraph } = Typography;

/**
 * 流式文本显示组件
 * @param {Object} props - 组件属性
 * @param {string} props.content - 要显示的文本内容
 * @param {boolean} props.isStreaming - 是否正在流式传输
 * @param {boolean} props.showCursor - 是否显示光标
 * @param {boolean} props.typewriterEffect - 是否启用打字机效果
 * @param {number} props.typewriterSpeed - 打字机效果速度（毫秒）
 * @param {string} props.cursorChar - 光标字符
 * @param {string} props.className - 自定义CSS类名
 * @param {Object} props.style - 自定义样式
 * @param {Function} props.onComplete - 流式传输完成回调
 */
const StreamingText = ({
  content = '',
  isStreaming = false,
  showCursor = true,
  typewriterEffect = false,
  typewriterSpeed = 50,
  cursorChar = '|',
  className = '',
  style = {},
  onComplete,
  ...restProps
}) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const [showBlinkingCursor, setShowBlinkingCursor] = useState(false);
  const typewriterIndexRef = useRef(0);
  const typewriterTimerRef = useRef(null);
  const cursorTimerRef = useRef(null);

  // 调试日志
  console.log('🎬 StreamingText 渲染:', {
    content: content?.slice(0, 100) + (content?.length > 100 ? '...' : ''),
    contentLength: content?.length,
    isStreaming,
    displayedContent: displayedContent?.slice(0, 100) + (displayedContent?.length > 100 ? '...' : ''),
    displayedLength: displayedContent?.length,
    typewriterEffect,
    showCursor
  });

  // 打字机效果
  useEffect(() => {
    if (typewriterEffect && content) {
      typewriterIndexRef.current = 0;
      setDisplayedContent('');

      const typeNextChar = () => {
        if (typewriterIndexRef.current < content.length) {
          setDisplayedContent(content.slice(0, typewriterIndexRef.current + 1));
          typewriterIndexRef.current++;
          typewriterTimerRef.current = setTimeout(typeNextChar, typewriterSpeed);
        } else {
          onComplete?.();
        }
      };

      typeNextChar();

      return () => {
        if (typewriterTimerRef.current) {
          clearTimeout(typewriterTimerRef.current);
        }
      };
    } else {
      setDisplayedContent(content);
      if (!isStreaming && content) {
        onComplete?.();
      }
    }
  }, [content, typewriterEffect, typewriterSpeed, isStreaming, onComplete]);

  // 光标闪烁效果
  useEffect(() => {
    if (showCursor && (isStreaming || typewriterEffect)) {
      setShowBlinkingCursor(true);
      
      cursorTimerRef.current = setInterval(() => {
        setShowBlinkingCursor(prev => !prev);
      }, 500);

      return () => {
        if (cursorTimerRef.current) {
          clearInterval(cursorTimerRef.current);
        }
      };
    } else {
      setShowBlinkingCursor(false);
      if (cursorTimerRef.current) {
        clearInterval(cursorTimerRef.current);
      }
    }
  }, [showCursor, isStreaming, typewriterEffect]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (typewriterTimerRef.current) {
        clearTimeout(typewriterTimerRef.current);
      }
      if (cursorTimerRef.current) {
        clearInterval(cursorTimerRef.current);
      }
    };
  }, []);

  const containerStyle = {
    position: 'relative',
    minHeight: '1.5em',
    ...style,
  };

  const cursorStyle = {
    opacity: showBlinkingCursor ? 1 : 0,
    transition: 'opacity 0.1s ease-in-out',
    color: 'var(--color-primary-500, #1890ff)',
    fontWeight: 'bold',
    marginLeft: '2px',
  };

  return (
    <div 
      className={`streaming-text ${className}`} 
      style={containerStyle}
      {...restProps}
    >
      <Paragraph style={{ margin: 0, display: 'inline' }}>
        {displayedContent}
      </Paragraph>
      {showCursor && (isStreaming || typewriterEffect) && (
        <span style={cursorStyle}>
          {cursorChar}
        </span>
      )}
      
      <style>{`
        .streaming-text {
          word-wrap: break-word;
          white-space: pre-wrap;
          line-height: 1.6;
        }
        
        .streaming-text .ant-typography {
          margin-bottom: 0;
        }
        
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

StreamingText.propTypes = {
  content: PropTypes.string,
  isStreaming: PropTypes.bool,
  showCursor: PropTypes.bool,
  typewriterEffect: PropTypes.bool,
  typewriterSpeed: PropTypes.number,
  cursorChar: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
  onComplete: PropTypes.func,
};

export default StreamingText;
