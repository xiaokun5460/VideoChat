"""
统一API响应格式处理器

提供标准化的API响应格式，确保所有接口返回一致的数据结构
"""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel
from fastapi import HTTPException
from fastapi.responses import JSONResponse


class StandardResponse(BaseModel):
    """标准API响应格式"""
    success: bool
    data: Optional[Any] = None
    message: str
    code: Optional[str] = None
    timestamp: str
    request_id: str


class PaginatedData(BaseModel):
    """分页数据格式"""
    items: List[Any]
    total: int
    page: int
    page_size: int
    has_next: bool
    has_prev: bool


class PaginatedResponse(StandardResponse):
    """分页响应格式"""
    data: PaginatedData


class TaskResponse(StandardResponse):
    """任务响应格式"""
    data: Dict[str, Any]  # 包含task_id, status, estimated_duration等


class ResponseFormatter:
    """响应格式化器"""
    
    @staticmethod
    def success(
        data: Any = None,
        message: str = "操作成功",
        code: Optional[str] = None,
        status_code: int = 200
    ) -> JSONResponse:
        """
        创建成功响应
        
        Args:
            data: 响应数据
            message: 响应消息
            code: 业务代码
            status_code: HTTP状态码
        
        Returns:
            标准化的成功响应
        """
        response_data = StandardResponse(
            success=True,
            data=data,
            message=message,
            code=code,
            timestamp=datetime.now().isoformat(),
            request_id=str(uuid.uuid4())
        )
        
        return JSONResponse(
            content=response_data.model_dump(),
            status_code=status_code
        )
    
    @staticmethod
    def error(
        message: str = "操作失败",
        code: Optional[str] = None,
        data: Any = None,
        status_code: int = 400
    ) -> JSONResponse:
        """
        创建错误响应
        
        Args:
            message: 错误消息
            code: 错误代码
            data: 错误详情数据
            status_code: HTTP状态码
        
        Returns:
            标准化的错误响应
        """
        response_data = StandardResponse(
            success=False,
            data=data,
            message=message,
            code=code,
            timestamp=datetime.now().isoformat(),
            request_id=str(uuid.uuid4())
        )
        
        return JSONResponse(
            content=response_data.model_dump(),
            status_code=status_code
        )
    
    @staticmethod
    def paginated(
        items: List[Any],
        total: int,
        page: int,
        page_size: int,
        message: str = "数据获取成功"
    ) -> JSONResponse:
        """
        创建分页响应
        
        Args:
            items: 数据项列表
            total: 总数据量
            page: 当前页码
            page_size: 每页大小
            message: 响应消息
        
        Returns:
            标准化的分页响应
        """
        has_next = (page * page_size) < total
        has_prev = page > 1
        
        paginated_data = PaginatedData(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            has_next=has_next,
            has_prev=has_prev
        )
        
        response_data = PaginatedResponse(
            success=True,
            data=paginated_data,
            message=message,
            timestamp=datetime.now().isoformat(),
            request_id=str(uuid.uuid4())
        )
        
        return JSONResponse(content=response_data.model_dump())
    
    @staticmethod
    def task_created(
        task_id: str,
        task_type: str,
        status: str = "created",
        estimated_duration: Optional[int] = None,
        message: str = "任务创建成功"
    ) -> JSONResponse:
        """
        创建任务响应
        
        Args:
            task_id: 任务ID
            task_type: 任务类型
            status: 任务状态
            estimated_duration: 预估执行时间（秒）
            message: 响应消息
        
        Returns:
            标准化的任务创建响应
        """
        task_data = {
            "task_id": task_id,
            "task_type": task_type,
            "status": status,
            "created_at": datetime.now().isoformat()
        }
        
        if estimated_duration:
            task_data["estimated_duration"] = estimated_duration
        
        response_data = TaskResponse(
            success=True,
            data=task_data,
            message=message,
            timestamp=datetime.now().isoformat(),
            request_id=str(uuid.uuid4())
        )
        
        return JSONResponse(content=response_data.model_dump())


class APIException(HTTPException):
    """自定义API异常"""
    
    def __init__(
        self,
        message: str,
        code: Optional[str] = None,
        status_code: int = 400,
        data: Any = None
    ):
        self.message = message
        self.code = code
        self.data = data
        super().__init__(status_code=status_code, detail=message)


# 常用错误代码定义
class ErrorCodes:
    """标准错误代码"""
    
    # 通用错误
    INVALID_REQUEST = "INVALID_REQUEST"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    NOT_FOUND = "NOT_FOUND"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    
    # 文件相关错误
    FILE_NOT_FOUND = "FILE_NOT_FOUND"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    INVALID_FILE_TYPE = "INVALID_FILE_TYPE"
    UPLOAD_FAILED = "UPLOAD_FAILED"
    
    # 任务相关错误
    TASK_NOT_FOUND = "TASK_NOT_FOUND"
    TASK_ALREADY_RUNNING = "TASK_ALREADY_RUNNING"
    TASK_FAILED = "TASK_FAILED"
    TASK_CANCELLED = "TASK_CANCELLED"
    
    # 转录相关错误
    TRANSCRIPTION_FAILED = "TRANSCRIPTION_FAILED"
    MODEL_NOT_AVAILABLE = "MODEL_NOT_AVAILABLE"
    
    # AI服务错误
    AI_SERVICE_ERROR = "AI_SERVICE_ERROR"
    AI_MODEL_ERROR = "AI_MODEL_ERROR"


# 全局响应格式化器实例
response_formatter = ResponseFormatter()
