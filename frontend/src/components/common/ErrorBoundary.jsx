/**
 * 错误边界组件
 * 捕获子组件中的JavaScript错误，显示友好的错误界面
 */

import React from 'react';
import { Result, Button, Typography, Collapse, Alert } from 'antd';
import { 
  ExclamationCircleOutlined, 
  ReloadOutlined, 
  BugOutlined,
  HomeOutlined 
} from '@ant-design/icons';
import PropTypes from 'prop-types';

const { Paragraph, Text } = Typography;
const { Panel } = Collapse;

/**
 * 错误边界组件
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error) {
    // 更新state，下次渲染将显示错误UI
    return {
      hasError: true,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2),
    };
  }

  componentDidCatch(error, errorInfo) {
    // 记录错误信息
    this.setState({
      error,
      errorInfo,
    });

    // 调用错误报告回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 在开发环境下打印错误信息
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 ErrorBoundary caught an error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.groupEnd();
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });

    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleGoHome = () => {
    if (this.props.onGoHome) {
      this.props.onGoHome();
    } else {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      const { 
        title = '出现了一些问题',
        subTitle = '抱歉，页面遇到了错误。请尝试刷新页面或联系技术支持。',
        showRetry = true,
        showGoHome = true,
        showErrorDetails = process.env.NODE_ENV === 'development',
        customActions,
        level = 'error'
      } = this.props;

      const { error, errorInfo, errorId } = this.state;

      return (
        <div className="error-boundary-container">
          <Result
            status="error"
            icon={<ExclamationCircleOutlined />}
            title={title}
            subTitle={subTitle}
            extra={[
              showRetry && (
                <Button 
                  key="retry" 
                  type="primary" 
                  icon={<ReloadOutlined />}
                  onClick={this.handleRetry}
                >
                  重试
                </Button>
              ),
              showGoHome && (
                <Button 
                  key="home" 
                  icon={<HomeOutlined />}
                  onClick={this.handleGoHome}
                >
                  返回首页
                </Button>
              ),
              ...(customActions || [])
            ].filter(Boolean)}
          >
            {errorId && (
              <Alert
                message={`错误ID: ${errorId}`}
                description="请将此错误ID提供给技术支持以便快速定位问题"
                type="info"
                showIcon
                style={{ marginBottom: 16, textAlign: 'left' }}
              />
            )}

            {showErrorDetails && error && (
              <Collapse ghost>
                <Panel 
                  header={
                    <Text type="secondary">
                      <BugOutlined /> 错误详情 (开发模式)
                    </Text>
                  } 
                  key="error-details"
                >
                  <div style={{ textAlign: 'left' }}>
                    <Paragraph>
                      <Text strong>错误消息:</Text>
                      <br />
                      <Text code>{error.toString()}</Text>
                    </Paragraph>

                    {error.stack && (
                      <Paragraph>
                        <Text strong>错误堆栈:</Text>
                        <br />
                        <Text code style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                          {error.stack}
                        </Text>
                      </Paragraph>
                    )}

                    {errorInfo && errorInfo.componentStack && (
                      <Paragraph>
                        <Text strong>组件堆栈:</Text>
                        <br />
                        <Text code style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                          {errorInfo.componentStack}
                        </Text>
                      </Paragraph>
                    )}
                  </div>
                </Panel>
              </Collapse>
            )}
          </Result>

          <style>{`
            .error-boundary-container {
              padding: 50px 20px;
              min-height: 400px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            
            .error-boundary-container .ant-result {
              padding: 48px 32px;
            }
            
            .error-boundary-container .ant-collapse-content-box {
              max-height: 300px;
              overflow-y: auto;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
  subTitle: PropTypes.string,
  showRetry: PropTypes.bool,
  showGoHome: PropTypes.bool,
  showErrorDetails: PropTypes.bool,
  customActions: PropTypes.arrayOf(PropTypes.node),
  level: PropTypes.oneOf(['error', 'warning', 'info']),
  onError: PropTypes.func,
  onRetry: PropTypes.func,
  onGoHome: PropTypes.func,
};

export default ErrorBoundary;
