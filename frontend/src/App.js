import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Layout, Upload, Button, Input, Card, message, Table, Tabs, Pagination } from 'antd';
import { UploadOutlined, SendOutlined, SoundOutlined, SyncOutlined, DownloadOutlined, CopyOutlined, StopOutlined, DeleteOutlined, GithubOutlined } from '@ant-design/icons';
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
    const jmInstanceRef = useRef(null);
    const [mindmapData, setMindmapData] = useState(null);
    const [uploadedFiles, setUploadedFiles] = useState([]);  // 存储上传的文件列表
    const [selectedFiles, setSelectedFiles] = useState([]);  // 存储选中的文件
    const [currentFile, setCurrentFile] = useState(null);    // 当前预览的文件
    const [pageSize, setPageSize] = useState(5); // 默认每页显示5个文件
    const [currentPage, setCurrentPage] = useState(1); // 添加当前页码状态
    const [abortTranscribing, setAbortTranscribing] = useState(false); // 添加停止转录状态

    // 打印 uploadedFiles 的变化
    useEffect(() => {
        console.log('Uploaded Files:', uploadedFiles);
    }, [uploadedFiles]);

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

        // 检查文件是否已经存在
        const isExist = uploadedFiles.some(f => f.name === file.name);
        if (isExist) {
            message.warning('文件已存在');
            return false;
        }

        // 创建文件的URL
        const url = URL.createObjectURL(file);
        const newFile = {
            id: `${file.name}-${Date.now()}`,
            name: file.name,
            type: isVideo ? 'video' : 'audio',
            url: url,
            file: file,
            status: 'waiting',
            transcription: null,
            summary: '',
            detailedSummary: '',
            mindmapData: null,
        };

        setUploadedFiles(prev => [...prev, newFile]);

        // 如果是第一个文件，动设置为当前预览文件
        if (uploadedFiles.length === 0) {
            setCurrentFile(newFile);
            setMediaUrl({ url, type: isVideo ? 'video' : 'audio' });
        }

        return false; // 阻止自动上传
    };

    // 处理文件选择
    const handleFileSelect = (fileIds) => {
        setSelectedFiles(fileIds);
    };

    // 添加分页配置
    const paginationConfig = {
        current: currentPage, // 当前页码
        pageSize: pageSize,
        showSizeChanger: true,
        pageSizeOptions: ['5', '10', '20', '50'],
        showTotal: (total) => `共 ${total} 个文件`,
        onChange: (page, size) => {
            setCurrentPage(page); // 更新当前页码
            setPageSize(size); // 更新每页显示数量
        },
        onShowSizeChange: (current, size) => {
            setCurrentPage(1); // 切换每页显示数量时重置为第一页
            setPageSize(size);
        },
    };

    // 计算当前页应该显示的文件
    const getPageData = () => {
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        return uploadedFiles.slice(start, end);
    };

    // 文件列表列定
    const fileColumns = [
        {
            title: '文件名',
            dataIndex: 'name',
            key: 'name',
            width: '70%',
        },
        {
            title: '类型',
            dataIndex: 'type',
            key: 'type',
            render: (type) => type === 'video' ? '视频' : '音频',
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                switch (status) {
                    case 'waiting': return '等待转录';
                    case 'transcribing': return <><SyncOutlined spin /> 转录中</>;
                    case 'done': return <span style={{ color: '#52c41a' }}>已完成</span>;
                    case 'error': return <span style={{ color: '#ff4d4f' }}>失败</span>;
                    case 'interrupted': return <span style={{ color: '#faad14' }}>转录中断</span>;
                    default: return status;
                }
            },
        },
        {
            title: '操作',
            key: 'action',
            render: (_, record) => (
                <Button
                    type="text"
                    danger
                    onClick={(e) => {
                        e.stopPropagation();
                        handleFileDelete(record.id);
                    }}
                    icon={<DeleteOutlined />}
                    disabled={record.status === 'transcribing'}
                >
                    删除
                </Button>
            ),
        },
    ];

    // 处理文件删除
    const handleFileDelete = (fileId) => {
        setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
        setSelectedFiles(prev => prev.filter(id => id !== fileId));

        if (currentFile?.id === fileId) {
            const remainingFiles = uploadedFiles.filter(file => file.id !== fileId);
            const nextFile = remainingFiles[0];
            if (nextFile) {
                setCurrentFile(nextFile);
                setMediaUrl({ url: nextFile.url, type: nextFile.type });
                if (nextFile.transcription) {
                    setTranscription(nextFile.transcription);
                } else {
                    setTranscription([]);
                }
            } else {
                setCurrentFile(null);
                setMediaUrl(null);
                setTranscription([]);
            }
        }
    };

    // 处理文件预览切换
    const handleFilePreview = (file) => {
        setCurrentFile(file);
        setMediaUrl({ url: file.url, type: file.type });

        // 更新转录结果和其他内容
        if (file.transcription) {
            setTranscription(file.transcription);
            // 更新其他内容状态
            setSummary(file.summary || '');
            setDetailedSummary(file.detailedSummary || '');
            setMindmapData(file.mindmapData);
        } else {
            setTranscription([]);
            setSummary('');
            setDetailedSummary('');
            setMindmapData(null);
        }
    };

    // 修改批量转录函数
    const handleBatchTranscribe = async () => {
        if (isTranscribing) {
            setIsTranscribing(false);  // 立即更新状态
            setAbortTranscribing(true);

            try {
                const response = await fetch('http://localhost:8000/api/stop-transcribe', {
                    method: 'POST',
                });

                if (!response.ok) {
                    throw new Error('停止转录失败');
                }

                // 只将正在转录的文件状态改为中断
                setUploadedFiles(prev => prev.map(f =>
                    f.status === 'transcribing'
                        ? { ...f, status: 'interrupted' }
                        : f
                ));

                message.success('已停止转录');
            } catch (error) {
                console.error('Failed to stop transcription:', error);
                message.error('停止转录失败：' + error.message);
            } finally {
                setAbortTranscribing(false);
            }
            return;
        }

        if (selectedFiles.length === 0) {
            message.warning('请选需要转录的文件');
            return;
        }

        setIsTranscribing(true);
        setAbortTranscribing(false);
        message.loading('开始转录选中的文件...', 0);

        try {
            for (const fileId of selectedFiles) {
                // 检查是否已经请求中断
                if (abortTranscribing) {
                    // 只将当前正在转录的文件状态改为中断
                    setUploadedFiles(prev => prev.map(f =>
                        f.status === 'transcribing'
                            ? { ...f, status: 'interrupted' }
                            : f
                    ));
                    break;
                }

                const file = uploadedFiles.find(f => f.id === fileId);
                if (!file) continue;

                // 修改这里：只跳过已完成的文件，允许中断状态的文件重新转录
                if (file.status === 'done') {
                    message.info(`文件 "${file.name}" 已经转录完成，跳过此文件。`);
                    continue;
                }

                // 更新文件状态为转录中
                setUploadedFiles(prev => prev.map(f =>
                    f.id === fileId ? { ...f, status: 'transcribing' } : f
                ));

                try {
                    const formData = new FormData();
                    formData.append('file', file.file, file.name);

                    const response = await fetch('http://localhost:8000/api/upload', {
                        method: 'POST',
                        body: formData,
                    });

                    const data = await response.json();

                    if (response.status === 499) {
                        // 处理转录中断的情况，只更新当前文件状态
                        setUploadedFiles(prev => prev.map(f =>
                            f.id === fileId
                                ? { ...f, status: 'interrupted' }
                                : f
                        ));
                        break; // 中断后续文件的转录
                    }

                    if (!response.ok) {
                        throw new Error(`转录失败: ${file.name}`);
                    }

                    if (!abortTranscribing) {  // 添加检查，确保没有中断请求
                        setUploadedFiles(prev => prev.map(f =>
                            f.id === fileId ? {
                                ...f,
                                status: 'done',
                                transcription: data.transcription
                            } : f
                        ));

                        if (currentFile?.id === fileId) {
                            setTranscription(data.transcription);
                        }
                    }
                } catch (error) {
                    if (!abortTranscribing) {  // 添加检查，确保没有中断请求
                        setUploadedFiles(prev => prev.map(f =>
                            f.id === fileId ? { ...f, status: 'error' } : f
                        ));
                        message.error(`文件 "${file.name}" 转录失败：${error.message}`);
                    }
                }
            }
        } catch (error) {
            console.error('Transcription failed:', error);
            message.error('转录失败：' + error.message);
        } finally {
            setIsTranscribing(false);
            setAbortTranscribing(false);
            message.destroy();
        }
    };

    // 检查是否有转录结果的函数
    const checkTranscription = () => {
        if (!transcription || transcription.length === 0) {
            message.warning('需等待视频/音频完成转录');
            return false;
        }
        return true;
    };

    // 修改简单总结函数
    const handleSummary = async () => {
        if (!checkTranscription()) return;

        const text = transcription.map(item => item.text).join('\n');
        try {
            setSummary(''); // 清空当前显示的总结
            const response = await fetch('http://localhost:8000/api/summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text }),
            });

            if (!response.ok) {
                throw new Error('生成总结失败');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let summaryText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                summaryText += chunk;

                try {
                    const jsonResponse = JSON.parse(summaryText);
                    setSummary(jsonResponse.summary || summaryText);
                } catch {
                    setSummary(summaryText);
                }
            }

            // 更新文件对象中的总结内容
            setUploadedFiles(prev => prev.map(f =>
                f.id === currentFile.id ? { ...f, summary: summaryText } : f
            ));

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
            setMindmapData(null);

            // 清空思维导图容器
            const container = document.getElementById('mindmap_container');
            if (container) {
                while (container.firstChild) {
                    container.removeChild(container.firstChild);
                }
                const loadingDiv = document.createElement('div');
                loadingDiv.className = 'mindmap-loading';
                loadingDiv.innerHTML = `
                    <div class="loading-spinner"></div>
                    <p>正在生成思维导图...</p>
                `;
                container.appendChild(loadingDiv);
            }

            const response = await fetch('http://localhost:8000/api/mindmap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text }),
            });

            if (!response.ok) {
                throw new Error('生成思维导图失败');
            }

            const data = await response.json();
            setMindmapData(data.mindmap);

            // 更新文件对象中的思维导图数据
            setUploadedFiles(prev => prev.map(f =>
                f.id === currentFile.id ? { ...f, mindmapData: data.mindmap } : f
            ));

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

        // 册主和样式
        if (jsMind.hasOwnProperty('register_theme')) {
            jsMind.register_theme('primary', customTheme);
        } else if (jsMind.hasOwnProperty('util') && jsMind.util.hasOwnProperty('register_theme')) {
            jsMind.util.register_theme('primary', customTheme);
        }

        // 注册节点式
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
            // 更新最后一条息为"已停止生成"
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

            // 创建 AI 息占位
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

    // 修改导出函数
    const handleExport = async (format) => {
        // 检查是否有选中的文件
        if (selectedFiles.length === 0) {
            message.warning('请选择需要导出的文件');
            return;
        }

        try {
            // 显示导出进度
            message.loading('正在导出选中的文件...', 0);

            // 遍历选中的文件
            for (const fileId of selectedFiles) {
                const file = uploadedFiles.find(f => f.id === fileId);

                // 检查文件是否有转录结果
                if (!file || !file.transcription || file.transcription.length === 0) {
                    message.warning(`文件 "${file?.name}" 没有转录结果，已跳过`);
                    continue;
                }

                try {
                    const response = await fetch(`http://localhost:8000/api/export/${format}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(file.transcription),
                    });

                    if (!response.ok) {
                        throw new Error(`导出失败: ${file.name}`);
                    }

                    // 获取文件名
                    const contentDisposition = response.headers.get('content-disposition');
                    let filename = `${file.name.replace(/\.[^/.]+$/, '')}_transcription.${format}`;
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

                    message.success(`文件 "${file.name}" 导出成`);
                } catch (error) {
                    message.error(`文件 "${file.name}" 导出失败：${error.message}`);
                }
            }
        } catch (error) {
            console.error('Export failed:', error);
            message.error('导出失败：' + error.message);
        } finally {
            message.destroy(); // 清除loading消息
        }
    };

    // 修改详细总结函数
    const handleDetailedSummary = async () => {
        if (!checkTranscription()) return;

        const text = transcription.map(item => item.text).join('\n');
        try {
            setDetailedSummary('');
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

            // 更新文件对象中的详细总结内容
            setUploadedFiles(prev => prev.map(f =>
                f.id === currentFile.id ? { ...f, detailedSummary: summaryText } : f
            ));

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

            message.success('导出功');
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

    // 添加全部删除的处理函数
    const handleDeleteAll = () => {
        if (selectedFiles.length === 0) {
            message.warning('请选择需要删除的文件');
            return;
        }

        // 删除选中的文件
        setUploadedFiles(prev => prev.filter(file => !selectedFiles.includes(file.id)));
        setSelectedFiles([]); // 清空选中状态

        // 如果当前预览的文件被删除，则切换到第一个可用文件
        if (currentFile && selectedFiles.includes(currentFile.id)) {
            const remainingFiles = uploadedFiles.filter(file => !selectedFiles.includes(file.id));
            const nextFile = remainingFiles[0];
            if (nextFile) {
                setCurrentFile(nextFile);
                setMediaUrl({ url: nextFile.url, type: nextFile.type });
                if (nextFile.transcription) {
                    setTranscription(nextFile.transcription);
                } else {
                    setTranscription([]);
                }
            } else {
                setCurrentFile(null);
                setMediaUrl(null);
                setTranscription([]);
            }
        }

        message.success('已删除选中的文件');
    };

    // 添加一个函数来计算选中的已转录文件数量
    const getSelectedTranscribedFilesCount = () => {
        return uploadedFiles.filter(file =>
            selectedFiles.includes(file.id) && file.status === 'done'
        ).length;
    };

    // 修改标签页内容
    const tabItems = [
        {
            key: '1',
            label: '转录结果',
            children: (
                <div className="tab-content">
                    <div className="export-section">
                        <div className="selection-tip">
                            {selectedFiles.length > 0 && (
                                <span>已选择 {getSelectedTranscribedFilesCount()} 个转录文件</span>
                            )}
                        </div>
                        <div className="export-buttons">
                            <Button.Group size="small">
                                <Button
                                    onClick={() => handleExport('vtt')}
                                    icon={<DownloadOutlined />}
                                    disabled={!currentFile?.transcription}
                                >
                                    VTT
                                </Button>
                                <Button
                                    onClick={() => handleExport('srt')}
                                    icon={<DownloadOutlined />}
                                    disabled={!currentFile?.transcription}
                                >
                                    SRT
                                </Button>
                                <Button
                                    onClick={() => handleExport('txt')}
                                    icon={<DownloadOutlined />}
                                    disabled={!currentFile?.transcription}
                                >
                                    TXT
                                </Button>
                            </Button.Group>
                        </div>
                    </div>
                    {!currentFile ? (
                        <div className="empty-state">
                            <p>请在左侧选择要查看转录结果的文件</p>
                        </div>
                    ) : (
                        <>
                            {currentFile && (
                                <div className="current-file-tip">
                                    <span>当前文件：{currentFile.name}</span>
                                </div>
                            )}
                            {!currentFile.transcription ? (
                                <div className="empty-state">
                                    <p>当前文件尚未完成转录</p>
                                </div>
                            ) : (
                                <Table
                                    dataSource={currentFile.transcription.map((item, index) => ({
                                        ...item,
                                        key: index,
                                    }))}
                                    columns={transcriptionColumns}
                                    pagination={false}
                                    size="small"
                                    className="transcription-table full-height"
                                />
                            )}
                        </>
                    )}
                </div>
            ),
        },
        {
            key: '2',
            label: '简单总结',
            children: (
                <div className="tab-content">
                    {currentFile && (
                        <div className="current-file-tip">
                            <span>当前文件：{currentFile.name}</span>
                        </div>
                    )}
                    <div className="button-group">
                        <Button
                            onClick={handleSummary}
                            disabled={!currentFile?.transcription}
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
                    {!currentFile ? (
                        <div className="empty-state">
                            <p>请在左侧选择要查看总结的文件</p>
                        </div>
                    ) : !currentFile.transcription ? (
                        <div className="empty-state">
                            <p>当前文件尚未完成转录</p>
                        </div>
                    ) : !currentFile.summary ? (
                        <div className="empty-state">
                            <p>点击上方按钮生成简单总结</p>
                        </div>
                    ) : (
                        <div className="markdown-content">
                            <ReactMarkdown>{summary}</ReactMarkdown>
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: '3',
            label: '详细总结',
            children: (
                <div className="tab-content">
                    {currentFile && (
                        <div className="current-file-tip">
                            <span>当前文件：{currentFile.name}</span>
                        </div>
                    )}
                    <div className="button-group">
                        <Button
                            onClick={handleDetailedSummary}
                            disabled={!currentFile?.transcription}
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
                    {!currentFile ? (
                        <div className="empty-state">
                            <p>请在左侧选择要查看详细总结的文件</p>
                        </div>
                    ) : !currentFile.transcription ? (
                        <div className="empty-state">
                            <p>当前文件尚未完成转录</p>
                        </div>
                    ) : !currentFile.detailedSummary ? (
                        <div className="empty-state">
                            <p>点击上方按钮生成详细总结</p>
                        </div>
                    ) : (
                        <div className="markdown-content detailed-summary-content">
                            <ReactMarkdown>{detailedSummary}</ReactMarkdown>
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: '4',
            label: '思维导图',
            children: (
                <div className="tab-content">
                    {currentFile && (
                        <div className="current-file-tip">
                            <span>当前文件：{currentFile.name}</span>
                        </div>
                    )}
                    <Button
                        onClick={handleMindmap}
                        loading={isMindmapLoading}
                        disabled={isMindmapLoading || !currentFile?.transcription}
                    >
                        {isMindmapLoading ? '生成中...' : '生成思维导图'}
                    </Button>
                    {!currentFile ? (
                        <div className="empty-state">
                            <p>请在左侧选择要查看思维导图的文件</p>
                        </div>
                    ) : !currentFile.transcription ? (
                        <div className="empty-state">
                            <p>当前文件尚未完成转录</p>
                        </div>
                    ) : !currentFile.mindmapData ? (
                        <div className="empty-state">
                            <p>点击上方按钮生成思维导图</p>
                        </div>
                    ) : (
                        <div key={currentFile.id} id="mindmap_container" className="mindmap-container">
                            {isMindmapLoading && (
                                <div className="mindmap-loading">
                                    <div className="loading-spinner"></div>
                                    <p>正在生成思维导图...</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: '5',
            label: '对话交互',
            children: (
                <div className="tab-content chat-tab">
                    {!currentFile ? (
                        <div className="empty-state">
                            <p>请在左侧选择要查看对话交互的文件</p>
                        </div>
                    ) : !currentFile.transcription ? (
                        <div className="empty-state">
                            <p>当前文件尚未完成转录</p>
                        </div>
                    ) : (
                        <>
                            <div className="current-file-tip">
                                <span>当前文件：{currentFile.name}</span>
                            </div>
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
                                <div ref={messagesEndRef} />
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
                                    placeholder="���入消息按Enter发送，Shift+Enter换行"
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
            label: '音视频预览',
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
                                            <span>频文</span>
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

                    <div className="file-list-section">
                        <div className="section-header">
                            <div className="section-title">
                                <h3>文件列表</h3>
                            </div>
                            <div className="action-buttons">
                                <Button
                                    onClick={() => {
                                        const allFileIds = uploadedFiles.map(file => file.id);
                                        setSelectedFiles(allFileIds);
                                    }}
                                >
                                    全选
                                </Button>
                                <Button
                                    onClick={() => setSelectedFiles([])}
                                >
                                    取消全选
                                </Button>
                                <Button
                                    type="primary"
                                    danger
                                    onClick={handleDeleteAll}
                                    disabled={selectedFiles.length === 0 || selectedFiles.some(id =>
                                        uploadedFiles.find(f => f.id === id)?.status === 'transcribing'
                                    )}
                                >
                                    删除选中
                                </Button>
                                <Button
                                    type="primary"
                                    onClick={handleBatchTranscribe}
                                    disabled={selectedFiles.length === 0}
                                    danger={isTranscribing}
                                >
                                    {isTranscribing ? '停止转录' : '开始转录'}
                                </Button>
                            </div>
                        </div>
                        <Table
                            rowSelection={{
                                selectedRowKeys: selectedFiles,
                                onChange: handleFileSelect,
                                preserveSelectedRowKeys: true,
                            }}
                            dataSource={getPageData()} // 使用分页后的数据
                            columns={fileColumns}
                            rowKey="id"
                            size="small"
                            onRow={(record) => ({
                                onClick: () => handleFilePreview(record),
                                style: {
                                    cursor: 'pointer',
                                    background: currentFile?.id === record.id ? '#e6f7ff' : 'inherit',
                                },
                            })}
                            pagination={false}
                        />
                        <div className="pagination-container">
                            <Pagination
                                {...paginationConfig}
                                total={uploadedFiles.length}
                            />
                        </div>
                    </div>
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
                <div className="header-right">
                    <a
                        href="https://github.com/Airmomo/VideoChat"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="github-link"
                    >
                        <GithubOutlined />
                        <span className="author-info">By Airmomo</span>
                    </a>
                </div>
                <div className="upload-section">
                    <Upload
                        beforeUpload={handleUpload}
                        accept="video/*,audio/*"
                        showUploadList={false}
                        multiple={true}
                        directory={false}
                    >
                        <Button icon={<UploadOutlined />}>
                            上传本地文件
                        </Button>
                    </Upload>
                </div>
                <div className="support-text">
                    支持多个视频和音频文件格式
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
