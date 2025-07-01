"""
服务层模块

提供规范化的业务逻辑处理服务
"""

from .base import BaseService
from .file_service import FileService
from .task_service import TaskService
from .transcription_service import TranscriptionService
from .ai_service import AIService

# 服务实例
file_service = FileService()
task_service = TaskService()
transcription_service = TranscriptionService()
ai_service = AIService()

__all__ = [
    "BaseService",
    "FileService",
    "TaskService",
    "TranscriptionService",
    "AIService",
    "file_service",
    "task_service",
    "transcription_service",
    "ai_service"
]