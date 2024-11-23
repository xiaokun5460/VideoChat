import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Layout, Upload, Button, Input, Card, message, Table, Tabs } from 'antd';
import { UploadOutlined, SendOutlined, SoundOutlined, SyncOutlined, DownloadOutlined, CopyOutlined, StopOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import Mermaid from 'mermaid';
import './App.css';
import jsMind from 'jsmind';
import 'jsmind/style/jsmind.css';

const { TextArea } = Input;

function App() {
    const [transcription, setTranscription] = useState([]);
    const [summary, setSummary] = useState('');
    // eslint-disable-next-line no-unused-vars
    const [mindmap, setMindmap] = useState('');
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [mediaUrl, setMediaUrl] = useState(null);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [isMindmapLoading, setIsMindmapLoading] = useState(false);
    const mediaRef = useRef(null);
    const [detailedSummary, setDetailedSummary] = useState('');
    const [isUserScrolling, setIsUserScrolling] = useState(false);
    const messagesEndRef = useRef(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const abortController = useRef(null);
    const [isComposing, setIsComposing] = useState(false);
    const mindmapContainerRef = useRef(null);
    const jmInstanceRef = useRef(null);
    const [mindmapData, setMindmapData] = useState(null);

    // 初始化 Mermaid
    React.useEffect(() => {
        Mermaid.initialize({
            startOnLoad: true,
            theme: 'default',
            securityLevel: 'loose',
            mindmap: {
                padding: 20,
                curve: 'basis',
                nodeSpacing: 100,
                rankSpacing: 80,
                fontSize: 14,
                wrap: true,
                useMaxWidth: true
            },
            themeVariables: {
                mindmapNode: '#7CB342',
                mindmapNodeBorder: '#558B2F',
                mindmapHover: '#AED581',
                mindmapBorder: '#558B2F',
                primaryColor: '#7CB342',
                lineColor: '#558B2F',
                textColor: '#37474F'
            }
        });
    }, []);

    const handleUpload = async (file) => {
        // 检查文件类型
        const isVideo = file.type.startsWith('video/');
        const isAudio = file.type.startsWith('audio/');

        if (!isVideo && !isAudio) {
            message.error('请上传视频或音频文件');
            return false;
        }

        // 创建文件的URL
        const url = URL.createObjectURL(file);
        setMediaUrl({ url, type: isVideo ? 'video' : 'audio', file });

        // 自动开始转录
        message.loading('开始上传并转录...', 0);
        const formData = new FormData();
        formData.append('file', file, file.name);

        try {
            setIsTranscribing(true);
            const response = await fetch('http://localhost:8000/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('转录失败');
            }

            const data = await response.json();
            setTranscription(data.transcription);
            message.success('转录完成！');
        } catch (error) {
            console.error('Transcription failed:', error);
            message.error('转录失败：' + error.message);
        } finally {
            setIsTranscribing(false);
            message.destroy(); // 清除loading消息
        }

        return false; // 阻止自动上传
    };

    // 检查是否有转录结果的函数
    const checkTranscription = () => {
        if (!transcription || transcription.length === 0) {
            message.warning('请先上传视频/音频并完成转录');
            return false;
        }
        return true;
    };

    // 修改简单总结函数
    const handleSummary = async () => {
        if (!checkTranscription()) return;

        const text = transcription.map(item => item.text).join('\n');
        try {
            setSummary(''); // 清空现有总结
            const response = await fetch('http://localhost:8000/api/summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text }),
            });

            if (!response.ok) {
                throw new Error('生成总结失败');
            }

            // 使用 ReadableStream 处理式响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let summaryText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                // 解码并添加新的文本块
                const chunk = decoder.decode(value, { stream: true });
                summaryText += chunk;

                // 尝试解析 JSON，如果是 JSON 则提取文本内容
                try {
                    const jsonResponse = JSON.parse(summaryText);
                    setSummary(jsonResponse.summary || summaryText);
                } catch {
                    // 如果不是 JSON，直接使用文本
                    setSummary(summaryText);
                }
            }

            const summaryContent = document.querySelector('.markdown-content');
            if (summaryContent) {
                summaryContent.scrollTop = summaryContent.scrollHeight;
            }
        } catch (error) {
            console.error('Summary generation failed:', error);
            message.error('生成总结失败：' + error.message);
        }
    };

    // 使用 useEffect 监听 mindmapData 的变化
    useEffect(() => {
        if (mindmapData && !isMindmapLoading) {
            const container = document.getElementById('mindmap_container');
            if (!container) return;

            // 清空容器
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }

            try {
                const options = {
                    container: 'mindmap_container',
                    theme: 'primary',
                    editable: false,
                    view: {
                        hmargin: 100,
                        vmargin: 50,
                        line_width: 2,
                        line_color: '#558B2F'
                    },
                    layout: {
                        hspace: 30,
                        vspace: 20,
                        pspace: 13
                    }
                };

                const jm = new jsMind(options);
                const data = typeof mindmapData === 'string'
                    ? JSON.parse(mindmapData)
                    : mindmapData;

                jm.show(data);
            } catch (error) {
                console.error('Failed to render mindmap:', error);
                container.innerHTML = '<div class="mindmap-error">思维导图渲染失败</div>';
            }
        }
    }, [mindmapData, isMindmapLoading]);

    // 修改生成思维导图的函数
    const handleMindmap = async () => {
        if (!checkTranscription()) return;

        const text = transcription.map(item => item.text).join('\n');
        try {
            setIsMindmapLoading(true);
            setMindmapData(null);  // 清空现有数据

            const response = await fetch('http://localhost:8000/api/mindmap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text }),
            });

            if (!response.ok) {
                throw new Error('生成思维导图失败');
            }

            const data = await response.json();
            setMindmapData(data.mindmap);  // 设置新数据
        } catch (error) {
            console.error('Failed to generate mindmap:', error);
            message.error('生成思维导图失败：' + error.message);
        } finally {
            setIsMindmapLoading(false);
        }
    };

    // 在组件卸载时清理
    useEffect(() => {
        return () => {
            if (jmInstanceRef.current) {
                jmInstanceRef.current = null;
            }
        };
    }, []);

    // 修改 jsMind 的初始化和主题注册
    useEffect(() => {
        // 创建自定义主题
        const customTheme = {
            'background': '#fff',
            'color': '#333',

            'main-color': '#333',
            'main-radius': '4px',
            'main-background-color': '#f0f2f5',
            'main-padding': '10px',
            'main-margin': '0px',
            'main-font-size': '16px',
            'main-font-weight': 'bold',

            'sub-color': '#333',
            'sub-radius': '4px',
            'sub-background-color': '#fff',
            'sub-padding': '8px',
            'sub-margin': '0px',
            'sub-font-size': '14px',
            'sub-font-weight': 'normal',

            'line-width': '2px',
            'line-color': '#558B2F',
        };

        // 注册主题和样式
        if (jsMind.hasOwnProperty('register_theme')) {
            jsMind.register_theme('primary', customTheme);
        } else if (jsMind.hasOwnProperty('util') && jsMind.util.hasOwnProperty('register_theme')) {
            jsMind.util.register_theme('primary', customTheme);
        }

        // 注册节点样式
        const nodeStyles = {
            important: {
                'background-color': '#e6f7ff',
                'border-radius': '4px',
                'padding': '4px 8px',
                'border': '1px solid #91d5ff'
            }
        };

        if (jsMind.hasOwnProperty('register_node_style')) {
            Object.keys(nodeStyles).forEach(style => {
                jsMind.register_node_style(style, nodeStyles[style]);
            });
        } else if (jsMind.hasOwnProperty('util') && jsMind.util.hasOwnProperty('register_node_style')) {
            Object.keys(nodeStyles).forEach(style => {
                jsMind.util.register_node_style(style, nodeStyles[style]);
            });
        }
    }, []);

    // 修改发送消息函数
    const handleSendMessage = async () => {
        // 如果正在生成，则停止生成
        if (isGenerating) {
            abortController.current?.abort();
            setIsGenerating(false);
            // 更新最后一条消息为"已停止生成"
            setMessages(prevMessages => {
                const newMessages = [...prevMessages];
                if (newMessages.length > 0) {
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage.role === 'assistant') {
                        lastMessage.content += '\n\n*[已停止生成]*';
                    }
                }
                return newMessages;
            });
            return;
        }

        // 检查转录和输入
        if (!checkTranscription()) return;
        if (!inputMessage.trim()) {
            message.warning('请输入消息内容');
            return;
        }

        const newMessage = { role: 'user', content: inputMessage };
        const currentMessages = [...messages, newMessage];
        setMessages(currentMessages);
        setInputMessage('');
        setIsGenerating(true);

        // 创建新的 AbortController
        abortController.current = new AbortController();

        try {
            const response = await fetch('http://localhost:8000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: currentMessages,
                    context: transcription.map(item => item.text).join('\n'),
                }),
                signal: abortController.current.signal
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const reader = response.body.getReader();
            let aiResponse = '';

            // 创建 AI 消息占位
            setMessages([...currentMessages, { role: 'assistant', content: '' }]);

            while (true) {
                try {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = new TextDecoder().decode(value);
                    aiResponse += chunk;

                    setMessages([
                        ...currentMessages,
                        { role: 'assistant', content: aiResponse }
                    ]);
                } catch (error) {
                    if (error.name === 'AbortError') {
                        // 在被中断时立即退出循环
                        break;
                    }
                    throw error;
                }
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                message.info('已停止生成');
            } else {
                console.error('Error sending message:', error);
                message.error('发送消息失败：' + error.message);
            }
        } finally {
            setIsGenerating(false);
            abortController.current = null;
        }
    };

    // 添加时点转函数
    const handleTimeClick = (time) => {
        if (mediaRef.current) {
            mediaRef.current.currentTime = time;
            mediaRef.current.play();
        }
    };

    // 添加时间格式化函数
    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // 定义表格列
    const transcriptionColumns = [
        {
            title: '时间点',
            dataIndex: 'time',
            key: 'time',
            width: '30%',
            render: (_, record) => (
                <Button
                    type="link"
                    onClick={() => handleTimeClick(record.start)}
                    style={{ padding: 0 }}
                >
                    [{formatTime(record.start)} - {formatTime(record.end)}]
                </Button>
            ),
        },
        {
            title: '内容',
            dataIndex: 'text',
            key: 'text',
        },
    ];

    // 添加导出函数
    const handleExport = async (format) => {
        if (!transcription || transcription.length === 0) {
            message.warning('没有可导出的转录内容');
            return;
        }

        try {
            const response = await fetch(`http://localhost:8000/api/export/${format}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(transcription),
            });

            if (!response.ok) {
                throw new Error('导出失败');
            }

            // 获取文件名
            const contentDisposition = response.headers.get('content-disposition');
            let filename = `transcription.${format}`;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }

            // 下载文件
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            message.success('导出成功');
        } catch (error) {
            console.error('Export failed:', error);
            message.error('导出失败：' + error.message);
        }
    };

    // 添加详细总结函数
    const handleDetailedSummary = async () => {
        if (!checkTranscription()) return;

        const text = transcription.map(item => item.text).join('\n');
        try {
            setDetailedSummary(''); // 清空现有总结
            const response = await fetch('http://localhost:8000/api/detailed-summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text }),
            });

            if (!response.ok) {
                throw new Error('生成详细总结失败');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let summaryText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                summaryText += chunk;
                setDetailedSummary(summaryText);
            }

            // 滚动到底部
            const summaryContent = document.querySelector('.detailed-summary-content');
            if (summaryContent) {
                summaryContent.scrollTop = summaryContent.scrollHeight;
            }
        } catch (error) {
            console.error('Detailed summary generation failed:', error);
            message.error('生成详细总结失败：' + error.message);
        }
    };

    // 添加导出总结函数
    const handleExportSummary = async (summaryText, type = 'summary') => {
        if (!summaryText) {
            message.warning('没有可导出的内容');
            return;
        }

        try {
            const response = await fetch(`http://localhost:8000/api/export/summary`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(summaryText),
            });

            if (!response.ok) {
                throw new Error('导出失败');
            }

            // 下载文件
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}_${new Date().toISOString().slice(0, 10)}.md`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            message.success('导出成功');
        } catch (error) {
            console.error('Export failed:', error);
            message.error('导出失败：' + error.message);
        }
    };

    // 添加复制功能
    const handleCopyMessage = (content) => {
        navigator.clipboard.writeText(content)
            .then(() => {
                message.success('复制成功');
            })
            .catch(() => {
                message.error('复制失败');
            });
    };

    // 添加滚动处理函数
    const handleScroll = (e) => {
        const element = e.target;
        const isScrolledToBottom = Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 10;
        setIsUserScrolling(!isScrolledToBottom);
    };

    // 添加滚动到底部的函数
    const scrollToBottom = useCallback(() => {
        if (messagesEndRef.current && !isUserScrolling) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [isUserScrolling]);

    // 监听消息变化，自动滚动
    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // 修改标签页内容
    const tabItems = [
        {
            key: '1',
            label: '简单总结',
            children: (
                <div className="tab-content">
                    <div className="button-group">
                        <Button
                            onClick={handleSummary}
                            disabled={!transcription || transcription.length === 0}
                        >
                            生成总结
                        </Button>
                        <Button
                            onClick={() => handleExportSummary(summary)}
                            icon={<DownloadOutlined />}
                            disabled={!summary}
                        >
                            导出总结
                        </Button>
                    </div>
                    {(!transcription || transcription.length === 0) && (
                        <div className="empty-state">
                            <p>请先上传视频/音频并完成转录</p>
                        </div>
                    )}
                    <div className="markdown-content">
                        <ReactMarkdown>{summary}</ReactMarkdown>
                    </div>
                </div>
            ),
        },
        {
            key: '2',
            label: '详细总结',
            children: (
                <div className="tab-content">
                    <div className="button-group">
                        <Button
                            onClick={handleDetailedSummary}
                            disabled={!transcription || transcription.length === 0}
                        >
                            生成详细总结
                        </Button>
                        <Button
                            onClick={() => handleExportSummary(detailedSummary, 'detailed_summary')}
                            icon={<DownloadOutlined />}
                            disabled={!detailedSummary}
                        >
                            导出总结
                        </Button>
                    </div>
                    {(!transcription || transcription.length === 0) && (
                        <div className="empty-state">
                            <p>请先上传视频/音频并完成转录</p>
                        </div>
                    )}
                    <div className="markdown-content detailed-summary-content">
                        <ReactMarkdown>{detailedSummary}</ReactMarkdown>
                    </div>
                </div>
            ),
        },
        {
            key: '3',
            label: '思维导图',
            children: (
                <div className="tab-content">
                    <Button
                        onClick={handleMindmap}
                        loading={isMindmapLoading}
                        disabled={isMindmapLoading || !transcription || transcription.length === 0}
                    >
                        {isMindmapLoading ? '生成中...' : '生成思维导图'}
                    </Button>
                    {(!transcription || transcription.length === 0) && (
                        <div className="empty-state">
                            <p>请先上传视频/音频并完成转录</p>
                        </div>
                    )}
                    <div id="mindmap_container" className="mindmap-container">
                        {isMindmapLoading && (
                            <div className="mindmap-loading">
                                <div className="loading-spinner"></div>
                                <p>正在生成思维导图...</p>
                            </div>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: '4',
            label: '对话交互',
            children: (
                <div className="tab-content chat-tab">
                    {(!transcription || transcription.length === 0) ? (
                        <div className="empty-state">
                            <p>请先上传视频/音频并完成转录</p>
                        </div>
                    ) : (
                        <>
                            <div
                                className="chat-messages"
                                onScroll={handleScroll}
                            >
                                {messages.map((msg, index) => (
                                    <div
                                        key={index}
                                        className={`message-wrapper ${msg.role === 'user' ? 'user' : 'assistant'}`}
                                    >
                                        <div className="message-bubble">
                                            <div className="message-content">
                                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                                            </div>
                                            <Button
                                                type="text"
                                                className="copy-button"
                                                icon={<CopyOutlined />}
                                                onClick={() => handleCopyMessage(msg.content)}
                                            >
                                                复制
                                            </Button>
                                        </div>
                                        <div className="message-time">
                                            {new Date().toLocaleTimeString()}
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} /> {/* 添加一个用于滚动的参考元素 */}
                            </div>
                            <div className="chat-input-area">
                                <TextArea
                                    value={inputMessage}
                                    onChange={e => setInputMessage(e.target.value)}
                                    onCompositionStart={() => setIsComposing(true)}
                                    onCompositionEnd={() => setIsComposing(false)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            if (!isComposing) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }
                                    }}
                                    placeholder="输入消息，按Enter发送，Shift+Enter换行"
                                    autoSize={{ minRows: 1, maxRows: 4 }}
                                    disabled={isGenerating}
                                />
                                <Button
                                    type="primary"
                                    icon={isGenerating ? <StopOutlined /> : <SendOutlined />}
                                    onClick={handleSendMessage}
                                    danger={isGenerating}
                                >
                                    {isGenerating ? '停止' : '发送'}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            ),
        },
    ];

    // 修改左侧标签页内容
    const leftTabItems = [
        {
            key: '1',
            label: '视频预览',
            children: (
                <div className="tab-content">
                    <div className="preview-section">
                        {mediaUrl ? (
                            <div className="media-preview">
                                {mediaUrl.type === 'video' ? (
                                    <div className="video-container">
                                        <video
                                            ref={mediaRef}
                                            src={mediaUrl.url}
                                            controls
                                            className="video-player"
                                        />
                                    </div>
                                ) : (
                                    <div className="audio-container">
                                        <div className="audio-placeholder">
                                            <SoundOutlined style={{ fontSize: '24px' }} />
                                            <span>音频文件</span>
                                        </div>
                                        <audio
                                            ref={mediaRef}
                                            src={mediaUrl.url}
                                            controls
                                            className="audio-player"
                                        />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="upload-placeholder">
                                <div className="placeholder-content">
                                    <div className="placeholder-icon">
                                        <UploadOutlined style={{ fontSize: '48px', color: '#999' }} />
                                    </div>
                                    <p>等待上传本地文件</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="transcription-section">
                        <div className="section-header">
                            <div className="section-title">
                                <h3>转录结果</h3>
                                {isTranscribing && (
                                    <div className="transcription-progress">
                                        <SyncOutlined spin />
                                        <span>正在转录中...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <Table
                            dataSource={transcription.map((item, index) => ({
                                ...item,
                                key: index,
                            }))}
                            columns={transcriptionColumns}
                            pagination={false}
                            size="small"
                            className="transcription-table"
                        />
                    </div>
                </div>
            ),
        },
        {
            key: '2',
            label: '转录结果',
            children: (
                <div className="tab-content">
                    <div className="section-header">
                        <div className="section-title">
                            <h3>转录结果</h3>
                            {isTranscribing && (
                                <div className="transcription-progress">
                                    <SyncOutlined spin />
                                    <span>正在转录中...</span>
                                </div>
                            )}
                        </div>
                        <div className="export-buttons">
                            <Button.Group size="small">
                                <Button
                                    onClick={() => handleExport('vtt')}
                                    icon={<DownloadOutlined />}
                                    disabled={!transcription.length}
                                >
                                    VTT
                                </Button>
                                <Button
                                    onClick={() => handleExport('srt')}
                                    icon={<DownloadOutlined />}
                                    disabled={!transcription.length}
                                >
                                    SRT
                                </Button>
                                <Button
                                    onClick={() => handleExport('txt')}
                                    icon={<DownloadOutlined />}
                                    disabled={!transcription.length}
                                >
                                    TXT
                                </Button>
                            </Button.Group>
                        </div>
                    </div>
                    <Table
                        dataSource={transcription.map((item, index) => ({
                            ...item,
                            key: index,
                        }))}
                        columns={transcriptionColumns}
                        pagination={false}
                        size="small"
                        className="transcription-table full-height"
                    />
                </div>
            ),
        },
    ];

    return (
        <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
            <div className="app-header" style={{ background: '#fff' }}>
                <div className="title">
                    <h1 style={{ color: '#000' }}>VideoChat：一键总结视频与音频内容｜帮助解读的 AI 助手</h1>
                </div>
                <div className="upload-section">
                    <Upload
                        beforeUpload={handleUpload}
                        accept="video/*,audio/*"
                        showUploadList={false}
                    >
                        <Button icon={<UploadOutlined />}>
                            上传本地文件
                        </Button>
                    </Upload>
                </div>
                <div className="support-text">
                    支持视频和音频文件格式
                </div>
            </div>

            <div className="app-content">
                <div className="main-layout">
                    <div className="media-panel">
                        <Card className="media-card">
                            <Tabs items={leftTabItems} />
                        </Card>
                    </div>

                    <div className="feature-panel">
                        <Card className="feature-card">
                            <Tabs items={tabItems} />
                        </Card>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default App;
