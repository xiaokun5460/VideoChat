/**
 * 应用状态提供者组件
 * 负责提供全局状态管理和主题配置
 */

import React from 'react';
import { ConfigProvider, App } from 'antd';
import { AppProvider as AppContextProvider } from '../../contexts/AppContext';
import { useTheme } from '../../hooks/useTheme';
import PerformanceMonitor from '../common/PerformanceMonitor';
import '../../theme/globalStyles.css';

/**
 * 主题提供者组件
 * 包装ConfigProvider和主题配置
 */
const ThemeProvider = ({ children }) => {
  const { antdTheme } = useTheme();

  return (
    <ConfigProvider theme={antdTheme}>
      <App>
        {children}
      </App>
    </ConfigProvider>
  );
};

/**
 * 应用状态提供者组件
 * @param {Object} props - 组件属性
 * @param {React.ReactNode} props.children - 子组件
 */
const AppProvider = ({ children }) => {
  return (
    <AppContextProvider>
      <ThemeProvider>
        {children}
        {/* 性能监控组件 - 仅在开发环境显示 */}
        <PerformanceMonitor />
      </ThemeProvider>
    </AppContextProvider>
  );
};

export default AppProvider;
