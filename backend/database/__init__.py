"""
数据库模块

提供数据持久化功能，包括SQLAlchemy ORM模型和数据库连接管理
"""

from .connection import get_database, init_database, close_database
from .models import (
    TranscriptionTask, TranscriptionResult, FileRecord, 
    CacheEntry, SystemConfig, Base
)

__all__ = [
    "get_database",
    "init_database", 
    "close_database",
    "TranscriptionTask",
    "TranscriptionResult",
    "FileRecord",
    "CacheEntry",
    "SystemConfig",
    "Base"
]
