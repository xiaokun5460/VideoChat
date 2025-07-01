"""
系统管理API路由

系统健康检查、监控、配置管理接口，统一响应格式
"""

from fastapi import APIRouter

from core.response import response_manager
from core.models import SystemStatus, StandardResponse
from core.exceptions import VideoChateException, ErrorCodes
from core.config import settings
from services import system_service


router = APIRouter(prefix="/api/system", tags=["系统管理"])


@router.get("/health", summary="系统健康检查", response_model=StandardResponse)
async def health_check():
    """
    系统健康检查
    
    检查系统各组件的运行状态
    """
    try:
        health_status = await system_service.get_health_status()
        
        return response_manager.success(
            data=health_status,
            message="系统健康检查完成"
        )
        
    except Exception as e:
        return response_manager.error(
            message=f"健康检查失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR,
            status_code=503
        )


@router.get("/status", summary="获取系统状态", response_model=StandardResponse)
async def get_system_status():
    """
    获取详细的系统状态信息
    
    包括服务状态、资源使用情况、性能指标等
    """
    try:
        system_status = await system_service.get_system_status()
        
        return response_manager.success(
            data=system_status.model_dump(mode='json'),
            message="系统状态获取成功"
        )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"获取系统状态失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.get("/info", summary="获取系统信息", response_model=StandardResponse)
async def get_system_info():
    """
    获取系统基本信息
    
    包括版本、配置、环境信息等
    """
    try:
        system_info = {
            "app_name": settings.app_name,
            "app_version": settings.app_version,
            "environment": "development" if settings.debug else "production",
            "python_version": "3.11+",
            "api_version": "v1",
            "features": {
                "file_upload": True,
                "audio_transcription": True,
                "ai_processing": True,
                "streaming_responses": True,
                "task_management": True
            },
            "limits": {
                "max_file_size": f"{settings.max_file_size // (1024 * 1024)}MB",
                "max_concurrent_tasks": settings.max_concurrent_tasks,
                "supported_file_types": settings.allowed_file_types
            }
        }
        
        return response_manager.success(
            data=system_info,
            message="系统信息获取成功"
        )
        
    except Exception as e:
        return response_manager.error(
            message=f"获取系统信息失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.get("/config", summary="获取系统配置", response_model=StandardResponse)
async def get_system_config():
    """
    获取系统配置信息
    
    返回当前系统的配置参数（敏感信息已脱敏）
    """
    try:
        config_info = {
            "server": {
                "host": settings.host,
                "port": settings.port,
                "debug": settings.debug,
                "log_level": settings.log_level
            },
            "file_handling": {
                "upload_dir": settings.upload_dir,
                "max_file_size": settings.max_file_size,
                "allowed_file_types": settings.allowed_file_types
            },
            "ai_service": {
                "model_name": settings.ai_model_name,
                "api_configured": bool(settings.openai_api_key)
            },
            "transcription": {
                "whisper_model": settings.whisper_model,
                "use_gpu": settings.use_gpu
            },
            "task_management": {
                "max_concurrent_tasks": settings.max_concurrent_tasks,
                "task_timeout": settings.task_timeout
            },
            "cache": {
                "ttl": settings.cache_ttl,
                "max_size": settings.cache_max_size
            }
        }
        
        return response_manager.success(
            data=config_info,
            message="系统配置获取成功"
        )
        
    except Exception as e:
        return response_manager.error(
            message=f"获取系统配置失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.get("/stats", summary="获取系统统计信息", response_model=StandardResponse)
async def get_system_stats():
    """
    获取系统统计信息
    
    包括使用统计、性能指标、资源使用情况等
    """
    try:
        stats = await system_service.get_system_stats()
        
        return response_manager.success(
            data={
                "stats": stats,
                "type": "system_stats"
            },
            message="系统统计信息获取成功"
        )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"获取系统统计失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.get("/version", summary="获取版本信息", response_model=StandardResponse)
async def get_version():
    """
    获取系统版本和构建信息
    
    返回详细的版本信息
    """
    try:
        version_info = {
            "app_name": settings.app_name,
            "version": settings.app_version,
            "build_date": "2025-01-01",
            "architecture": "microservices",
            "api_version": "v1",
            "python_version": "3.11+",
            "core_dependencies": {
                "fastapi": "0.104+",
                "pydantic": "2.0+",
                "uvicorn": "0.24+"
            },
            "optional_dependencies": {
                "openai": "1.0+",
                "whisper": "latest"
            },
            "features": {
                "async_processing": True,
                "streaming_responses": True,
                "task_management": True,
                "file_management": True,
                "ai_integration": True,
                "transcription": True
            }
        }
        
        return response_manager.success(
            data=version_info,
            message="版本信息获取成功"
        )
        
    except Exception as e:
        return response_manager.error(
            message=f"获取版本信息失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.post("/maintenance/cleanup", summary="系统清理", response_model=StandardResponse)
async def system_cleanup():
    """
    执行系统清理
    
    清理临时文件、过期缓存、无效任务等
    """
    try:
        cleanup_result = await system_service.perform_cleanup()
        
        return response_manager.success(
            data=cleanup_result,
            message="系统清理完成"
        )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"系统清理失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.get("/", summary="API根信息", response_model=StandardResponse)
async def api_root():
    """
    API根路径信息
    
    返回API的基本信息和可用端点
    """
    return response_manager.success(
        data={
            "name": settings.app_name,
            "version": settings.app_version,
            "description": "VideoChat - 音视频内容处理API",
            "documentation": "/docs",
            "health_check": "/api/system/health",
            "modules": {
                "files": "/api/files",
                "tasks": "/api/tasks",
                "transcriptions": "/api/transcriptions",
                "ai": "/api/ai",
                "system": "/api/system"
            },
            "features": [
                "文件上传和管理",
                "异步任务处理",
                "音频转录",
                "AI内容分析",
                "实时进度跟踪",
                "多格式导出"
            ]
        },
        message="VideoChat API 服务正常运行"
    )