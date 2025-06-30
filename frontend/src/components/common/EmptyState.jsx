/**
 * 空状态组件
 * 统一的空状态展示组件，支持多种场景和自定义配置
 */

import React from 'react';
import { Empty, Button, Typography } from 'antd';
import { 
  FileTextOutlined, 
  InboxOutlined, 
  SearchOutlined,
  DisconnectOutlined,
  ExclamationCircleOutlined 
} from '@ant-design/icons';
import PropTypes from 'prop-types';

const { Title, Paragraph } = Typography;

/**
 * 预定义的空状态类型
 */
const EMPTY_TYPES = {
  default: {
    icon: <InboxOutlined />,
    title: '暂无数据',
    description: '当前没有可显示的内容',
  },
  noFiles: {
    icon: <FileTextOutlined />,
    title: '暂无文件',
    description: '请上传文件开始使用',
  },
  noSearchResults: {
    icon: <SearchOutlined />,
    title: '未找到相关内容',
    description: '请尝试调整搜索条件',
  },
  networkError: {
    icon: <DisconnectOutlined />,
    title: '网络连接异常',
    description: '请检查网络连接后重试',
  },
  error: {
    icon: <ExclamationCircleOutlined />,
    title: '加载失败',
    description: '数据加载时出现错误',
  },
};

/**
 * 空状态组件
 * @param {Object} props - 组件属性
 * @param {string} props.type - 空状态类型
 * @param {React.ReactNode} props.icon - 自定义图标
 * @param {string} props.title - 标题
 * @param {string} props.description - 描述文本
 * @param {React.ReactNode} props.extra - 额外的操作按钮
 * @param {Function} props.onAction - 主要操作回调
 * @param {string} props.actionText - 主要操作按钮文本
 * @param {string} props.actionType - 主要操作按钮类型
 * @param {boolean} props.showAction - 是否显示主要操作按钮
 * @param {string} props.size - 组件大小
 * @param {string} props.className - 自定义CSS类名
 * @param {Object} props.style - 自定义样式
 */
const EmptyState = ({
  type = 'default',
  icon,
  title,
  description,
  extra,
  onAction,
  actionText = '重新加载',
  actionType = 'primary',
  showAction = false,
  size = 'default',
  className = '',
  style = {},
  ...restProps
}) => {
  // 获取预定义配置
  const typeConfig = EMPTY_TYPES[type] || EMPTY_TYPES.default;

  // 确定最终的配置
  const finalIcon = icon || typeConfig.icon;
  const finalTitle = title || typeConfig.title;
  const finalDescription = description || typeConfig.description;

  // 主要操作按钮
  const actionButton = (showAction || onAction) && (
    <Button 
      type={actionType} 
      onClick={onAction}
      size={size === 'small' ? 'small' : 'middle'}
    >
      {actionText}
    </Button>
  );

  // 组合额外操作
  const finalExtra = extra || actionButton;

  // 根据大小调整样式
  const containerStyle = {
    padding: size === 'small' ? '20px' : '40px 20px',
    ...style,
  };

  const iconStyle = {
    fontSize: size === 'small' ? '48px' : '64px',
    color: '#d9d9d9',
    marginBottom: size === 'small' ? '12px' : '16px',
  };

  return (
    <div 
      className={`empty-state ${className}`} 
      style={containerStyle}
      {...restProps}
    >
      <Empty
        image={
          <div style={iconStyle}>
            {finalIcon}
          </div>
        }
        imageStyle={{
          height: 'auto',
        }}
        description={
          <div className="empty-description">
            <Title 
              level={size === 'small' ? 5 : 4} 
              type="secondary"
              style={{ marginBottom: 8 }}
            >
              {finalTitle}
            </Title>
            <Paragraph 
              type="secondary" 
              style={{ 
                marginBottom: 0,
                fontSize: size === 'small' ? '12px' : '14px',
              }}
            >
              {finalDescription}
            </Paragraph>
          </div>
        }
      >
        {finalExtra}
      </Empty>

      <style>{`
        .empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          text-align: center;
        }
        
        .empty-state .ant-empty {
          margin: 0;
        }
        
        .empty-state .empty-description {
          margin-top: 16px;
        }
        
        .empty-state .empty-description .ant-typography {
          margin-bottom: 8px;
        }
        
        .empty-state .ant-empty-footer {
          margin-top: 16px;
        }
      `}</style>
    </div>
  );
};

EmptyState.propTypes = {
  type: PropTypes.oneOf(Object.keys(EMPTY_TYPES)),
  icon: PropTypes.node,
  title: PropTypes.string,
  description: PropTypes.string,
  extra: PropTypes.node,
  onAction: PropTypes.func,
  actionText: PropTypes.string,
  actionType: PropTypes.string,
  showAction: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'default', 'large']),
  className: PropTypes.string,
  style: PropTypes.object,
};

export default EmptyState;
