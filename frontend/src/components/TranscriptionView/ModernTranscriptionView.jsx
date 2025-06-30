/**
 * 现代化转录结果展示组件
 * 高端、友好、功能丰富的转录界面
 */

import { useState, useMemo } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Input, 
  Space, 
  Tag, 
  Tooltip, 
  Typography,
  Divider,
  Progress,
  Empty
} from 'antd';
import {
  SearchOutlined,
  DownloadOutlined,
  CopyOutlined,
  PlayCircleOutlined,
  SoundOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import './ModernTranscriptionView.css';

const { Text, Paragraph } = Typography;
const { Search } = Input;

const ModernTranscriptionView = ({
  transcriptionData = [],
  isLoading = false,
  onTimeSeek,
  currentTime = 0,
  className = ''
}) => {
  const [searchText, setSearchText] = useState('');

  // 格式化时间
  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };



  // 过滤数据
  const filteredData = useMemo(() => {
    return transcriptionData.filter(item => {
      const matchesSearch = !searchText ||
        item.text.toLowerCase().includes(searchText.toLowerCase());
      return matchesSearch;
    });
  }, [transcriptionData, searchText]);

  // 获取当前播放的行
  const getCurrentRow = () => {
    return transcriptionData.find(item => 
      currentTime >= item.start && currentTime <= item.end
    );
  };

  // 复制文本
  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    // message.success('文本已复制到剪贴板');
  };

  // 复制全部文本
  const copyAllText = () => {
    const allText = filteredData.map(item =>
      `[${formatTime(item.start)}] ${item.text}`
    ).join('\n');
    copyText(allText);
  };

  // 导出转录结果
  const exportTranscription = () => {
    const content = filteredData.map(item =>
      `[${formatTime(item.start)} - ${formatTime(item.end)}] ${item.text}`
    ).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcription.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 表格列定义
  const columns = [
    {
      title: '时间',
      dataIndex: 'start',
      key: 'time',
      width: 100,
      render: (start) => (
        <div className="time-cell">
          <Button
            type="text"
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={() => onTimeSeek?.(start)}
            className="time-btn"
          >
            {formatTime(start)}
          </Button>
          {getCurrentRow()?.start === start && (
            <div className="playing-indicator">
              <SoundOutlined className="sound-icon" />
            </div>
          )}
        </div>
      ),
    },

    {
      title: '内容',
      dataIndex: 'text',
      key: 'text',
      render: (text, record) => (
        <div className="content-cell">
          <Paragraph 
            className={`transcript-text ${getCurrentRow()?.start === record.start ? 'current' : ''}`}
            copyable={{
              text: text,
              tooltips: ['复制', '已复制'],
              icon: <CopyOutlined />,
            }}
          >
            {text}
          </Paragraph>
          <div className="content-meta">
            <Text type="secondary" className="duration">
              <ClockCircleOutlined /> {formatTime(record.end - record.start)}
            </Text>
          </div>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <Card className={`modern-transcription-view loading ${className}`} variant="outlined">
        <div className="loading-container">
          <Progress 
            type="circle" 
            percent={75} 
            strokeColor={{
              '0%': '#6366f1',
              '100%': '#8b5cf6',
            }}
          />
          <Text className="loading-text">正在处理转录结果...</Text>
        </div>
      </Card>
    );
  }

  if (!transcriptionData || transcriptionData.length === 0) {
    return (
      <Card className={`modern-transcription-view empty ${className}`} variant="outlined">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无转录结果"
          className="empty-state"
        >
          <Text type="secondary">请先上传文件并开始转录</Text>
        </Empty>
      </Card>
    );
  }

  return (
    <Card className={`modern-transcription-view ${className}`} variant="outlined">
      {/* 头部工具栏 */}
      <div className="transcription-header">
        <div className="header-left">
          <h3 className="section-title">转录结果</h3>
          <Tag color="success" className="result-count">
            {filteredData.length} 条记录
          </Tag>
        </div>
        
        <div className="header-right">
          <Space>
            <Search
              placeholder="搜索转录内容"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 200 }}
              prefix={<SearchOutlined />}
              allowClear
            />
            

            
            <Tooltip title="复制全部文本">
              <Button
                icon={<CopyOutlined />}
                onClick={copyAllText}
                className="action-btn"
              />
            </Tooltip>
            
            <Tooltip title="导出转录结果">
              <Button
                icon={<DownloadOutlined />}
                onClick={exportTranscription}
                className="action-btn"
              />
            </Tooltip>
          </Space>
        </div>
      </div>

      <Divider className="header-divider" />

      {/* 转录表格 */}
      <div className="transcription-table-container">
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey={(record) => `${record.start}-${record.end}`}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          className="transcription-table"
          rowClassName={(record) => 
            getCurrentRow()?.start === record.start ? 'current-row' : ''
          }
          scroll={{ y: 400 }}
        />
      </div>

      {/* 统计信息 */}
      <div className="transcription-stats">
        <Space split={<Divider type="vertical" />}>
          <Text type="secondary">
            总时长: {formatTime(transcriptionData[transcriptionData.length - 1]?.end || 0)}
          </Text>
          <Text type="secondary">
            字数: {transcriptionData.reduce((sum, item) => sum + item.text.length, 0)}
          </Text>
        </Space>
      </div>
    </Card>
  );
};

export default ModernTranscriptionView;
