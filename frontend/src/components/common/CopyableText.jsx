/**
 * 可复制文本组件
 * 提供一键复制功能的文本显示组件
 */

import React, { useState } from 'react';
import { Typography, Button, message, Tooltip } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';

const { Paragraph, Text } = Typography;

/**
 * 可复制文本组件
 * @param {Object} props - 组件属性
 * @param {string} props.text - 要显示和复制的文本
 * @param {boolean} props.showCopyButton - 是否显示复制按钮
 * @param {string} props.copyButtonText - 复制按钮文本
 * @param {string} props.copiedButtonText - 复制成功后按钮文本
 * @param {string} props.successMessage - 复制成功提示消息
 * @param {boolean} props.ellipsis - 是否启用省略号
 * @param {number} props.rows - 显示行数（多行文本）
 * @param {boolean} props.expandable - 是否可展开
 * @param {string} props.type - 文本类型
 * @param {Function} props.onCopy - 复制回调函数
 */
const CopyableText = ({
  text,
  showCopyButton = true,
  copyButtonText = '复制',
  copiedButtonText = '已复制',
  successMessage = '复制成功',
  ellipsis = false,
  rows = 1,
  expandable = false,
  type = 'default',
  onCopy,
  className = '',
  style = {},
  ...restProps
}) => {
  const [copied, setCopied] = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);

  const handleCopy = async () => {
    if (!text || copyLoading) return;

    try {
      setCopyLoading(true);
      
      // 使用现代的 Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // 降级方案：使用传统的 document.execCommand
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (!successful) {
          throw new Error('复制失败');
        }
      }

      setCopied(true);
      message.success(successMessage);
      
      // 调用回调函数
      onCopy?.(text);

      // 2秒后重置状态
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      message.error('复制失败，请手动复制');
    } finally {
      setCopyLoading(false);
    }
  };

  const copyButton = showCopyButton && (
    <Tooltip title={copied ? copiedButtonText : copyButtonText}>
      <Button
        type="text"
        size="small"
        icon={copied ? <CheckOutlined /> : <CopyOutlined />}
        loading={copyLoading}
        onClick={handleCopy}
        style={{
          color: copied ? '#52c41a' : undefined,
          marginLeft: 8,
        }}
      >
        {copied ? copiedButtonText : copyButtonText}
      </Button>
    </Tooltip>
  );

  const textProps = {
    className: `copyable-text ${className}`,
    style,
    type,
    ...restProps,
  };

  if (rows > 1) {
    // 多行文本使用 Paragraph
    return (
      <div className="copyable-text-container">
        <Paragraph
          {...textProps}
          ellipsis={ellipsis ? { rows, expandable } : false}
        >
          {text}
        </Paragraph>
        {copyButton}
        
        <style>{`
          .copyable-text-container {
            display: flex;
            align-items: flex-start;
            gap: 8px;
          }
          
          .copyable-text-container .ant-typography {
            flex: 1;
            margin-bottom: 0;
          }
        `}</style>
      </div>
    );
  } else {
    // 单行文本使用 Text
    return (
      <span className="copyable-text-container">
        <Text
          {...textProps}
          ellipsis={ellipsis}
        >
          {text}
        </Text>
        {copyButton}
        
        <style>{`
          .copyable-text-container {
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }
        `}</style>
      </span>
    );
  }
};

CopyableText.propTypes = {
  text: PropTypes.string.isRequired,
  showCopyButton: PropTypes.bool,
  copyButtonText: PropTypes.string,
  copiedButtonText: PropTypes.string,
  successMessage: PropTypes.string,
  ellipsis: PropTypes.bool,
  rows: PropTypes.number,
  expandable: PropTypes.bool,
  type: PropTypes.oneOf(['secondary', 'success', 'warning', 'danger', 'default']),
  onCopy: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default CopyableText;
