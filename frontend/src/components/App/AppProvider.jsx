/**
 * 应用状态提供者组件
 * 负责提供全局状态管理
 */

import React from 'react';
import { ConfigProvider, App } from 'antd';
import { AppProvider as AppContextProvider } from '../../contexts/AppContext';
import PerformanceMonitor from '../common/PerformanceMonitor';
import '../../theme/globalStyles.css';

/**
 * 应用状态提供者组件
 * @param {Object} props - 组件属性
 * @param {React.ReactNode} props.children - 子组件
 */
const AppProvider = ({ children }) => {
  return (
    <AppContextProvider>
      <ConfigProvider>
        <App>
          {children}
          {/* 性能监控组件 - 仅在开发环境显示 */}
          <PerformanceMonitor />
        </App>
      </ConfigProvider>
    </AppContextProvider>
  );
};

export default AppProvider;
