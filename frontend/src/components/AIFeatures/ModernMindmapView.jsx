/**
 * 现代化思维导图视图组件
 * 高端、友好、智能的思维导图展示界面
 */

import { useState, useEffect, useRef } from 'react';
import {
  Card,
  Button,
  Typography,
  Space,
  Divider,
  Tag,
  Tooltip,
  Spin,
  Select
} from 'antd';
import {
  BranchesOutlined,
  DownloadOutlined,
  ReloadOutlined,
  FullscreenOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  CompressOutlined,
  PictureOutlined
} from '@ant-design/icons';
import { useContentExport } from '../../hooks/useContentExport';
import jsMind from 'jsmind';
import 'jsmind/style/jsmind.css';

const {  Text } = Typography;
const { Option } = Select;

const ModernMindmapView = ({
  file,
  onGenerate,
  loading = false,
  className = ''
}) => {
  const mindmapRef = useRef(null);
  const [mindmapInstance, setMindmapInstance] = useState(null);
  const [viewMode, setViewMode] = useState('normal');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [containerHeight, setContainerHeight] = useState('500px');

  // 内容导出Hook
  const { loading: exportLoading } = useContentExport();

  // 应用视图模式样式
  const applyViewModeStyles = (jmInstance, mode) => {
    if (!jmInstance || !mindmapRef.current) return;

    const container = mindmapRef.current;
    const jsmindInner = container.querySelector('.jsmind-inner');

    if (!jsmindInner) return;

    // 移除之前的样式类
    jsmindInner.classList.remove('view-normal', 'view-compact', 'view-annotated', 'view-expanded');

    // 添加新的样式类
    jsmindInner.classList.add(`view-${mode}`);

    // 根据模式调整样式
    switch (mode) {
      case 'compact':
        jsmindInner.style.fontSize = '12px';
        // 调整节点间距
        const compactNodes = jsmindInner.querySelectorAll('jmnode');
        compactNodes.forEach(node => {
          node.style.padding = '2px 6px';
          node.style.margin = '2px';
        });
        break;

      case 'annotated':
        jsmindInner.style.fontSize = '14px';
        // 显示更多信息
        const annotatedNodes = jsmindInner.querySelectorAll('jmnode');
        annotatedNodes.forEach(node => {
          node.style.border = '1px solid #ccc';
          node.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        });
        break;

      case 'expanded':
        jsmindInner.style.fontSize = '16px';
        // 增大节点间距
        const expandedNodes = jsmindInner.querySelectorAll('jmnode');
        expandedNodes.forEach(node => {
          node.style.padding = '8px 12px';
          node.style.margin = '4px';
        });
        break;

      default: // normal
        jsmindInner.style.fontSize = '14px';
        const normalNodes = jsmindInner.querySelectorAll('jmnode');
        normalNodes.forEach(node => {
          node.style.padding = '4px 8px';
          node.style.margin = '2px';
        });
        break;
    }
  };

  // 响应式高度计算
  useEffect(() => {
    const updateHeight = () => {
      const viewportHeight = window.innerHeight;
      const maxHeight = Math.max(500, viewportHeight * 0.6);
      setContainerHeight(`${maxHeight}px`);
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // 初始化思维导图
  useEffect(() => {
    if (file?.mindmapData && mindmapRef.current) {
      try {
        // 清除之前的实例
        if (mindmapInstance) {
          try {
            // jsMind没有remove方法，直接清空容器
            mindmapRef.current.innerHTML = '';
            setMindmapInstance(null);
          } catch (e) {
            console.log('Failed to clear mindmap instance:', e);
          }
        }

        // 如果mindmapData是图片URL，显示图片
        if (typeof file.mindmapData === 'string' && file.mindmapData.startsWith('/uploads/')) {
          mindmapRef.current.innerHTML = `
            <div class="mindmap-image-container" style="text-align: center; padding: 20px;">
              <img
                src="http://localhost:8000${file.mindmapData}"
                alt="思维导图"
                style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"
              />
            </div>
          `;
          return;
        }

        // 如果是JSON数据且jsMind可用，使用jsMind渲染
        if (jsMind) {
          // 创建新的思维导图实例
          const options = {
            container: mindmapRef.current,
            theme: 'primary',
            editable: false,
            view: {
              hmargin: 50,
              vmargin: 30,
              line_width: 2,
              line_color: '#6366f1',
              draggable: true,  // 启用拖拽
              hide_scrollbars_when_draggable: true,
              zoom: {
                min: 0.5,
                max: 2.0,
                step: 0.1
              }
            },
            layout: {
              hspace: 30,
              vspace: 20,
              pspace: 13
            }
          };

          const jm = new jsMind(options);

          // 应用视图模式样式
          applyViewModeStyles(jm, viewMode);

          // 解析思维导图数据
          let mindData;
          if (typeof file.mindmapData === 'string') {
            try {
              mindData = JSON.parse(file.mindmapData);
            } catch (e) {
              console.error('Failed to parse mindmap data:', e);
              return;
            }
          } else {
            mindData = file.mindmapData;
          }

          jm.show(mindData);
          setMindmapInstance(jm);

          // 添加滚轮缩放事件监听器（需要按住Ctrl键）
          const container = mindmapRef.current;
          const handleWheel = (e) => {
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              if (e.deltaY < 0) {
                // 放大
                if (mindmapInstance && mindmapInstance.view && typeof mindmapInstance.view.zoom_in === 'function') {
                  mindmapInstance.view.zoom_in();
                } else if (mindmapInstance && typeof mindmapInstance.zoom_in === 'function') {
                  mindmapInstance.zoom_in();
                }
              } else {
                // 缩小
                if (mindmapInstance && mindmapInstance.view && typeof mindmapInstance.view.zoom_out === 'function') {
                  mindmapInstance.view.zoom_out();
                } else if (mindmapInstance && typeof mindmapInstance.zoom_out === 'function') {
                  mindmapInstance.zoom_out();
                }
              }
            }
          };

          container.addEventListener('wheel', handleWheel, { passive: false });

          // 清理函数
          return () => {
            container.removeEventListener('wheel', handleWheel);
          };
        }
      } catch (error) {
        console.error('Failed to initialize mindmap:', error);
      }
    }
  }, [file?.mindmapData, viewMode]); // 移除mindmapInstance依赖，添加viewMode

  // 监听viewMode变化，重新应用样式
  useEffect(() => {
    if (mindmapInstance && mindmapRef.current) {
      // 延迟应用样式，确保DOM已更新
      setTimeout(() => {
        applyViewModeStyles(mindmapInstance, viewMode);
      }, 100);
    }
  }, [viewMode, mindmapInstance]);

  // 动态添加CSS样式
  useEffect(() => {
    const styleId = 'mindmap-view-styles';
    let existingStyle = document.getElementById(styleId);

    if (!existingStyle) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .view-compact jmnode {
          font-size: 12px !important;
          padding: 2px 6px !important;
          margin: 1px !important;
        }

        .view-compact .jsmind-inner {
          line-height: 1.2 !important;
        }

        .view-annotated jmnode {
          font-size: 14px !important;
          border: 1px solid #e0e0e0 !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
          border-radius: 4px !important;
        }

        .view-expanded jmnode {
          font-size: 16px !important;
          padding: 8px 12px !important;
          margin: 4px !important;
          line-height: 1.5 !important;
        }

        .view-normal jmnode {
          font-size: 14px !important;
          padding: 4px 8px !important;
          margin: 2px !important;
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      // 组件卸载时清理样式
      const style = document.getElementById(styleId);
      if (style) {
        style.remove();
      }
    };
  }, []);

  // 导出思维导图
  const handleExport = (format = 'png') => {
    if (!mindmapInstance) {
      console.error('No mindmap instance available');
      return;
    }

    try {
      if (format === 'png') {
        // 尝试多种客户端导出方案
        console.log('Attempting client export for mindmap');

        // 检查是否有jsMind实例和数据
        if (!mindmapInstance) {
          console.error('No mindmap instance for export');
          return;
        }

        const mindmapContainer = mindmapRef.current;
        if (!mindmapContainer) {
          console.error('No mindmap container for export');
          return;
        }

        // 方案1：尝试dom-to-image
        import('dom-to-image').then(domtoimage => {
          console.log('Trying dom-to-image export');

          // 找到jsMind的实际渲染容器
          const jsmindInner = mindmapContainer.querySelector('.jsmind-inner') || mindmapContainer;

          domtoimage.default.toPng(jsmindInner, {
            quality: 0.95,
            bgcolor: '#ffffff',
            width: jsmindInner.scrollWidth,
            height: jsmindInner.scrollHeight,
            style: {
              transform: 'scale(1)',
              transformOrigin: 'top left'
            }
          }).then(dataUrl => {
            const link = document.createElement('a');
            link.download = `${file.name}-mindmap.png`;
            link.href = dataUrl;
            link.click();
            console.log('dom-to-image export successful');
          }).catch(error => {
            console.error('dom-to-image failed:', error);
            // 回退到html2canvas
            tryHtml2Canvas();
          });
        }).catch(error => {
          console.error('Failed to load dom-to-image:', error);
          // 回退到html2canvas
          tryHtml2Canvas();
        });

        // 回退方案：html2canvas
        const tryHtml2Canvas = () => {
          import('html2canvas').then(html2canvas => {
            console.log('Trying html2canvas export');

            const jsmindInner = mindmapContainer.querySelector('.jsmind-inner') || mindmapContainer;

            html2canvas.default(jsmindInner, {
              backgroundColor: '#ffffff',
              scale: 1,
              useCORS: true,
              allowTaint: true,
              foreignObjectRendering: true,
              logging: false,
              width: jsmindInner.scrollWidth,
              height: jsmindInner.scrollHeight
            }).then(canvas => {
              const link = document.createElement('a');
              link.download = `${file.name}-mindmap.png`;
              link.href = canvas.toDataURL('image/png', 0.9);
              link.click();
              console.log('html2canvas export successful');
            }).catch(error => {
              console.error('html2canvas failed:', error);
              // 最后回退到服务端导出
              console.log('All client export methods failed, using server export');
              handleServerExport();
            });
          }).catch(error => {
            console.error('Failed to load html2canvas:', error);
            handleServerExport();
          });
        };
      }
    } catch (error) {
      console.error('Export failed:', error);
      fallbackExport();
    }
  };

  // 回退导出方法
  const fallbackExport = () => {
    try {
      // 尝试查找SVG元素进行导出
      const svg = mindmapRef.current.querySelector('svg');
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const link = document.createElement('a');
          link.download = `${file.name}-mindmap.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
      } else {
        console.error('No SVG element found for export');
      }
    } catch (error) {
      console.error('Fallback export failed:', error);
    }
  };

  // 服务端导出思维导图（高质量图片）
  const handleServerExport = async () => {
    if (!file?.transcription) {
      console.error('No transcription data available');
      return;
    }

    try {
      // 检查mindmapData是否是URL（图片路径）
      if (typeof file.mindmapData === 'string' && file.mindmapData.startsWith('/uploads/')) {
        // 如果是图片URL，直接下载
        const response = await fetch(file.mindmapData);
        if (!response.ok) {
          throw new Error('Failed to fetch image');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${file.name}-mindmap.png`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }

      // 如果是JSON数据，调用思维导图图片API生成高质量图片
      const text = file.transcription.map((item) => item.text).join('\n');

      const response = await fetch('http://localhost:8000/api/mindmap-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text }),
      });

      if (!response.ok) {
        throw new Error('生成思维导图图片失败');
      }

      const data = await response.json();

      if (data.image_url) {
        // 下载生成的图片
        const imageResponse = await fetch(`http://localhost:8000${data.image_url}`);
        if (!imageResponse.ok) {
          throw new Error('Failed to fetch generated image');
        }

        const blob = await imageResponse.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${file.name}-mindmap-hq.png`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

    } catch (error) {
      console.error('Server export failed:', error);
    }
  };

  // 生成JSON格式思维导图
  const handleGenerateJsonMindmap = async () => {
    if (!file?.transcription) {
      console.error('No transcription data available');
      return;
    }

    try {
      // 提取转录文本
      const text = file.transcription.map((item) => item.text).join('\n');

      // 调用JSON格式的思维导图API
      const response = await fetch('http://localhost:8000/api/mindmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, stream: false }),
      });

      if (!response.ok) {
        throw new Error('生成JSON格式思维导图失败');
      }

      const data = await response.json();

      // 更新文件对象中的思维导图数据为JSON格式
      file.mindmapData = data.mindmap;

      // 清除现有的思维导图实例，强制重新初始化
      if (mindmapInstance) {
        try {
          // jsMind没有remove方法，直接清空容器
          if (mindmapRef.current) {
            mindmapRef.current.innerHTML = '';
          }
        } catch (e) {
          console.log('Failed to clear mindmap instance:', e);
        }
        setMindmapInstance(null);
      }

      // 清空容器内容
      if (mindmapRef.current) {
        mindmapRef.current.innerHTML = '';
      }

      // 强制重新渲染 - 使用setTimeout确保状态更新完成
      setTimeout(() => {
        // 触发useEffect重新执行
        setViewMode(prev => prev === 'normal' ? 'normal-refresh' : 'normal');
      }, 100);

    } catch (error) {
      console.error('Failed to generate JSON mindmap:', error);
    }
  };

  // 缩放控制
  const handleZoom = (direction) => {
    if (!mindmapInstance) return;

    try {


      if (direction === 'in') {
        // 尝试多种可能的API
        if (mindmapInstance.view && typeof mindmapInstance.view.zoom_in === 'function') {
          mindmapInstance.view.zoom_in();
        } else if (typeof mindmapInstance.zoom_in === 'function') {
          mindmapInstance.zoom_in();
        } else if (mindmapInstance.view && typeof mindmapInstance.view.zoomIn === 'function') {
          mindmapInstance.view.zoomIn();
        } else {
          console.log('No zoom in method found');
        }
      } else {
        if (mindmapInstance.view && typeof mindmapInstance.view.zoom_out === 'function') {
          mindmapInstance.view.zoom_out();
        } else if (typeof mindmapInstance.zoom_out === 'function') {
          mindmapInstance.zoom_out();
        } else if (mindmapInstance.view && typeof mindmapInstance.view.zoomOut === 'function') {
          mindmapInstance.view.zoomOut();
        } else {
          console.log('No zoom out method found');
        }
      }
    } catch (error) {
      console.error('Zoom failed:', error);
    }
  };

  // 重置视图
  const handleResetView = () => {
    if (!mindmapInstance) return;

    try {


      if (mindmapInstance.view && typeof mindmapInstance.view.reset === 'function') {
        mindmapInstance.view.reset();
      } else if (typeof mindmapInstance.view_reset === 'function') {
        mindmapInstance.view_reset();
      } else if (mindmapInstance.view && typeof mindmapInstance.view.center_root === 'function') {
        mindmapInstance.view.center_root();
      } else {
        console.log('No reset method found');
      }
    } catch (error) {
      console.error('Reset view failed:', error);
    }
  };

  // 全屏切换
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      mindmapRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // 如果正在加载
  if (loading) {
    return (
      <div className="mindmap-loading">
        <Spin size="large" />
        <Text className="loading-text">AI正在分析内容，生成思维导图...</Text>
      </div>
    );
  }

  // 如果没有思维导图
  if (!file?.mindmapData) {
    return (
      <div className="ai-empty-state">
        <BranchesOutlined className="empty-icon" />
        <h3 className="empty-title">开始生成思维导图</h3>
        <p className="empty-description">
          AI将为您分析内容结构，生成清晰的思维导图，帮助您更好地理解和记忆关键信息。
        </p>
        <div className="empty-actions">
          <Button
            type="primary"
            icon={<BranchesOutlined />}
            onClick={handleGenerateJsonMindmap}
            className="generate-btn"
            size="large"
            loading={loading}
          >
            生成思维导图
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`modern-mindmap-view ${className}`}>
      {/* 操作工具栏 */}
      <div className="mindmap-toolbar">
        <div className="toolbar-left">
          <Tag color="purple" icon={<BranchesOutlined />}>
            思维导图
          </Tag>
          <Text type="secondary" className="file-info">
            基于 {file.name} 生成
          </Text>
        </div>
        
        <div className="toolbar-right">
          <Space>
            <Select
              value={viewMode}
              onChange={setViewMode}
              size="small"
              className="view-mode-select"
            >
              <Option value="normal">标准视图</Option>
              <Option value="compact">紧凑视图</Option>
              <Option value="expanded">展开视图</Option>
            </Select>
            
            <Tooltip title="放大">
              <Button
                icon={<ZoomInOutlined />}
                onClick={() => handleZoom('in')}
                className="action-btn"
                size="small"
              />
            </Tooltip>
            
            <Tooltip title="缩小">
              <Button
                icon={<ZoomOutOutlined />}
                onClick={() => handleZoom('out')}
                className="action-btn"
                size="small"
              />
            </Tooltip>
            
            <Tooltip title="重置视图">
              <Button
                icon={<CompressOutlined />}
                onClick={handleResetView}
                className="action-btn"
                size="small"
              />
            </Tooltip>
            
            <Tooltip title="全屏">
              <Button
                icon={<FullscreenOutlined />}
                onClick={toggleFullscreen}
                className="action-btn"
                size="small"
              />
            </Tooltip>
            
            <Tooltip title="重新生成">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => onGenerate?.(file)}
                className="action-btn"
                size="small"
              />
            </Tooltip>

            <Tooltip title="生成可交互思维导图（JSON格式）">
              <Button
                icon={<BranchesOutlined />}
                onClick={handleGenerateJsonMindmap}
                className="action-btn"
                size="small"
                loading={loading}
              />
            </Tooltip>

            <Tooltip title="导出思维导图">
              <Space.Compact size="small">
                <Tooltip title={
                  !mindmapInstance || (typeof file?.mindmapData === 'string' && file.mindmapData.startsWith('/uploads/'))
                    ? "导出思维导图（需要JSON格式数据）"
                    : "导出思维导图（基于当前视图）"
                }>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => handleExport('png')}
                    className="action-btn"
                    disabled={!mindmapInstance || !file?.mindmapData || (typeof file?.mindmapData === 'string' && file.mindmapData.startsWith('/uploads/'))}
                  />
                </Tooltip>
                <Tooltip title={
                  typeof file?.mindmapData === 'string' && file.mindmapData.startsWith('/uploads/')
                    ? "下载思维导图图片"
                    : "生成高质量思维导图图片"
                }>
                  <Button
                    icon={<PictureOutlined />}
                    onClick={handleServerExport}
                    className="action-btn"
                    loading={exportLoading}
                    disabled={!file?.mindmapData}
                  />
                </Tooltip>
              </Space.Compact>
            </Tooltip>
          </Space>
        </div>
      </div>

      <Divider className="toolbar-divider" />

      {/* 思维导图容器 */}
      <Card className="mindmap-container" variant="outlined">
        <div
          ref={mindmapRef}
          className={`mindmap-canvas ${viewMode}`}
          style={{
            width: '100%',
            minHeight: '500px',
            height: containerHeight,
            maxHeight: '80vh',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderRadius: '12px',
            overflow: 'auto',
            position: 'relative'
          }}
        />
        
        {/* 控制提示 */}
        <div className="mindmap-controls-hint">
          <Space>
            <Text type="secondary" className="hint-text">
              💡 提示: 可以拖拽移动视图，Ctrl+滚轮缩放
            </Text>
          </Space>
        </div>
      </Card>

      {/* 思维导图信息 */}
      <Card className="mindmap-info" variant="outlined">
        <div className="info-content">
          <Space split={<Divider type="vertical" />} size="large">
            <div className="info-item">
              <Text type="secondary" className="info-label">节点数量</Text>
              <Text className="info-value">
                {file.mindmapData ? '已生成' : '未生成'}
              </Text>
            </div>
            <div className="info-item">
              <Text type="secondary" className="info-label">类型</Text>
              <Text className="info-value">
                {file.mindmapData ?
                  (typeof file.mindmapData === 'string' && file.mindmapData.startsWith('/uploads/') ?
                    '图片格式' :
                    '交互格式'
                  ) : '未知'
                }
              </Text>
            </div>
            <div className="info-item">
              <Text type="secondary" className="info-label">生成时间</Text>
              <Text className="info-value">
                {new Date().toLocaleString()}
              </Text>
            </div>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default ModernMindmapView;
