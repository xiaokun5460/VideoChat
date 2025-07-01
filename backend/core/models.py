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


# ============ 响应模型 ============

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


class AIResult(BaseModel):
    """AI处理结果"""
    id: str = Field(..., description="结果ID")
    type: str = Field(..., description="AI处理类型")
    content: str = Field(..., description="处理结果内容")
    metadata: Optional[Dict[str, Any]] = Field(None, description="结果元数据")
    created_at: str = Field(..., description="创建时间")


class SystemStatus(BaseModel):
    """系统状态"""
    status: str = Field(..., description="系统状态")
    version: str = Field(..., description="系统版本")
    uptime: str = Field(..., description="运行时间")
    timestamp: str = Field(..., description="状态时间")
    services: Dict[str, Any] = Field(..., description="服务状态")


# ============ 分页响应模型 ============

class PaginatedResponse(BaseModel):
    """分页响应"""
    items: List[Any] = Field(..., description="数据项")
    total: int = Field(..., description="总数量")
    page: int = Field(..., description="当前页")
    page_size: int = Field(..., description="每页大小")
    has_next: bool = Field(..., description="是否有下一页")
    has_prev: bool = Field(..., description="是否有上一页")


class TaskResponse(BaseModel):
    """任务响应"""
    task_id: str = Field(..., description="任务ID")
    task_type: str = Field(..., description="任务类型")
    status: str = Field(..., description="任务状态")
    created_at: str = Field(..., description="创建时间")
    estimated_duration: Optional[int] = Field(None, description="预估时长(秒)")
