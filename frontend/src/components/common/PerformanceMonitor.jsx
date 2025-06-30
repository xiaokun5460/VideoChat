/**
 * 性能监控组件
 * 在开发环境下显示应用性能指标
 */

import React, { useState, useEffect } from 'react';
import { Card, Statistic, Row, Col, Switch, Button, Drawer } from 'antd';
import {
  DashboardOutlined,
  HddOutlined,
  ClockCircleOutlined,
  BugOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { useMemoryMonitor, performanceProfiler } from '../../utils/performance';

/**
 * 性能监控组件
 * 仅在开发环境下显示
 */
const PerformanceMonitor = () => {
  const [visible, setVisible] = useState(false);
  const [enabled, setEnabled] = useState(process.env.NODE_ENV === 'development');
  const [renderCount, setRenderCount] = useState(0);
  const [lastRenderTime, setLastRenderTime] = useState(0);
  const memoryInfo = useMemoryMonitor();

  // 监控渲染性能
  useEffect(() => {
    setRenderCount(prev => prev + 1);
    setLastRenderTime(performance.now());
  }, [enabled]); // 添加依赖数组

  // 获取FPS信息
  const [fps, setFps] = useState(0);
  useEffect(() => {
    if (!enabled) return;

    let frameCount = 0;
    let lastTime = performance.now();

    const countFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastTime)));
        frameCount = 0;
        lastTime = currentTime;
      }
      
      if (enabled) {
        requestAnimationFrame(countFPS);
      }
    };

    requestAnimationFrame(countFPS);
  }, [enabled]);

  // 获取网络信息
  const [networkInfo, setNetworkInfo] = useState(null);
  useEffect(() => {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      setNetworkInfo({
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt
      });

      const updateNetworkInfo = () => {
        setNetworkInfo({
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt
        });
      };

      connection.addEventListener('change', updateNetworkInfo);
      return () => connection.removeEventListener('change', updateNetworkInfo);
    }
  }, []);

  // 清理性能数据
  const handleClearPerformance = () => {
    performanceProfiler.clear();
    setRenderCount(0);
  };

  if (!enabled || process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      {/* 浮动按钮 */}
      <div
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 1000,
          cursor: 'pointer'
        }}
        onClick={() => setVisible(true)}
      >
        <Card
          size="small"
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            border: 'none',
            borderRadius: 8
          }}
          styles={{ body: { padding: '8px 12px' } }}
        >
          <DashboardOutlined style={{ marginRight: 8 }} />
          性能监控
        </Card>
      </div>

      {/* 性能监控面板 */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>
              <DashboardOutlined style={{ marginRight: 8 }} />
              性能监控面板
            </span>
            <Switch
              checked={enabled}
              onChange={setEnabled}
              checkedChildren="开启"
              unCheckedChildren="关闭"
              size="small"
            />
          </div>
        }
        placement="right"
        width={400}
        open={visible}
        onClose={() => setVisible(false)}
        extra={
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={() => setVisible(false)}
          />
        }
      >
        <div style={{ padding: '0 0 16px 0' }}>
          <Row gutter={[16, 16]}>
            {/* 渲染性能 */}
            <Col span={24}>
              <Card title="渲染性能" size="small">
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="FPS"
                      value={fps}
                      suffix="fps"
                      valueStyle={{ color: fps > 50 ? '#3f8600' : fps > 30 ? '#faad14' : '#cf1322' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="渲染次数"
                      value={renderCount}
                      prefix={<ClockCircleOutlined />}
                    />
                  </Col>
                </Row>
              </Card>
            </Col>

            {/* 内存使用 */}
            {memoryInfo && (
              <Col span={24}>
                <Card title="内存使用" size="small">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Statistic
                        title="已使用"
                        value={Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024)}
                        suffix="MB"
                        prefix={<HddOutlined />}
                        valueStyle={{ 
                          color: memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit > 0.8 ? '#cf1322' : '#3f8600' 
                        }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="总计"
                        value={Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024)}
                        suffix="MB"
                      />
                    </Col>
                  </Row>
                </Card>
              </Col>
            )}

            {/* 网络信息 */}
            {networkInfo && (
              <Col span={24}>
                <Card title="网络状态" size="small">
                  <Row gutter={16}>
                    <Col span={8}>
                      <Statistic
                        title="类型"
                        value={networkInfo.effectiveType}
                        valueStyle={{ fontSize: '14px' }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="下行"
                        value={networkInfo.downlink}
                        suffix="Mbps"
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="延迟"
                        value={networkInfo.rtt}
                        suffix="ms"
                      />
                    </Col>
                  </Row>
                </Card>
              </Col>
            )}

            {/* 操作按钮 */}
            <Col span={24}>
              <Card title="操作" size="small">
                <Button
                  icon={<BugOutlined />}
                  onClick={handleClearPerformance}
                  block
                >
                  清理性能数据
                </Button>
              </Card>
            </Col>
          </Row>
        </div>
      </Drawer>
    </>
  );
};

export default PerformanceMonitor;
