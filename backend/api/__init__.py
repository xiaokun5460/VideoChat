"""
API模块

统一的API路由管理，所有接口都使用统一的响应格式
"""

from .files import router as files_router
from .tasks import router as tasks_router
from .transcriptions import router as transcriptions_router
from .ai import router as ai_router
from .system import router as system_router
from .progress import router as progress_router

__all__ = [
    "files_router",
    "tasks_router",
    "transcriptions_router",
    "ai_router",
    "system_router",
    "progress_router"
]