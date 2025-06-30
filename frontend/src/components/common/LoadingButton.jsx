/**
 * 加载按钮组件
 * 统一的加载状态按钮，支持多种样式和配置
 */

import React from 'react';
import { Button } from 'antd';
import PropTypes from 'prop-types';

/**
 * 加载按钮组件
 * @param {Object} props - 组件属性
 * @param {boolean} props.loading - 是否显示加载状态
 * @param {React.ReactNode} props.children - 按钮内容
 * @param {string} props.loadingText - 加载时显示的文本
 * @param {boolean} props.disabled - 是否禁用按钮
 * @param {string} props.type - 按钮类型
 * @param {string} props.size - 按钮大小
 * @param {React.ReactNode} props.icon - 按钮图标
 * @param {Function} props.onClick - 点击事件处理函数
 * @param {string} props.className - 自定义CSS类名
 * @param {Object} props.style - 自定义样式
 */
const LoadingButton = ({
  loading = false,
  children,
  loadingText,
  disabled = false,
  type = 'default',
  size = 'middle',
  icon,
  onClick,
  className,
  style,
  ...restProps
}) => {
  // 处理点击事件
  const handleClick = (e) => {
    if (loading || disabled) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  // 确定按钮文本
  const buttonText = loading && loadingText ? loadingText : children;

  return (
    <Button
      loading={loading}
      disabled={disabled || loading}
      type={type}
      size={size}
      icon={!loading ? icon : undefined}
      onClick={handleClick}
      className={className}
      style={style}
      {...restProps}
    >
      {buttonText}
    </Button>
  );
};

LoadingButton.propTypes = {
  loading: PropTypes.bool,
  children: PropTypes.node.isRequired,
  loadingText: PropTypes.string,
  disabled: PropTypes.bool,
  type: PropTypes.oneOf(['default', 'primary', 'dashed', 'text', 'link']),
  size: PropTypes.oneOf(['large', 'middle', 'small']),
  icon: PropTypes.node,
  onClick: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default LoadingButton;
