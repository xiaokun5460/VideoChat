from pydantic import BaseModel
from typing import List, Optional

class ChatMessage(BaseModel):
    """聊天消息模型

    用于表示聊天对话中的单条消息，包含角色和内容信息
    """
    role: str  # 消息角色：user（用户）、assistant（AI助手）、system（系统）
    content: str  # 消息内容文本

    class Config:
        json_schema_extra = {
            "example": {
                "role": "user",
                "content": "请帮我总结一下这个视频的主要内容"
            }
        }

class ChatRequest(BaseModel):
    """聊天请求模型

    用于发送聊天请求，包含消息历史、上下文和响应方式配置
    """
    messages: List[ChatMessage]  # 聊天消息列表，包含对话历史
    context: Optional[str] = ""  # 上下文信息，通常是音视频转录的文本内容，可选
    stream: bool = True  # 是否使用流式响应，默认为True

    class Config:
        json_schema_extra = {
            "example": {
                "messages": [
                    {"role": "user", "content": "这个视频的主要观点是什么？"}
                ],
                "context": "这是一段关于人工智能发展历程的讲座内容，讲述了从早期的符号主义到现代的深度学习...",
                "stream": True
            }
        }

class TranscriptionSegment(BaseModel):
    """转录片段模型

    表示音视频转录结果中的一个时间段片段
    """
    start: float  # 片段开始时间（秒）
    end: float  # 片段结束时间（秒）
    text: str  # 该时间段的转录文本内容

    class Config:
        json_schema_extra = {
            "example": {
                "start": 12.5,
                "end": 18.3,
                "text": "大家好，欢迎来到今天的讲座"
            }
        }

# 响应模型定义
class TranscriptionResponse(BaseModel):
    """转录响应模型

    音视频转录完成后的响应结果
    """
    transcription: List[TranscriptionSegment]  # 转录结果列表，包含所有时间段的文本内容

    class Config:
        json_schema_extra = {
            "example": {
                "transcription": [
                    {"start": 0.0, "end": 5.2, "text": "大家好，欢迎来到今天的讲座"},
                    {"start": 5.2, "end": 12.8, "text": "今天我们要讨论的主题是人工智能的发展"}
                ]
            }
        }

class SummaryResponse(BaseModel):
    """总结响应模型

    AI生成的文本总结结果
    """
    summary: str  # 生成的文本总结内容

    class Config:
        json_schema_extra = {
            "example": {
                "summary": "这个视频主要讲述了人工智能的发展历程，从早期的符号主义到现代的深度学习技术..."
            }
        }

class MindmapResponse(BaseModel):
    """思维导图响应模型

    AI生成的思维导图JSON数据
    """
    mindmap: str  # 思维导图的JSON字符串，符合jsMind格式规范

    class Config:
        json_schema_extra = {
            "example": {
                "mindmap": '{"meta":{"name":"思维导图","author":"AI","version":"1.0"},"format":"node_tree","data":{"id":"root","topic":"主题","children":[]}}'
            }
        }

class ChatResponse(BaseModel):
    """聊天响应模型

    AI助手的对话回复结果
    """
    response: str  # AI助手的回复内容

    class Config:
        json_schema_extra = {
            "example": {
                "response": "根据视频内容，主要观点包括：1. 人工智能技术的快速发展；2. 深度学习的重要作用..."
            }
        }

class DetailedSummaryResponse(BaseModel):
    """详细总结响应模型

    AI生成的详细Markdown格式总结
    """
    detailed_summary: str  # 详细的Markdown格式总结内容

    class Config:
        json_schema_extra = {
            "example": {
                "detailed_summary": "# 视频内容详细总结\n\n## 主要内容\n\n这个视频详细介绍了...\n\n## 关键观点\n\n1. 第一个重要观点\n2. 第二个重要观点"
            }
        }

class MindmapImageResponse(BaseModel):
    """思维导图图片响应模型

    AI生成的思维导图图片文件路径
    """
    image_path: str  # 生成的思维导图图片文件路径
    image_url: str   # 图片的HTTP访问URL

    class Config:
        json_schema_extra = {
            "example": {
                "image_path": "uploads/mindmaps/mindmap_20231201_143022.png",
                "image_url": "http://localhost:8000/uploads/mindmaps/mindmap_20231201_143022.png"
            }
        }

# 下载相关模型
class DownloadProgressResponse(BaseModel):
    """下载进度响应模型

    视频下载任务的进度信息
    """
    task_id: str  # 下载任务ID
    status: str  # 下载状态：pending, downloading, completed, failed, cancelled
    progress: Optional[float] = None  # 下载进度百分比（0-100）
    filename: Optional[str] = None  # 下载的文件名
    error_message: Optional[str] = None  # 错误信息（如果失败）

    class Config:
        json_schema_extra = {
            "example": {
                "task_id": "abc123-def456",
                "status": "downloading",
                "progress": 65.5,
                "filename": "video.mp4",
                "error_message": None
            }
        }

