"""
系统管理API路由

系统健康检查、监控、配置管理等功能
"""

from datetime import datetime
from fastapi import APIRouter

from core.response import response_manager
from core.config import settings
from core.exceptions import ErrorCodes
from services import file_service, task_service, transcription_service, ai_service


router = APIRouter(prefix="/api/system", tags=["系统管理"])


@router.get("/health", summary="系统健康检查")
async def health_check():
    """
    检查系统和各服务的健康状态
    
    返回系统整体状态和各个服务的详细状态
    """
    try:
        services_status = {}
        
        # 检查文件服务
        try:
            file_stats = await file_service.get_file_stats()
            services_status["file_service"] = {
                "status": "healthy",
                "details": file_stats
            }
        except Exception as e:
            services_status["file_service"] = {
                "status": "error",
                "error": str(e)
            }
        
        # 检查任务服务
        try:
            task_stats = await task_service.get_task_stats()
            services_status["task_service"] = {
                "status": "healthy",
                "details": task_stats
            }
        except Exception as e:
            services_status["task_service"] = {
                "status": "error",
                "error": str(e)
            }
        
        # 检查转录服务
        try:
            transcription_stats = await transcription_service.get_transcription_stats()
            services_status["transcription_service"] = {
                "status": "healthy",
                "details": transcription_stats
            }
        except Exception as e:
            services_status["transcription_service"] = {
                "status": "error",
                "error": str(e)
            }
        
        # 检查AI服务
        try:
            ai_stats = await ai_service.get_ai_stats()
            services_status["ai_service"] = {
                "status": "healthy" if ai_stats.get("client_available") else "degraded",
                "details": ai_stats
            }
        except Exception as e:
            services_status["ai_service"] = {
                "status": "error",
                "error": str(e)
            }
        
        # 判断整体状态
        overall_status = "healthy"
        for service, status in services_status.items():
            if status["status"] == "error":
                overall_status = "degraded"
                break
            elif status["status"] == "degraded" and overall_status == "healthy":
                overall_status = "degraded"
        
        return response_manager.success(
            data={
                "status": overall_status,
                "services": services_status,
                "timestamp": datetime.now().isoformat(),
                "version": settings.app_version
            },
            message="健康检查完成"
        )
        
    except Exception as e:
        return response_manager.error(
            message=f"健康检查失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR,
            status_code=500
        )


@router.get("/stats", summary="系统统计信息")
async def get_system_stats():
    """
    获取系统运行统计信息
    
    包括各服务的详细统计数据
    """
    try:
        stats = {}
        
        # 获取文件服务统计
        try:
            stats["files"] = await file_service.get_file_stats()
        except Exception as e:
            stats["files"] = {"error": str(e)}
        
        # 获取任务服务统计
        try:
            stats["tasks"] = await task_service.get_task_stats()
        except Exception as e:
            stats["tasks"] = {"error": str(e)}
        
        # 获取转录服务统计
        try:
            stats["transcriptions"] = await transcription_service.get_transcription_stats()
        except Exception as e:
            stats["transcriptions"] = {"error": str(e)}
        
        # 获取AI服务统计
        try:
            stats["ai"] = await ai_service.get_ai_stats()
        except Exception as e:
            stats["ai"] = {"error": str(e)}
        
        return response_manager.success(
            data=stats,
            message="系统统计信息获取成功"
        )
        
    except Exception as e:
        return response_manager.error(
            message=f"获取系统统计失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.post("/optimize", summary="系统优化")
async def optimize_system():
    """
    执行系统优化操作
    
    清理过期数据、优化性能等
    """
    try:
        optimization_results = {}
        
        # 清理过期任务
        try:
            cleaned_count = await task_service.cleanup_completed_tasks(days=7)
            optimization_results["task_cleanup"] = {
                "status": "success",
                "cleaned_count": cleaned_count
            }
        except Exception as e:
            optimization_results["task_cleanup"] = {
                "status": "error",
                "error": str(e)
            }
        
        # 可以添加更多优化操作
        # 例如：清理临时文件、压缩日志、优化数据库等
        
        return response_manager.success(
            data=optimization_results,
            message="系统优化完成"
        )
        
    except Exception as e:
        return response_manager.error(
            message=f"系统优化失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.get("/config", summary="获取系统配置")
async def get_system_config():
    """
    获取当前系统配置信息
    
    返回系统的主要配置参数（敏感信息已脱敏）
    """
    try:
        config = {
            "app_name": settings.app_name,
            "app_version": settings.app_version,
            "debug": settings.debug,
            "max_file_size": f"{settings.max_file_size // (1024 * 1024)}MB",
            "allowed_file_types": settings.allowed_file_types,
            "ai_model_name": settings.ai_model_name,
            "whisper_model": settings.whisper_model,
            "use_gpu": settings.use_gpu,
            "max_concurrent_tasks": settings.max_concurrent_tasks,
            "task_timeout": f"{settings.task_timeout}s",
            "cache_ttl": f"{settings.cache_ttl}s",
            "features": {
                "ai_service": bool(settings.openai_api_key),
                "gpu_acceleration": settings.use_gpu,
                "streaming_response": True,
                "task_management": True,
                "file_management": True
            }
        }
        
        return response_manager.success(
            data=config,
            message="系统配置获取成功"
        )
        
    except Exception as e:
        return response_manager.error(
            message=f"获取系统配置失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.get("/version", summary="获取版本信息")
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


@router.get("/", summary="API根信息")
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
