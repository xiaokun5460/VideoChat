"""
核心数据模型

定义所有业务实体的数据模型
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel as PydanticBaseModel, Field
from enum import Enum


class BaseModel(PydanticBaseModel):
    """基础模型类"""
    
    class Config:
        """Pydantic配置"""
        from_attributes = True
        use_enum_values = True
        validate_assignment = True


class TaskStatus(str, Enum):
    """任务状态枚举"""
    CREATED = "created"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskType(str, Enum):
    """任务类型枚举"""
    UPLOAD = "upload"
    TRANSCRIPTION = "transcription"
    AI_PROCESSING = "ai_processing"
    DOWNLOAD = "download"
    EXPORT = "export"


class FileStatus(str, Enum):
    """文件状态枚举"""
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ERROR = "error"


# ============ 请求模型 ============

class PaginationParams(BaseModel):
    """分页参数"""
    page: int = Field(default=1, ge=1, description="页码")
    page_size: int = Field(default=20, ge=1, le=100, description="每页数量")


class FileUploadRequest(BaseModel):
    """文件上传请求"""
    # 文件通过 UploadFile 处理，这里定义其他参数
    description: Optional[str] = Field(None, description="文件描述")
    tags: Optional[List[str]] = Field(None, description="文件标签")


class TaskCreateRequest(BaseModel):
    """任务创建请求"""
    task_type: TaskType = Field(..., description="任务类型")
    file_id: Optional[str] = Field(None, description="关联文件ID")
    parameters: Optional[Dict[str, Any]] = Field(None, description="任务参数")


class AIRequest(BaseModel):
    """AI处理请求"""
    text: str = Field(..., description="待处理文本")
    stream: bool = Field(default=False, description="是否流式响应")
    parameters: Optional[Dict[str, Any]] = Field(None, description="AI参数")


class ChatMessage(BaseModel):
    """聊天消息"""
    role: str = Field(..., description="角色: user, assistant, system")
    content: str = Field(..., description="消息内容")


class ChatRequest(BaseModel):
    """聊天请求"""
    messages: List[ChatMessage] = Field(..., description="消息列表")
    context: Optional[str] = Field(None, description="上下文信息")
    stream: bool = Field(default=False, description="是否流式响应")


# ============ 统一响应模型 ============

class StandardResponse(BaseModel):
    """标准API响应格式"""
    success: bool = Field(..., description="操作是否成功")
    data: Optional[Any] = Field(None, description="响应数据")
    message: str = Field(..., description="响应消息")
    code: Optional[str] = Field(None, description="错误代码")
    timestamp: str = Field(..., description="响应时间戳")
    request_id: str = Field(..., description="请求ID")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data": {"result": "操作结果"},
                "message": "操作成功",
                "code": None,
                "timestamp": "2025-07-01T12:00:00.000Z",
                "request_id": "550e8400-e29b-41d4-a716-446655440000"
            }
        }


class StreamingChunk(BaseModel):
    """流式响应数据块格式"""
    success: bool = Field(..., description="操作是否成功")
    data: Dict[str, Any] = Field(..., description="数据块内容")
    message: str = Field(..., description="响应消息")
    code: Optional[str] = Field(None, description="错误代码")
    timestamp: str = Field(..., description="响应时间戳")
    request_id: str = Field(..., description="请求ID")
    stream_info: Dict[str, Any] = Field(..., description="流式信息")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "type": "content",
                    "content": "这是流式内容的一部分",
                    "operation": "summary"
                },
                "message": "总结生成中",
                "code": None,
                "timestamp": "2025-07-01T12:00:00.000Z",
                "request_id": "550e8400-e29b-41d4-a716-446655440000",
                "stream_info": {
                    "is_start": False,
                    "is_final": False,
                    "chunk_id": 5
                }
            }
        }


# ============ 业务响应模型 ============

class FileInfo(BaseModel):
    """文件信息"""
    id: str = Field(..., description="文件ID")
    name: str = Field(..., description="文件名")
    size: int = Field(..., description="文件大小(字节)")
    type: str = Field(..., description="文件类型")
    hash: str = Field(..., description="文件哈希")
    status: FileStatus = Field(..., description="文件状态")
    upload_time: str = Field(..., description="上传时间")
    url: Optional[str] = Field(None, description="文件访问URL")
    description: Optional[str] = Field(None, description="文件描述")
    tags: Optional[List[str]] = Field(None, description="文件标签")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "file_123456",
                "name": "讲座录音.mp3",
                "size": 15728640,
                "type": "audio/mpeg",
                "hash": "sha256:abc123...",
                "status": "completed",
                "upload_time": "2025-07-01T12:00:00.000Z",
                "url": "/uploads/file_123456.mp3",
                "description": "AI技术讲座录音",
                "tags": ["AI", "讲座", "技术"]
            }
        }


class TaskInfo(BaseModel):
    """任务信息"""
    task_id: str = Field(..., description="任务ID")
    task_type: TaskType = Field(..., description="任务类型")
    status: TaskStatus = Field(..., description="任务状态")
    progress: float = Field(default=0.0, ge=0, le=100, description="进度百分比")
    created_at: str = Field(..., description="创建时间")
    updated_at: str = Field(..., description="更新时间")
    completed_at: Optional[str] = Field(None, description="完成时间")

    # 任务详情
    file_id: Optional[str] = Field(None, description="关联文件ID")
    file_name: Optional[str] = Field(None, description="文件名")
    current_step: str = Field(default="", description="当前步骤")
    total_steps: int = Field(default=1, description="总步骤数")
    current_step_index: int = Field(default=0, description="当前步骤索引")

    # 性能信息
    speed: Optional[str] = Field(None, description="处理速度")
    eta: Optional[str] = Field(None, description="预计剩余时间")

    # 错误信息
    error_message: Optional[str] = Field(None, description="错误消息")

    # 元数据
    metadata: Optional[Dict[str, Any]] = Field(None, description="任务元数据")

    class Config:
        json_schema_extra = {
            "example": {
                "task_id": "task_789012",
                "task_type": "transcription",
                "status": "processing",
                "progress": 65.5,
                "created_at": "2025-07-01T12:00:00.000Z",
                "updated_at": "2025-07-01T12:05:30.000Z",
                "completed_at": None,
                "file_id": "file_123456",
                "file_name": "讲座录音.mp3",
                "current_step": "音频转录中",
                "total_steps": 3,
                "current_step_index": 1,
                "speed": "2.5x实时速度",
                "eta": "预计还需2分钟",
                "error_message": None,
                "metadata": {
                    "model": "whisper-large-v3",
                    "language": "zh"
                }
            }
        }


class TranscriptionSegment(BaseModel):
    """转录片段"""
    id: str = Field(..., description="片段ID")
    start: float = Field(..., description="开始时间(秒)")
    end: float = Field(..., description="结束时间(秒)")
    text: str = Field(..., description="转录文本")
    speaker: Optional[str] = Field(None, description="说话人")
    confidence: Optional[float] = Field(None, ge=0, le=1, description="置信度")


class TranscriptionResult(BaseModel):
    """转录结果"""
    id: str = Field(..., description="转录结果ID")
    file_id: str = Field(..., description="文件ID")
    task_id: str = Field(..., description="任务ID")
    segments: List[TranscriptionSegment] = Field(..., description="转录片段")
    language: str = Field(..., description="语言")
    duration: float = Field(..., description="音频时长(秒)")
    status: str = Field(..., description="转录状态")
    created_at: str = Field(..., description="创建时间")
    updated_at: str = Field(..., description="更新时间")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "transcription_456789",
                "file_id": "file_123456",
                "task_id": "task_789012",
                "segments": [
                    {
                        "id": "seg_1",
                        "start": 0.0,
                        "end": 5.2,
                        "text": "欢迎大家参加今天的AI技术分享会",
                        "speaker": "Speaker 1",
                        "confidence": 0.95
                    },
                    {
                        "id": "seg_2", 
                        "start": 5.2,
                        "end": 12.8,
                        "text": "今天我们将讨论大语言模型的最新发展",
                        "speaker": "Speaker 1",
                        "confidence": 0.92
                    }
                ],
                "language": "zh",
                "duration": 1800.5,
                "status": "completed",
                "created_at": "2025-07-01T12:00:00.000Z",
                "updated_at": "2025-07-01T12:15:30.000Z"
            }
        }


class AIResult(BaseModel):
    """AI处理结果"""
    id: str = Field(..., description="结果ID")
    type: str = Field(..., description="AI处理类型")
    content: str = Field(..., description="处理结果内容")
    metadata: Optional[Dict[str, Any]] = Field(None, description="结果元数据")
    created_at: str = Field(..., description="创建时间")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "ai_result_345678",
                "type": "summary",
                "content": "这是一段关于人工智能发展的总结内容，涵盖了从早期的符号主义到现代深度学习的演进过程...",
                "metadata": {
                    "model": "gpt-4",
                    "max_length": 200,
                    "temperature": 0.7,
                    "processing_time": 3.2
                },
                "created_at": "2025-07-01T12:10:00.000Z"
            }
        }


class SystemStatus(BaseModel):
    """系统状态"""
    status: str = Field(..., description="系统状态")
    version: str = Field(..., description="系统版本")
    uptime: str = Field(..., description="运行时间")
    timestamp: str = Field(..., description="状态时间")
    services: Dict[str, Any] = Field(..., description="服务状态")

    class Config:
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "version": "2.0.0",
                "uptime": "2天3小时45分钟",
                "timestamp": "2025-07-01T12:00:00.000Z",
                "services": {
                    "status": {
                        "ai_service": "healthy",
                        "file_service": "healthy",
                        "task_service": "healthy",
                        "transcription_service": "healthy"
                    },
                    "resources": {
                        "cpu_usage": "15%",
                        "memory_usage": "45%",
                        "memory_available": "8GB",
                        "disk_usage": "60%",
                        "disk_free": "100GB"
                    },
                    "performance": {
                        "uptime_seconds": 183600,
                        "load_average": [0.5, 0.3, 0.2]
                    }
                }
            }
        }


# ============ 特定API响应模型 ============

class FileUploadResponse(StandardResponse):
    """文件上传响应"""
    data: FileInfo = Field(..., description="上传的文件信息")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "id": "file_123456",
                    "name": "讲座录音.mp3",
                    "size": 15728640,
                    "type": "audio/mpeg",
                    "status": "uploaded"
                },
                "message": "文件上传成功",
                "code": None,
                "timestamp": "2025-07-01T12:00:00.000Z",
                "request_id": "550e8400-e29b-41d4-a716-446655440000"
            }
        }


class TaskCreateResponse(StandardResponse):
    """任务创建响应"""
    data: Dict[str, Any] = Field(..., description="任务信息")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "task_id": "task_789012",
                    "task_type": "transcription",
                    "status": "created",
                    "created_at": "2025-07-01T12:00:00.000Z",
                    "estimated_duration": 300
                },
                "message": "任务创建成功",
                "code": None,
                "timestamp": "2025-07-01T12:00:00.000Z",
                "request_id": "550e8400-e29b-41d4-a716-446655440000"
            }
        }


class AIProcessResponse(StandardResponse):
    """AI处理响应"""
    data: Dict[str, Any] = Field(..., description="AI处理结果")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "summary": "这是一段关于人工智能发展的总结...",
                    "result_id": "ai_result_345678"
                },
                "message": "AI处理完成",
                "code": None,
                "timestamp": "2025-07-01T12:00:00.000Z",
                "request_id": "550e8400-e29b-41d4-a716-446655440000"
            }
        }
