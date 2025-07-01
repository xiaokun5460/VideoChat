"""
转录结果API路由

基于TranscriptionService的转录结果管理接口
"""

from typing import Optional
from fastapi import APIRouter, Query, Path
from fastapi.responses import PlainTextResponse

from core.response import response_manager
from core.exceptions import VideoChateException, TranscriptionException, ErrorCodes
from services import transcription_service


router = APIRouter(prefix="/api/transcriptions", tags=["转录结果"])


@router.get("/file/{file_id}", summary="根据文件ID获取转录结果")
async def get_transcription_by_file(
    file_id: str = Path(..., description="文件ID")
):
    """
    根据文件ID获取转录结果
    
    返回该文件的转录结果，如果转录尚未完成则返回处理状态
    """
    try:
        transcription = await transcription_service.get_transcription_by_file_id(file_id)
        
        if not transcription:
            return response_manager.error(
                message="该文件的转录结果不存在",
                code=ErrorCodes.NOT_FOUND
            )
        
        return response_manager.success(
            data=transcription,
            message="转录结果获取成功"
        )
        
    except Exception as e:
        return response_manager.error(
            message=f"获取转录结果失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.get("/task/{task_id}", summary="根据任务ID获取转录结果")
async def get_transcription_by_task(
    task_id: str = Path(..., description="任务ID")
):
    """
    根据转录任务ID获取转录结果
    
    返回该任务的转录结果
    """
    try:
        transcription = await transcription_service.get_transcription_by_task_id(task_id)
        
        if not transcription:
            return response_manager.error(
                message="该任务的转录结果不存在",
                code=ErrorCodes.NOT_FOUND
            )
        
        return response_manager.success(
            data=transcription,
            message="转录结果获取成功"
        )
        
    except Exception as e:
        return response_manager.error(
            message=f"获取转录结果失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.get("/", summary="获取转录结果列表")
async def get_transcriptions(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    status: Optional[str] = Query(None, description="状态筛选"),
    file_id: Optional[str] = Query(None, description="文件ID筛选")
):
    """
    获取转录结果列表
    
    支持分页和筛选功能
    """
    try:
        transcriptions, total = await transcription_service.get_transcription_list(
            page=page,
            page_size=page_size,
            status=status,
            file_id=file_id
        )
        
        return response_manager.paginated(
            items=transcriptions,
            total=total,
            page=page,
            page_size=page_size,
            message="转录结果列表获取成功"
        )
        
    except Exception as e:
        return response_manager.error(
            message=f"获取转录结果列表失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.delete("/{transcription_id}", summary="删除转录结果")
async def delete_transcription(
    transcription_id: str = Path(..., description="转录结果ID")
):
    """
    删除指定的转录结果
    
    删除转录结果及其相关数据
    """
    try:
        success = await transcription_service.delete_transcription(transcription_id)
        
        if not success:
            return response_manager.error(
                message="转录结果不存在",
                code=ErrorCodes.NOT_FOUND
            )
        
        return response_manager.success(
            message="转录结果删除成功"
        )
        
    except Exception as e:
        return response_manager.error(
            message=f"删除转录结果失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.get("/{transcription_id}/export", summary="导出转录结果")
async def export_transcription(
    transcription_id: str = Path(..., description="转录结果ID"),
    format: str = Query("txt", description="导出格式: txt, srt, vtt, json")
):
    """
    导出转录结果为指定格式
    
    支持的格式：
    - **txt**: 纯文本格式
    - **srt**: SubRip字幕格式
    - **vtt**: WebVTT字幕格式
    - **json**: JSON格式（包含完整信息）
    """
    try:
        export_data = await transcription_service.export_transcription(
            transcription_id, format
        )
        
        # 根据格式返回不同的响应
        if format in ["txt", "srt", "vtt"]:
            return PlainTextResponse(
                content=export_data["content"],
                headers={
                    "Content-Disposition": f'attachment; filename="{export_data["filename"]}"'
                }
            )
        else:
            return response_manager.success(
                data=export_data,
                message="转录结果导出成功"
            )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"导出转录结果失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.post("/create", summary="创建转录任务")
async def create_transcription_task(
    file_id: str = Query(..., description="文件ID"),
    language: str = Query("auto", description="语言代码")
):
    """
    为指定文件创建转录任务
    
    这是一个便捷接口，会自动创建转录任务并返回任务ID
    """
    try:
        # 首先需要获取文件路径
        from services import file_service
        file_path = await file_service.get_file_path(file_id)
        
        if not file_path:
            return response_manager.error(
                message="文件不存在或无法访问",
                code=ErrorCodes.FILE_NOT_FOUND
            )
        
        # 创建转录任务
        transcription_id = await transcription_service.create_transcription_task(
            file_id=file_id,
            file_path=file_path,
            language=language
        )
        
        return response_manager.success(
            data={
                "transcription_id": transcription_id,
                "file_id": file_id,
                "language": language,
                "status": "processing"
            },
            message="转录任务创建成功"
        )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"创建转录任务失败: {str(e)}",
            code=ErrorCodes.TRANSCRIPTION_FAILED
        )


@router.get("/stats/overview", summary="获取转录统计信息")
async def get_transcription_stats():
    """
    获取转录统计信息
    
    包括总数、状态分布、总时长等
    """
    try:
        stats = await transcription_service.get_transcription_stats()
        
        return response_manager.success(
            data=stats,
            message="转录统计信息获取成功"
        )
        
    except Exception as e:
        return response_manager.error(
            message=f"获取转录统计失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )
