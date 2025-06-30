/**
 * 现代化 VideoChat 应用
 * 组件组合器 - 负责应用的整体布局和组件组合
 * 已优化：懒加载、代码分割、性能监控
 */

import React from 'react';
import { Layout } from 'antd';
import AppProvider from './components/App/AppProvider';
import SiderContent from './components/App/SiderContent';
import MainContent from './components/App/MainContent';
import { useRenderPerformance } from './utils/performance';
import { useSmartPreload } from './components/LazyComponents';



/**
 * 应用内容组件
 * 包含侧边栏和主要内容区域
 * 已优化：性能监控、懒加载、智能预加载
 */
const AppContent = React.memo(() => {
  // 性能监控
  useRenderPerformance('AppContent');

  // 智能预加载
  useSmartPreload();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <SiderContent />
      <MainContent />
    </Layout>
  );
});

/**
 * 主应用组件
 * 顶层组件，负责提供全局状态和组件组合
 */
const ModernApp = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default ModernApp;