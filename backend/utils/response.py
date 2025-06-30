"""
标准响应格式工具

提供统一的API响应格式，确保所有接口返回一致的数据结构
"""

from typing import Any, Optional
from datetime import datetime
from pydantic import BaseModel


class StandardResponse(BaseModel):
    """标准API响应格式"""
    success: bool
    data: Optional[Any] = None
    message: str = ""
    timestamp: str = ""
    
    def __init__(self, **data):
        if "timestamp" not in data:
            data["timestamp"] = datetime.now().isoformat()
        super().__init__(**data)


def success_response(data: Any = None, message: str = "操作成功") -> StandardResponse:
    """创建成功响应"""
    return StandardResponse(
        success=True,
        data=data,
        message=message
    )


def error_response(message: str = "操作失败", data: Any = None) -> StandardResponse:
    """创建错误响应"""
    return StandardResponse(
        success=False,
        data=data,
        message=message
    )


def streaming_response_wrapper(data: Any, message: str = "数据流传输中") -> dict:
    """流式响应包装器"""
    return {
        "success": True,
        "data": data,
        "message": message,
        "timestamp": datetime.now().isoformat()
    }
