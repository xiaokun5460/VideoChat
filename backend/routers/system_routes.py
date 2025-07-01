"""
系统监控相关API路由

提供系统健康检查和监控相关的API端点
"""

import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException
from utils.response import success_response
from utils.playwright_html_converter import html_converter
from utils.ai_performance_optimizer import ai_performance_optimizer
from utils.media_performance_optimizer import media_performance_optimizer
from utils.simple_cache import simple_cache_manager
from utils.progress_manager import progress_manager
from utils.chunked_upload import chunked_upload_manager

# 创建路由器
router = APIRouter(prefix="/api", tags=["系统"])


@router.get(
    "/health",
    summary="健康检查",
    description="检查系统状态"
)
async def health_check():
    """系统健康检查"""
    from utils.model_manager import model_manager

    model_status = model_manager.get_status()

    return success_response(
        data={
            "status": "healthy",
            "model_status": model_status,
            "timestamp": datetime.now().isoformat()
        },
        message="系统运行正常"
    )


@router.get(
    "/playwright-stats",
    summary="转换器统计",
    description="获取HTML转图片性能统计"
)
async def get_playwright_stats():
    """获取Playwright转换器统计信息"""
    try:
        stats = html_converter.get_stats()

        return success_response(
            data={
                "converter_stats": stats,
                "timestamp": datetime.now().isoformat()
            },
            message="Playwright转换器统计获取成功"
        )
    except Exception as e:
        logging.error(f"获取Playwright统计失败: {str(e)}")
        return success_response(
            data={
                "converter_stats": {"error": str(e)},
                "timestamp": datetime.now().isoformat()
            },
            message="Playwright转换器统计获取失败"
        )


@router.get(
    "/performance-stats",
    summary="性能统计",
    description="获取系统性能统计信息"
)
async def get_performance_stats():
    """获取综合性能统计信息"""
    try:
        # 收集各组件性能统计
        performance_data = {
            "timestamp": datetime.now().isoformat(),
            "playwright_converter": html_converter.get_stats(),
            "ai_optimizer": ai_performance_optimizer.get_performance_stats(),
            "media_optimizer": media_performance_optimizer.get_performance_stats(),
            "cache_manager": simple_cache_manager.get_stats()
        }

        return success_response(
            data=performance_data,
            message="综合性能统计获取成功"
        )
    except Exception as e:
        logging.error(f"获取综合性能统计失败: {str(e)}")
        return success_response(
            data={
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            },
            message="综合性能统计获取失败"
        )


@router.post(
    "/optimize-cache",
    summary="优化缓存",
    description="清理过期缓存项"
)
async def optimize_cache():
    """手动优化缓存"""
    try:
        # 优化缓存
        expired_count = simple_cache_manager._cache.optimize()

        return success_response(
            data={
                "expired_items_removed": expired_count,
                "cache_stats": simple_cache_manager.get_stats(),
                "timestamp": datetime.now().isoformat()
            },
            message=f"缓存优化完成，清理了 {expired_count} 个过期项"
        )
    except Exception as e:
        logging.error(f"缓存优化失败: {str(e)}")
        return success_response(
            data={
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            },
            message="缓存优化失败"
        )


@router.get(
    "/progress/{task_id}",
    summary="查询任务进度",
    description="根据任务ID查询进度信息"
)
async def get_task_progress(task_id: str):
    """获取任务进度信息"""
    try:
        task_info = progress_manager.get_task_dict(task_id)
        if not task_info:
            raise HTTPException(status_code=404, detail="任务不存在")

        return success_response(
            data=task_info,
            message="任务进度获取成功"
        )
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"获取任务进度失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取任务进度失败: {str(e)}")


@router.get(
    "/progress/{task_id}/stream",
    summary="流式进度推送",
    description="实时推送任务进度更新"
)
async def stream_task_progress(task_id: str):
    """流式推送任务进度"""
    from fastapi.responses import StreamingResponse

    async def generate():
        async for data in progress_manager.stream_progress(task_id):
            yield data

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control"
        }
    )


@router.get(
    "/progress/active",
    summary="活跃任务列表",
    description="获取所有活跃任务"
)
async def get_active_tasks():
    """获取所有活跃任务"""
    try:
        active_tasks = progress_manager.get_active_tasks()
        task_list = [task.to_dict() for task in active_tasks]

        return success_response(
            data={
                "tasks": task_list,
                "count": len(task_list),
                "timestamp": datetime.now().isoformat()
            },
            message="活跃任务获取成功"
        )
    except Exception as e:
        logging.error(f"获取活跃任务失败: {str(e)}")
        return success_response(
            data={
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            },
            message="获取活跃任务失败"
        )


@router.post(
    "/progress/{task_id}/cancel",
    summary="取消任务",
    description="取消指定的任务"
)
async def cancel_task(task_id: str):
    """取消任务"""
    try:
        success = progress_manager.cancel_task(task_id)
        if not success:
            raise HTTPException(status_code=404, detail="任务不存在或无法取消")

        return success_response(
            data={"task_id": task_id},
            message="任务已取消"
        )
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"取消任务失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"取消任务失败: {str(e)}")


@router.get(
    "/upload-stats",
    summary="上传统计",
    description="获取分片上传统计信息"
)
async def get_upload_stats():
    """获取上传统计信息"""
    try:
        upload_stats = chunked_upload_manager.get_stats()
        progress_stats = progress_manager.get_stats()

        return success_response(
            data={
                "upload_manager": upload_stats,
                "progress_manager": progress_stats,
                "timestamp": datetime.now().isoformat()
            },
            message="上传统计获取成功"
        )
    except Exception as e:
        logging.error(f"获取上传统计失败: {str(e)}")
        return success_response(
            data={
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            },
            message="获取上传统计失败"
        )