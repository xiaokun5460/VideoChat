"""
任务管理API路由

基于TaskService的异步任务管理接口
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, Query, Path, Body
from fastapi.responses import StreamingResponse

from core.response import response_manager
from core.models import TaskCreateRequest, TaskType, TaskStatus
from core.exceptions import VideoChateException, task_not_found
from services import task_service


router = APIRouter(prefix="/api/tasks", tags=["任务管理"])


@router.post("/", summary="创建任务")
async def create_task(request: TaskCreateRequest):
    """
    创建异步任务
    
    支持的任务类型：
    - **transcription**: 转录任务
    - **ai_processing**: AI处理任务
    - **download**: 下载任务
    - **export**: 导出任务
    """
    try:
        task_id = await task_service.create_task(
            task_type=request.task_type,
            file_id=request.file_id,
            parameters=request.parameters or {}
        )
        
        return response_manager.task_created(
            task_id=task_id,
            task_type=request.task_type.value if hasattr(request.task_type, 'value') else request.task_type,
            message="任务创建成功"
        )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"创建任务失败: {str(e)}",
            code="E3003"
        )


@router.get("/", summary="获取任务列表")
async def get_tasks(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    status: Optional[TaskStatus] = Query(None, description="任务状态筛选"),
    task_type: Optional[TaskType] = Query(None, description="任务类型筛选")
):
    """
    获取任务列表
    
    支持分页和状态筛选
    """
    try:
        tasks, total = await task_service.get_task_list(
            page=page,
            page_size=page_size,
            status=status,
            task_type=task_type
        )
        
        return response_manager.paginated(
            items=tasks,
            total=total,
            page=page,
            page_size=page_size,
            message="任务列表获取成功"
        )
        
    except Exception as e:
        return response_manager.error(
            message=f"获取任务列表失败: {str(e)}",
            code="E1005"
        )


@router.get("/active", summary="获取活跃任务")
async def get_active_tasks():
    """
    获取所有活跃任务
    
    返回正在进行中的任务列表
    """
    try:
        active_tasks = await task_service.get_active_tasks()
        
        return response_manager.success(
            data={"tasks": active_tasks},
            message="活跃任务获取成功"
        )
        
    except Exception as e:
        return response_manager.error(
            message=f"获取活跃任务失败: {str(e)}",
            code="E1005"
        )


@router.get("/{task_id}", summary="获取任务详情")
async def get_task_detail(
    task_id: str = Path(..., description="任务ID")
):
    """
    获取任务详情
    
    根据任务ID获取详细信息
    """
    try:
        task_data = await task_service.get_task_status(task_id)
        
        return response_manager.success(
            data=task_data,
            message="任务详情获取成功"
        )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"获取任务详情失败: {str(e)}",
            code="E1005"
        )


@router.get("/{task_id}/stream", summary="流式获取任务进度")
async def stream_task_progress(
    task_id: str = Path(..., description="任务ID")
):
    """
    通过SSE实时推送任务进度更新
    
    返回Server-Sent Events流，实时推送任务状态变化
    """
    try:
        # 检查任务是否存在
        await task_service.get_task_status(task_id)
        
        # 返回SSE流
        return StreamingResponse(
            task_service.stream_task_progress(task_id),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Cache-Control"
            }
        )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"流式获取任务进度失败: {str(e)}",
            code="E1005"
        )


@router.post("/{task_id}/cancel", summary="取消任务")
async def cancel_task(
    task_id: str = Path(..., description="任务ID")
):
    """
    取消正在进行的任务
    
    只能取消未完成的任务
    """
    try:
        success = await task_service.cancel_task(task_id)
        
        if not success:
            return response_manager.error(
                message="任务不存在或无法取消",
                code="E3001"
            )
        
        return response_manager.success(
            data={"task_id": task_id},
            message="任务已取消"
        )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"取消任务失败: {str(e)}",
            code="E1005"
        )


@router.get("/{task_id}/result", summary="获取任务结果")
async def get_task_result(
    task_id: str = Path(..., description="任务ID")
):
    """
    获取任务执行结果
    
    只有已完成的任务才有结果
    """
    try:
        result = await task_service.get_task_result(task_id)
        
        if result is None:
            return response_manager.error(
                message="任务尚未完成或无结果",
                code="E3003"
            )
        
        return response_manager.success(
            data=result,
            message="任务结果获取成功"
        )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"获取任务结果失败: {str(e)}",
            code="E1005"
        )


@router.post("/cleanup", summary="清理已完成任务")
async def cleanup_completed_tasks(
    days: int = Body(7, description="清理多少天前的任务", embed=True)
):
    """
    清理已完成的任务
    
    删除指定天数前的已完成、失败或取消的任务
    """
    try:
        cleaned_count = await task_service.cleanup_completed_tasks(days)
        
        return response_manager.success(
            data={"cleaned_count": cleaned_count},
            message=f"已清理 {cleaned_count} 个过期任务"
        )
        
    except Exception as e:
        return response_manager.error(
            message=f"清理任务失败: {str(e)}",
            code="E1005"
        )


@router.get("/stats/overview", summary="获取任务统计信息")
async def get_task_stats():
    """
    获取任务统计信息
    
    包括总数、状态分布、类型分布等
    """
    try:
        stats = await task_service.get_task_stats()
        
        return response_manager.success(
            data=stats,
            message="任务统计信息获取成功"
        )
        
    except Exception as e:
        return response_manager.error(
            message=f"获取任务统计失败: {str(e)}",
            code="E1005"
        )
