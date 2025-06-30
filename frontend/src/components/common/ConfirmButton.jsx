/**
 * 确认按钮组件
 * 带确认对话框的按钮，用于危险操作的二次确认
 */

import React from 'react';
import { Button, Popconfirm } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';

/**
 * 确认按钮组件
 * @param {Object} props - 组件属性
 * @param {React.ReactNode} props.children - 按钮内容
 * @param {string} props.title - 确认对话框标题
 * @param {string} props.description - 确认对话框描述
 * @param {string} props.okText - 确认按钮文本
 * @param {string} props.cancelText - 取消按钮文本
 * @param {Function} props.onConfirm - 确认回调函数
 * @param {Function} props.onCancel - 取消回调函数
 * @param {boolean} props.disabled - 是否禁用
 * @param {boolean} props.loading - 是否显示加载状态
 * @param {string} props.placement - 弹出框位置
 * @param {React.ReactNode} props.icon - 确认对话框图标
 * @param {string} props.okType - 确认按钮类型
 */
const ConfirmButton = ({
  children,
  title = '确认操作',
  description = '您确定要执行此操作吗？',
  okText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
  disabled = false,
  loading = false,
  placement = 'top',
  icon = <QuestionCircleOutlined style={{ color: '#faad14' }} />,
  okType = 'primary',
  danger = false,
  ...buttonProps
}) => {
  const handleConfirm = async (e) => {
    if (onConfirm) {
      try {
        await onConfirm(e);
      } catch (error) {
        console.error('Confirm action failed:', error);
      }
    }
  };

  const handleCancel = (e) => {
    if (onCancel) {
      onCancel(e);
    }
  };

  return (
    <Popconfirm
      title={title}
      description={description}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      okText={okText}
      cancelText={cancelText}
      placement={placement}
      icon={icon}
      okType={danger ? 'danger' : okType}
      disabled={disabled || loading}
    >
      <Button
        disabled={disabled}
        loading={loading}
        danger={danger}
        {...buttonProps}
      >
        {children}
      </Button>
    </Popconfirm>
  );
};

ConfirmButton.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
  description: PropTypes.string,
  okText: PropTypes.string,
  cancelText: PropTypes.string,
  onConfirm: PropTypes.func,
  onCancel: PropTypes.func,
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  placement: PropTypes.string,
  icon: PropTypes.node,
  okType: PropTypes.string,
  danger: PropTypes.bool,
};

export default ConfirmButton;
