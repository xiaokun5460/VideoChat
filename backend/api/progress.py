"""
进度管理API路由

提供任务进度查询、活跃任务列表等进度相关接口
"""

from typing import Optional
from fastapi import APIRouter, Query, Path
from fastapi.responses import StreamingResponse

from core.response import response_manager
from core.models import StandardResponse
from core.exceptions import VideoChateException, ErrorCodes
from services import task_service
from utils.progress_manager import progress_manager


router = APIRouter(prefix="/api/progress", tags=["进度管理"])


@router.get("/active", summary="获取活跃任务列表", response_model=StandardResponse)
async def get_active_tasks():
    """
    获取所有活跃任务列表
    
    返回当前正在执行、排队或初始化中的任务
    """
    try:
        # 从progress_manager获取活跃任务
        active_tasks = progress_manager.get_active_tasks()
        
        # 转换为字典格式
        tasks_data = [task.to_dict() for task in active_tasks]
        
        return response_manager.success(
            data={
                "tasks": tasks_data,
                "count": len(tasks_data)
            },
            message="活跃任务列表获取成功"
        )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"获取活跃任务失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.get("/{task_id}", summary="获取任务进度", response_model=StandardResponse)
async def get_task_progress(
    task_id: str = Path(..., description="任务ID"),
    stream: bool = Query(False, description="是否使用流式响应")
):
    """
    获取单个任务的进度信息
    
    支持流式和非流式两种方式获取任务进度
    """
    try:
        if stream:
            # 流式进度响应
            async def generate_progress_stream():
                async for progress_data in progress_manager.stream_progress(task_id):
                    yield progress_data
            
            return StreamingResponse(
                generate_progress_stream(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": "*"
                }
            )
        else:
            # 非流式进度响应
            task_info = progress_manager.get_task_dict(task_id)
            
            if not task_info:
                return response_manager.error(
                    message=f"任务不存在: {task_id}",
                    code=ErrorCodes.TASK_NOT_FOUND,
                    status_code=404
                )
            
            return response_manager.success(
                data=task_info,
                message="任务进度获取成功"
            )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"获取任务进度失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.post("/{task_id}/cancel", summary="取消任务", response_model=StandardResponse)
async def cancel_task(
    task_id: str = Path(..., description="任务ID")
):
    """
    取消任务
    
    取消正在执行或排队中的任务
    """
    try:
        success = progress_manager.cancel_task(task_id)
        
        if not success:
            return response_manager.error(
                message=f"任务不存在或无法取消: {task_id}",
                code=ErrorCodes.TASK_NOT_FOUND,
                status_code=404
            )
        
        return response_manager.success(
            data={"task_id": task_id, "cancelled": True},
            message="任务取消成功"
        )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"取消任务失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.get("/{task_id}/stream", summary="流式任务进度")
async def stream_task_progress(
    task_id: str = Path(..., description="任务ID")
):
    """
    获取任务的流式进度更新
    
    使用Server-Sent Events (SSE) 推送实时进度
    """
    try:
        async def generate_progress_stream():
            async for progress_data in progress_manager.stream_progress(task_id):
                yield progress_data
        
        return StreamingResponse(
            generate_progress_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*"
            }
        )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"流式进度获取失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.get("/stats", summary="获取进度统计信息", response_model=StandardResponse)
async def get_progress_stats():
    """
    获取进度管理统计信息
    
    包括活跃任务数、完成任务数等统计数据
    """
    try:
        stats = progress_manager.get_stats()
        
        return response_manager.success(
            data=stats,
            message="进度统计信息获取成功"
        )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"获取进度统计失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.post("/cleanup", summary="清理已完成任务", response_model=StandardResponse)
async def cleanup_completed_tasks():
    """
    清理已完成的任务
    
    删除过期的已完成、失败或取消的任务
    """
    try:
        progress_manager.cleanup_completed_tasks()
        
        return response_manager.success(
            data={"cleaned": True},
            message="已完成任务清理成功"
        )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"清理任务失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )
