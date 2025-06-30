/**
 * 现代化布局组件
 * 高端、友好、响应式的界面布局
 */

import React, { useState, useEffect } from 'react';
import { Layout, Button, Drawer, Badge, Tooltip } from 'antd';
import {
  MenuOutlined,
  SettingOutlined,
  DownloadOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  GithubOutlined,
} from '@ant-design/icons';
import './ModernLayout.css';

const { Header, Sider, Content } = Layout;

const ModernLayout = ({ 
  children, 
  siderContent, 
  onSettingsClick,
  onDownloadClick,
  downloadTasksCount = 0,
  className = '' 
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 响应式检测
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setMobileDrawerVisible(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 全屏切换
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };



  // 头部工具栏
  const HeaderToolbar = () => (
    <div className="header-toolbar">
      <div className="header-left">
        {isMobile && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setMobileDrawerVisible(true)}
            className="mobile-menu-btn"
          />
        )}
        <div className="logo-section">
          <div className="logo-icon">🎬</div>
          <h1 className="logo-text gradient-text">VideoChat</h1>
          <span className="version-badge">v2.0</span>
        </div>
      </div>

      <div className="header-right">
        <Tooltip title="下载管理">
          <Badge count={downloadTasksCount} size="small">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={onDownloadClick}
              className="download-btn"
            />
          </Badge>
        </Tooltip>

        <Tooltip title="设置">
          <Button
            type="text"
            icon={<SettingOutlined />}
            onClick={onSettingsClick}
            className="settings-btn"
          />
        </Tooltip>

        <Tooltip title={isFullscreen ? "退出全屏" : "全屏"}>
          <Button
            type="text"
            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={toggleFullscreen}
            className="fullscreen-btn"
          />
        </Tooltip>

        <Tooltip title="GitHub">
          <Button
            type="text"
            icon={<GithubOutlined />}
            onClick={() => window.open('https://github.com/your-repo', '_blank')}
            className="github-btn"
          />
        </Tooltip>
      </div>
    </div>
  );

  return (
    <Layout className={`modern-layout ${className} ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
      {/* 现代化头部 */}
      <Header className="modern-header glass">
        <HeaderToolbar />
      </Header>

      <Layout className="layout-body">
        {/* 桌面端侧边栏 */}
        {!isMobile && (
          <Sider
            width={380}
            collapsible
            collapsed={collapsed}
            onCollapse={setCollapsed}
            className="modern-sider glass"
            collapsedWidth={0}
            trigger={null}
            breakpoint="lg"
          >
            <div className="sider-content">
              {!collapsed && (
                <div className="sider-header">
                  <h3 className="sider-title">文件管理</h3>
                  <Button
                    type="text"
                    icon={<MenuOutlined />}
                    onClick={() => setCollapsed(true)}
                    className="collapse-btn"
                  />
                </div>
              )}
              <div className="sider-body">
                {siderContent}
              </div>
            </div>
          </Sider>
        )}

        {/* 移动端抽屉 */}
        {isMobile && (
          <Drawer
            title={
              <div className="drawer-header">
                <span className="drawer-title">文件管理</span>
              </div>
            }
            placement="left"
            onClose={() => setMobileDrawerVisible(false)}
            open={mobileDrawerVisible}
            className="mobile-drawer"
            width={320}
            styles={{
              body: { padding: 0 },
              header: { 
                background: 'var(--color-neutral-0)',
                borderBottom: '1px solid var(--color-neutral-200)'
              }
            }}
          >
            {siderContent}
          </Drawer>
        )}

        {/* 主内容区域 */}
        <Content className="modern-content">
          <div className="content-wrapper">
            {/* 折叠按钮 */}
            {!isMobile && collapsed && (
              <Button
                type="primary"
                icon={<MenuOutlined />}
                onClick={() => setCollapsed(false)}
                className="expand-btn glass hover-lift"
                size="large"
              />
            )}
            
            {/* 主要内容 */}
            <div className="main-content animate-fade-in">
              {children}
            </div>
          </div>
        </Content>
      </Layout>

      {/* 背景装饰 */}
      <div className="background-decoration">
        <div className="decoration-circle circle-1"></div>
        <div className="decoration-circle circle-2"></div>
        <div className="decoration-circle circle-3"></div>
      </div>
    </Layout>
  );
};

export default ModernLayout;
