"""
路由模块包

包含所有API路由的模块化组织
"""

from .system_routes import router as system_router
from .file_routes import router as file_router
from .ai_routes import router as ai_router
from .ai_routes_extended import router as ai_extended_router
from .download_routes import router as download_router
from .export_routes import router as export_router

__all__ = [
    "system_router",
    "file_router", 
    "ai_router",
    "ai_extended_router",
    "download_router",
    "export_router"
]