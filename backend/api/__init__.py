"""
新API路由模块

基于重构后的Service架构创建的规范化API路由
"""

from .files import router as files_router
from .tasks import router as tasks_router
from .transcriptions import router as transcriptions_router
from .ai import router as ai_router
from .system import router as system_router

__all__ = [
    "files_router",
    "tasks_router",
    "transcriptions_router", 
    "ai_router",
    "system_router"
]
