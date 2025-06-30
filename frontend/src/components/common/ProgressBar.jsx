/**
 * 进度条组件
 * 增强的进度条组件，支持多种样式和动画效果
 */

import React, { useState, useEffect } from 'react';
import { Progress, Typography } from 'antd';
import PropTypes from 'prop-types';

const { Text } = Typography;

/**
 * 进度条组件
 * @param {Object} props - 组件属性
 * @param {number} props.percent - 进度百分比 (0-100)
 * @param {string} props.status - 进度状态
 * @param {boolean} props.showInfo - 是否显示进度信息
 * @param {string} props.format - 自定义格式化函数
 * @param {string} props.size - 进度条大小
 * @param {boolean} props.animated - 是否启用动画
 * @param {number} props.animationDuration - 动画持续时间（毫秒）
 * @param {string} props.strokeColor - 进度条颜色
 * @param {string} props.trailColor - 轨道颜色
 * @param {number} props.strokeWidth - 进度条宽度
 * @param {boolean} props.showLabel - 是否显示标签
 * @param {string} props.label - 标签文本
 * @param {boolean} props.showSpeed - 是否显示速度信息
 * @param {string} props.speedUnit - 速度单位
 * @param {Function} props.onComplete - 完成回调
 */
const ProgressBar = ({
  percent = 0,
  status = 'normal',
  showInfo = true,
  format,
  size = 'default',
  animated = true,
  animationDuration = 300,
  strokeColor,
  trailColor,
  strokeWidth,
  showLabel = false,
  label = '',
  showSpeed = false,
  speedUnit = 'MB/s',
  onComplete,
  className = '',
  style = {},
  ...restProps
}) => {
  const [displayPercent, setDisplayPercent] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [lastPercent, setLastPercent] = useState(0);
  const [lastTime, setLastTime] = useState(Date.now());

  // 动画效果
  useEffect(() => {
    if (animated && percent !== displayPercent) {
      const startPercent = displayPercent;
      const targetPercent = percent;
      const startTime = Date.now();

      const animate = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / animationDuration, 1);
        
        // 使用缓动函数
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentPercent = startPercent + (targetPercent - startPercent) * easeOutQuart;
        
        setDisplayPercent(Math.round(currentPercent * 100) / 100);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setDisplayPercent(targetPercent);
          if (targetPercent >= 100 && onComplete) {
            onComplete();
          }
        }
      };

      requestAnimationFrame(animate);
    } else {
      setDisplayPercent(percent);
      if (percent >= 100 && onComplete) {
        onComplete();
      }
    }
  }, [percent, animated, animationDuration, displayPercent, onComplete]);

  // 计算速度
  useEffect(() => {
    if (showSpeed && percent > lastPercent) {
      const now = Date.now();
      const timeDiff = (now - lastTime) / 1000; // 转换为秒
      const percentDiff = percent - lastPercent;
      
      if (timeDiff > 0) {
        const currentSpeed = percentDiff / timeDiff;
        setSpeed(currentSpeed);
      }
      
      setLastPercent(percent);
      setLastTime(now);
    }
  }, [percent, lastPercent, lastTime, showSpeed]);

  // 自定义格式化函数
  const formatPercent = (percent) => {
    if (format) {
      return format(percent);
    }
    return `${Math.round(percent)}%`;
  };

  // 确定进度条颜色
  const getStrokeColor = () => {
    if (strokeColor) return strokeColor;
    
    switch (status) {
      case 'success':
        return '#52c41a';
      case 'exception':
        return '#ff4d4f';
      case 'active':
        return '#1890ff';
      default:
        return undefined;
    }
  };

  // 确定进度条宽度
  const getStrokeWidth = () => {
    if (strokeWidth) return strokeWidth;
    
    switch (size) {
      case 'small':
        return 6;
      case 'large':
        return 12;
      default:
        return 8;
    }
  };

  const progressProps = {
    percent: displayPercent,
    status,
    showInfo,
    format: formatPercent,
    strokeColor: getStrokeColor(),
    trailColor,
    strokeWidth: getStrokeWidth(),
    className: `enhanced-progress ${className}`,
    style,
    ...restProps,
  };

  return (
    <div className="progress-container">
      {showLabel && label && (
        <div className="progress-label">
          <Text type="secondary">{label}</Text>
        </div>
      )}
      
      <Progress {...progressProps} />
      
      {showSpeed && speed > 0 && (
        <div className="progress-speed">
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {speed.toFixed(1)} {speedUnit}
          </Text>
        </div>
      )}

      <style>{`
        .progress-container {
          width: 100%;
        }
        
        .progress-label {
          margin-bottom: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .progress-speed {
          margin-top: 4px;
          text-align: right;
        }
        
        .enhanced-progress .ant-progress-bg {
          transition: width ${animationDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        
        .enhanced-progress.ant-progress-status-active .ant-progress-bg::before {
          animation: ant-progress-loading 2s ease infinite;
        }
      `}</style>
    </div>
  );
};

ProgressBar.propTypes = {
  percent: PropTypes.number,
  status: PropTypes.oneOf(['normal', 'success', 'exception', 'active']),
  showInfo: PropTypes.bool,
  format: PropTypes.func,
  size: PropTypes.oneOf(['small', 'default', 'large']),
  animated: PropTypes.bool,
  animationDuration: PropTypes.number,
  strokeColor: PropTypes.string,
  trailColor: PropTypes.string,
  strokeWidth: PropTypes.number,
  showLabel: PropTypes.bool,
  label: PropTypes.string,
  showSpeed: PropTypes.bool,
  speedUnit: PropTypes.string,
  onComplete: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default ProgressBar;
