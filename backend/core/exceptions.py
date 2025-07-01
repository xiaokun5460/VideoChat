"""
统一异常处理系统

定义所有业务异常和错误码
"""

from typing import Any, Optional
from fastapi import HTTPException


class ErrorCodes:
    """标准错误代码"""
    
    # 通用错误 (1000-1999)
    INVALID_REQUEST = "E1001"
    UNAUTHORIZED = "E1002"
    FORBIDDEN = "E1003"
    NOT_FOUND = "E1004"
    INTERNAL_ERROR = "E1005"
    VALIDATION_ERROR = "E1006"
    
    # 文件相关错误 (2000-2999)
    FILE_NOT_FOUND = "E2001"
    FILE_TOO_LARGE = "E2002"
    INVALID_FILE_TYPE = "E2003"
    UPLOAD_FAILED = "E2004"
    FILE_PROCESSING_FAILED = "E2005"
    
    # 任务相关错误 (3000-3999)
    TASK_NOT_FOUND = "E3001"
    TASK_ALREADY_RUNNING = "E3002"
    TASK_FAILED = "E3003"
    TASK_CANCELLED = "E3004"
    TASK_TIMEOUT = "E3005"
    
    # 转录相关错误 (4000-4999)
    TRANSCRIPTION_FAILED = "E4001"
    MODEL_NOT_AVAILABLE = "E4002"
    AUDIO_FORMAT_ERROR = "E4003"
    TRANSCRIPTION_TIMEOUT = "E4004"
    
    # AI服务错误 (5000-5999)
    AI_SERVICE_ERROR = "E5001"
    AI_MODEL_ERROR = "E5002"
    AI_QUOTA_EXCEEDED = "E5003"
    AI_RESPONSE_ERROR = "E5004"
    
    # 系统错误 (6000-6999)
    DATABASE_ERROR = "E6001"
    CACHE_ERROR = "E6002"
    NETWORK_ERROR = "E6003"
    CONFIGURATION_ERROR = "E6004"


class VideoChateException(HTTPException):
    """VideoChat 自定义异常基类"""
    
    def __init__(
        self,
        message: str,
        code: str,
        status_code: int = 400,
        data: Optional[Any] = None
    ):
        self.message = message
        self.code = code
        self.data = data
        super().__init__(status_code=status_code, detail=message)


class ValidationException(VideoChateException):
    """验证异常"""
    
    def __init__(self, message: str, data: Optional[Any] = None):
        super().__init__(
            message=message,
            code=ErrorCodes.VALIDATION_ERROR,
            status_code=400,
            data=data
        )


class FileException(VideoChateException):
    """文件相关异常"""
    
    def __init__(self, message: str, code: str, data: Optional[Any] = None):
        super().__init__(
            message=message,
            code=code,
            status_code=400,
            data=data
        )


class TaskException(VideoChateException):
    """任务相关异常"""
    
    def __init__(self, message: str, code: str, data: Optional[Any] = None):
        super().__init__(
            message=message,
            code=code,
            status_code=400,
            data=data
        )


class TranscriptionException(VideoChateException):
    """转录相关异常"""
    
    def __init__(self, message: str, code: str, data: Optional[Any] = None):
        super().__init__(
            message=message,
            code=code,
            status_code=422,
            data=data
        )


class AIServiceException(VideoChateException):
    """AI服务异常"""
    
    def __init__(self, message: str, code: str, data: Optional[Any] = None):
        super().__init__(
            message=message,
            code=code,
            status_code=503,
            data=data
        )


class SystemException(VideoChateException):
    """系统异常"""
    
    def __init__(self, message: str, code: str, data: Optional[Any] = None):
        super().__init__(
            message=message,
            code=code,
            status_code=500,
            data=data
        )


# 便捷异常创建函数
def file_not_found(filename: str = None) -> FileException:
    """文件不存在异常"""
    message = f"文件不存在: {filename}" if filename else "文件不存在"
    return FileException(message, ErrorCodes.FILE_NOT_FOUND)


def file_too_large(max_size: str = None) -> FileException:
    """文件过大异常"""
    message = f"文件大小超过限制: {max_size}" if max_size else "文件大小超过限制"
    return FileException(message, ErrorCodes.FILE_TOO_LARGE)


def invalid_file_type(allowed_types: list = None) -> FileException:
    """文件类型无效异常"""
    if allowed_types:
        message = f"不支持的文件类型，支持的类型: {', '.join(allowed_types)}"
    else:
        message = "不支持的文件类型"
    return FileException(message, ErrorCodes.INVALID_FILE_TYPE)


def task_not_found(task_id: str = None) -> TaskException:
    """任务不存在异常"""
    message = f"任务不存在: {task_id}" if task_id else "任务不存在"
    return TaskException(message, ErrorCodes.TASK_NOT_FOUND)


def transcription_failed(reason: str = None) -> TranscriptionException:
    """转录失败异常"""
    message = f"转录失败: {reason}" if reason else "转录失败"
    return TranscriptionException(message, ErrorCodes.TRANSCRIPTION_FAILED)


def ai_service_error(service: str = None, reason: str = None) -> AIServiceException:
    """AI服务错误异常"""
    if service and reason:
        message = f"{service}服务错误: {reason}"
    elif service:
        message = f"{service}服务暂时不可用"
    else:
        message = "AI服务错误"
    return AIServiceException(message, ErrorCodes.AI_SERVICE_ERROR)
