"""
任务管理API路由

基于TaskService的异步任务管理接口，统一响应格式
"""

from typing import Optional
from fastapi import APIRouter, Query, Path
from fastapi.responses import StreamingResponse

from core.response import response_manager
from core.models import TaskCreateRequest, TaskInfo, TaskCreateResponse, StandardResponse
from core.exceptions import VideoChateException, ErrorCodes
from services import task_service


router = APIRouter(prefix="/api/tasks", tags=["任务管理"])


@router.post("/", summary="创建任务", response_model=TaskCreateResponse)
async def create_task(request: TaskCreateRequest):
    """
    创建新的异步任务
    
    - **task_type**: 任务类型
    - **file_id**: 关联文件ID（可选）
    - **parameters**: 任务参数（可选）
    """
    try:
        task_info = await task_service.create_task(
            task_type=request.task_type,
            file_id=request.file_id,
            parameters=request.parameters or {}
        )
        
        return response_manager.success(
            data={
                "task_id": task_info.task_id,
                "task_type": task_info.task_type,
                "status": task_info.status,
                "created_at": task_info.created_at,
                "estimated_duration": task_info.metadata.get("estimated_duration") if task_info.metadata else None
            },
            message="任务创建成功"
        )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"创建任务失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.get("/", summary="获取任务列表", response_model=StandardResponse)
async def get_tasks(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    status: Optional[str] = Query(None, description="任务状态筛选"),
    task_type: Optional[str] = Query(None, description="任务类型筛选"),
    file_id: Optional[str] = Query(None, description="关联文件ID筛选")
):
    """
    获取任务列表
    
    支持分页、状态筛选和类型筛选
    """
    try:
        # 获取任务列表
        tasks, total = await task_service.get_task_list(
            page=page,
            page_size=page_size,
            status=status,
            task_type=task_type
        )
        
        return response_manager.paginated(
            items=[task.model_dump(mode='json') for task in tasks],
            total=total,
            page=page,
            page_size=page_size,
            message="任务列表获取成功"
        )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"获取任务列表失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.get("/{task_id}", summary="获取任务详情", response_model=StandardResponse)
async def get_task_detail(
    task_id: str = Path(..., description="任务ID")
):
    """
    获取任务详情
    
    根据任务ID获取详细的任务信息
    """
    try:
        task_info = await task_service.get_task_info(task_id)
        
        if not task_info:
            return response_manager.error(
                message=f"任务不存在: {task_id}",
                code=ErrorCodes.TASK_NOT_FOUND,
                status_code=404
            )
        
        return response_manager.success(
            data=task_info.model_dump(mode='json'),
            message="任务详情获取成功"
        )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"获取任务详情失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.get("/{task_id}/progress", summary="获取任务进度")
async def get_task_progress(
    task_id: str = Path(..., description="任务ID"),
    stream: bool = Query(False, description="是否使用流式响应")
):
    """
    获取任务进度
    
    支持流式和非流式两种方式获取任务进度
    """
    try:
        if stream:
            # 流式进度响应
            async def generate_progress_stream():
                async for progress_data in task_service.get_task_progress_stream(task_id):
                    yield progress_data
            
            return await response_manager.streaming(
                data_generator=generate_progress_stream(),
                message="任务进度监控中",
                operation_type="task_progress"
            )
        else:
            # 非流式进度响应
            progress_data = await task_service.get_task_progress(task_id)
            
            if not progress_data:
                return response_manager.error(
                    message=f"任务不存在: {task_id}",
                    code=ErrorCodes.TASK_NOT_FOUND,
                    status_code=404
                )
            
            return response_manager.success(
                data=progress_data,
                message="任务进度获取成功"
            )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"获取任务进度失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.get("/progress/active", summary="获取活跃任务列表", response_model=StandardResponse)
async def get_active_tasks():
    """
    获取所有活跃任务列表

    返回当前正在执行、排队或初始化中的任务
    """
    try:
        active_tasks = await task_service.get_active_tasks()

        return response_manager.success(
            data={
                "tasks": active_tasks,
                "count": len(active_tasks)
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


@router.post("/{task_id}/cancel", summary="取消任务", response_model=StandardResponse)
async def cancel_task(
    task_id: str = Path(..., description="任务ID")
):
    """
    取消任务
    
    取消正在执行或排队中的任务
    """
    try:
        success = await task_service.cancel_task(task_id)
        
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


@router.get("/{task_id}/result", summary="获取任务结果", response_model=StandardResponse)
async def get_task_result(
    task_id: str = Path(..., description="任务ID")
):
    """
    获取任务结果
    
    获取已完成任务的处理结果
    """
    try:
        result = await task_service.get_task_result(task_id)
        
        if not result:
            return response_manager.error(
                message=f"任务不存在或未完成: {task_id}",
                code=ErrorCodes.TASK_NOT_FOUND,
                status_code=404
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
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.delete("/{task_id}", summary="删除任务", response_model=StandardResponse)
async def delete_task(
    task_id: str = Path(..., description="任务ID")
):
    """
    删除任务
    
    删除指定的任务及其相关数据
    """
    try:
        success = await task_service.delete_task(task_id)
        
        if not success:
            return response_manager.error(
                message=f"任务不存在: {task_id}",
                code=ErrorCodes.TASK_NOT_FOUND,
                status_code=404
            )
        
        return response_manager.success(
            data={"task_id": task_id, "deleted": True},
            message="任务删除成功"
        )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"删除任务失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.get("/stats/overview", summary="获取任务统计信息", response_model=StandardResponse)
async def get_task_stats():
    """
    获取任务统计信息
    
    包括任务数量、状态分布、性能指标等
    """
    try:
        stats = await task_service.get_task_stats()
        
        return response_manager.success(
            data={
                "stats": stats,
                "type": "task_stats"
            },
            message="任务统计信息获取成功"
        )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"获取任务统计失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.post("/cleanup", summary="清理已完成任务", response_model=StandardResponse)
async def cleanup_completed_tasks(
    older_than_days: int = Query(7, ge=1, description="清理多少天前的任务")
):
    """
    清理已完成的任务
    
    清理指定天数前已完成的任务记录
    """
    try:
        cleaned_count = await task_service.cleanup_completed_tasks(older_than_days)
        
        return response_manager.success(
            data={
                "cleaned_count": cleaned_count,
                "older_than_days": older_than_days
            },
            message=f"成功清理 {cleaned_count} 个已完成任务"
        )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"清理任务失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )