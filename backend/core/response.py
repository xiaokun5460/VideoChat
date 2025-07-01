"""
统一响应管理器

提供标准化的API响应格式和处理逻辑
"""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi.responses import JSONResponse
from pydantic import BaseModel


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


class TaskData(BaseModel):
    """任务数据格式"""
    task_id: str
    task_type: str
    status: str
    created_at: str
    estimated_duration: Optional[int] = None


class ResponseManager:
    """响应管理器 - 统一的响应处理"""
    
    @staticmethod
    def success(
        data: Any = None,
        message: str = "操作成功",
        code: Optional[str] = None,
        status_code: int = 200
    ) -> JSONResponse:
        """创建成功响应"""
        response = StandardResponse(
            success=True,
            data=data,
            message=message,
            code=code,
            timestamp=datetime.now().isoformat(),
            request_id=str(uuid.uuid4())
        )
        
        return JSONResponse(
            content=response.model_dump(),
            status_code=status_code
        )
    
    @staticmethod
    def error(
        message: str = "操作失败",
        code: Optional[str] = None,
        data: Any = None,
        status_code: int = 400
    ) -> JSONResponse:
        """创建错误响应"""
        response = StandardResponse(
            success=False,
            data=data,
            message=message,
            code=code,
            timestamp=datetime.now().isoformat(),
            request_id=str(uuid.uuid4())
        )
        
        return JSONResponse(
            content=response.model_dump(),
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
        """创建分页响应"""
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
        
        response = StandardResponse(
            success=True,
            data=paginated_data,
            message=message,
            timestamp=datetime.now().isoformat(),
            request_id=str(uuid.uuid4())
        )
        
        return JSONResponse(content=response.model_dump())
    
    @staticmethod
    def task_created(
        task_id: str,
        task_type: str,
        status: str = "created",
        estimated_duration: Optional[int] = None,
        message: str = "任务创建成功"
    ) -> JSONResponse:
        """创建任务响应"""
        task_data = TaskData(
            task_id=task_id,
            task_type=task_type,
            status=status,
            created_at=datetime.now().isoformat(),
            estimated_duration=estimated_duration
        )
        
        response = StandardResponse(
            success=True,
            data=task_data.model_dump(),
            message=message,
            timestamp=datetime.now().isoformat(),
            request_id=str(uuid.uuid4())
        )
        
        return JSONResponse(content=response.model_dump())


# 全局响应管理器实例
response_manager = ResponseManager()