class DownloadStartResponse(BaseModel):
    """下载开始响应模型

    开始下载任务后的响应
    """
    task_id: str  # 下载任务ID
    message: str  # 响应消息
    url: str  # 下载的URL

    class Config:
        json_schema_extra = {
            "example": {
                "task_id": "abc123-def456",
                "message": "下载任务已开始",
                "url": "https://www.youtube.com/watch?v=example"
            }
        }

# 文件处理相关模型
class TranscribeDownloadedRequest(BaseModel):
    """转录已下载文件请求模型

    用于转录已经下载到服务器的文件
    """
    filename: str  # 文件名
    file_path: str  # 文件路径，必须以uploads/开头

    class Config:
        json_schema_extra = {
            "example": {
                "filename": "downloaded_video.mp4",
                "file_path": "uploads/downloaded_video_abc123.mp4"
            }
        }

class StopTranscribeResponse(BaseModel):
    """停止转录响应模型

    停止转录任务后的响应
    """
    message: str  # 响应消息

    class Config:
        json_schema_extra = {
            "example": {
                "message": "转录已停止"
            }
        }

# 视频下载相关响应模型
class CancelDownloadResponse(BaseModel):
    """取消下载响应模型

    取消下载任务后的响应
    """
    message: str  # 响应消息
    task_id: str  # 任务ID

    class Config:
        json_schema_extra = {
            "example": {
                "message": "下载任务已取消",
                "task_id": "abc123-def456"
            }
        }

class DownloadListResponse(BaseModel):
    """下载列表响应模型

    获取所有下载任务的响应
    """
    downloads: List[DownloadProgressResponse]  # 下载任务列表

    class Config:
        json_schema_extra = {
            "example": {
                "downloads": [
                    {
                        "task_id": "abc123-def456",
                        "status": "completed",
                        "progress": 100.0,
                        "filename": "video.mp4",
                        "error_message": None
                    },
                    {
                        "task_id": "xyz789-uvw012",
                        "status": "downloading",
                        "progress": 45.2,
                        "filename": "video2.mp4",
                        "error_message": None
                    }
                ]
            }
        }

class DownloadAndTranscribeResponse(BaseModel):
    """下载并转录响应模型

    下载视频并完成转录后的响应
    """
    task_id: str  # 下载任务ID
    file_path: str  # 下载的文件路径
    filename: str  # 文件名
    transcription: List[TranscriptionSegment]  # 转录结果
    message: str  # 响应消息

    class Config:
        json_schema_extra = {
            "example": {
                "task_id": "abc123-def456",
                "file_path": "uploads/downloaded_video_abc123.mp4",
                "filename": "video.mp4",
                "transcription": [
                    {"start": 0.0, "end": 5.2, "text": "大家好，欢迎来到今天的讲座"},
                    {"start": 5.2, "end": 12.8, "text": "今天我们要讨论的主题是人工智能的发展"}
                ],
                "message": "下载和转录完成"
            }
        }

# 文件导出相关模型
class ExportRequest(BaseModel):
    """导出请求模型

    用于转录内容导出的请求参数
    """
    transcription: List[TranscriptionSegment]  # 转录数据

    class Config:
        json_schema_extra = {
            "example": {
                "transcription": [
                    {"start": 0.0, "end": 5.2, "text": "大家好，欢迎来到今天的讲座"},
                    {"start": 5.2, "end": 12.8, "text": "今天我们要讨论的主题是人工智能的发展"}
                ]
            }
        }

class ContentExportRequest(BaseModel):
    """内容导出请求模型

    用于将Markdown内容转换为图片的请求
    """
    content: str  # Markdown内容
    title: str  # 标题
    content_type: str  # 内容类型：summary/evaluation/mindmap

    class Config:
        json_schema_extra = {
            "example": {
                "content": "# 智能总结\n\n这是一个示例总结内容...",
                "title": "智能总结报告",
                "content_type": "summary"
            }
        }

class ContentExportResponse(BaseModel):
    """内容导出响应模型

    图片导出结果
    """
    image_path: str  # 图片文件路径
    image_url: str   # 图片访问URL

    class Config:
        json_schema_extra = {
            "example": {
                "image_path": "/uploads/exports/summary_20231201_123456_abc12345.png",
                "image_url": "/uploads/exports/summary_20231201_123456_abc12345.png"
            }
        }