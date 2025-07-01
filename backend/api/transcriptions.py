"""
转录结果API路由

基于TranscriptionService的转录结果管理接口，统一响应格式
"""

from typing import Optional
from fastapi import APIRouter, Query, Path
from fastapi.responses import Response

from core.response import response_manager
from core.models import TranscriptionResult, StandardResponse
from core.exceptions import VideoChateException, ErrorCodes
from services import transcription_service


router = APIRouter(prefix="/api/transcriptions", tags=["转录结果"])


@router.get("/", summary="获取转录结果列表", response_model=StandardResponse)
async def get_transcriptions(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    file_id: Optional[str] = Query(None, description="文件ID筛选"),
    language: Optional[str] = Query(None, description="语言筛选"),
    status: Optional[str] = Query(None, description="状态筛选")
):
    """
    获取转录结果列表
    
    支持分页、文件筛选和语言筛选
    """
    try:
        # 构建筛选条件
        filters = {}
        if file_id:
            filters["file_id"] = file_id
        if language:
            filters["language"] = language
        if status:
            filters["status"] = status
        
        # 获取转录结果列表
        transcriptions, total = await transcription_service.get_transcription_list(
            page=page,
            page_size=page_size,
            filters=filters
        )
        
        return response_manager.paginated(
            items=[t.model_dump(mode='json') for t in transcriptions],
            total=total,
            page=page,
            page_size=page_size,
            message="转录结果列表获取成功"
        )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"获取转录结果列表失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.get("/{transcription_id}", summary="获取转录结果详情", response_model=StandardResponse)
async def get_transcription_detail(
    transcription_id: str = Path(..., description="转录结果ID")
):
    """
    获取转录结果详情
    
    根据转录结果ID获取详细信息
    """
    try:
        transcription = await transcription_service.get_transcription(transcription_id)
        
        if not transcription:
            return response_manager.error(
                message=f"转录结果不存在: {transcription_id}",
                code=ErrorCodes.NOT_FOUND,
                status_code=404
            )
        
        return response_manager.success(
            data=transcription.model_dump(mode='json'),
            message="转录结果详情获取成功"
        )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"获取转录结果详情失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.get("/{transcription_id}/export", summary="导出转录结果")
async def export_transcription(
    transcription_id: str = Path(..., description="转录结果ID"),
    format: str = Query("txt", description="导出格式: txt, srt, vtt, json")
):
    """
    导出转录结果
    
    支持多种格式导出：TXT、SRT、VTT、JSON
    """
    try:
        # 获取转录结果
        transcription = await transcription_service.get_transcription(transcription_id)
        
        if not transcription:
            return response_manager.error(
                message=f"转录结果不存在: {transcription_id}",
                code=ErrorCodes.NOT_FOUND,
                status_code=404
            )
        
        # 导出为指定格式
        exported_content, content_type, filename = await transcription_service.export_transcription(
            transcription, format
        )
        
        return Response(
            content=exported_content,
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"导出转录结果失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.delete("/{transcription_id}", summary="删除转录结果", response_model=StandardResponse)
async def delete_transcription(
    transcription_id: str = Path(..., description="转录结果ID")
):
    """
    删除转录结果
    
    删除指定的转录结果及其相关数据
    """
    try:
        success = await transcription_service.delete_transcription(transcription_id)
        
        if not success:
            return response_manager.error(
                message=f"转录结果不存在: {transcription_id}",
                code=ErrorCodes.NOT_FOUND,
                status_code=404
            )
        
        return response_manager.success(
            data={"transcription_id": transcription_id, "deleted": True},
            message="转录结果删除成功"
        )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"删除转录结果失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.get("/stats/overview", summary="获取转录统计信息", response_model=StandardResponse)
async def get_transcription_stats():
    """
    获取转录统计信息
    
    包括转录数量、语言分布、时长统计等
    """
    try:
        stats = await transcription_service.get_transcription_stats()
        
        return response_manager.success(
            data={
                "stats": stats,
                "type": "transcription_stats"
            },
            message="转录统计信息获取成功"
        )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"获取转录统计失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )


@router.get("/search", summary="搜索转录内容", response_model=StandardResponse)
async def search_transcriptions(
    query: str = Query(..., description="搜索关键词"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    file_id: Optional[str] = Query(None, description="文件ID筛选")
):
    """
    搜索转录内容
    
    在转录文本中搜索指定关键词
    """
    try:
        # 构建搜索条件
        search_filters = {"query": query}
        if file_id:
            search_filters["file_id"] = file_id
        
        # 执行搜索
        results, total = await transcription_service.search_transcriptions(
            search_filters=search_filters,
            page=page,
            page_size=page_size
        )
        
        return response_manager.paginated(
            items=results,
            total=total,
            page=page,
            page_size=page_size,
            message=f"搜索到 {total} 条相关转录结果"
        )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"搜索转录内容失败: {str(e)}",
            code=ErrorCodes.INTERNAL_ERROR
        )