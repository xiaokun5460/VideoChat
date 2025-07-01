"""
文件管理API路由

基于FileService的文件管理接口
"""

import os
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Query, Path, Form
from fastapi.responses import FileResponse

from core.response import response_manager
from core.models import FileInfo, PaginationParams
from core.exceptions import VideoChateException, file_not_found
from services import file_service


router = APIRouter(prefix="/api/files", tags=["文件管理"])


@router.post("/upload", summary="上传文件")
async def upload_file(
    file: UploadFile = File(..., description="要上传的文件"),
    description: Optional[str] = Form(None, description="文件描述"),
    tags: Optional[str] = Form(None, description="文件标签，逗号分隔")
):
    """
    上传文件
    
    - **file**: 要上传的文件
    - **description**: 文件描述（可选）
    - **tags**: 文件标签，用逗号分隔（可选）
    
    返回文件信息，包含文件ID用于后续操作
    """
    try:
        # 处理标签
        tag_list = []
        if tags:
            tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
        
        # 上传文件
        file_info = await file_service.upload_file(
            file=file,
            description=description,
            tags=tag_list
        )
        
        return response_manager.success(
            data=file_info.model_dump(mode='json'),
            message="文件上传成功"
        )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"文件上传失败: {str(e)}",
            code="E2004"
        )


@router.get("/", summary="获取文件列表")
async def get_files(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    file_type: Optional[str] = Query(None, description="文件类型筛选（audio/video）"),
    status: Optional[str] = Query(None, description="状态筛选"),
    search: Optional[str] = Query(None, description="搜索关键词")
):
    """
    获取文件列表
    
    支持分页、筛选和搜索功能
    """
    try:
        # 构建筛选条件
        filters = {}
        if file_type:
            filters["file_type"] = file_type
        if status:
            filters["status"] = status
        if search:
            filters["search"] = search
        
        # 获取文件列表
        files, total = await file_service.get_list(
            page=page,
            page_size=page_size,
            filters=filters
        )
        
        return response_manager.paginated(
            items=files,
            total=total,
            page=page,
            page_size=page_size,
            message="文件列表获取成功"
        )
        
    except Exception as e:
        return response_manager.error(
            message=f"获取文件列表失败: {str(e)}",
            code="E1005"
        )


@router.get("/{file_id}", summary="获取文件详情")
async def get_file_detail(
    file_id: str = Path(..., description="文件ID")
):
    """
    获取文件详情
    
    根据文件ID获取详细信息
    """
    try:
        file_data = await file_service.get_by_id(file_id)
        
        if not file_data:
            raise file_not_found(file_id)
        
        return response_manager.success(
            data=file_data,
            message="文件详情获取成功"
        )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"获取文件详情失败: {str(e)}",
            code="E1005"
        )


@router.put("/{file_id}", summary="更新文件信息")
async def update_file(
    file_id: str = Path(..., description="文件ID"),
    description: Optional[str] = Form(None, description="文件描述"),
    tags: Optional[str] = Form(None, description="文件标签，逗号分隔"),
    status: Optional[str] = Form(None, description="文件状态")
):
    """
    更新文件信息
    
    可以更新文件的描述、标签和状态
    """
    try:
        # 构建更新数据
        update_data = {}
        
        if description is not None:
            update_data["description"] = description
            
        if tags is not None:
            tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
            update_data["tags"] = tag_list
            
        if status is not None:
            update_data["status"] = status
        
        # 更新文件
        updated_file = await file_service.update(file_id, update_data)
        
        return response_manager.success(
            data=updated_file,
            message="文件信息更新成功"
        )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"更新文件信息失败: {str(e)}",
            code="E1005"
        )


@router.delete("/{file_id}", summary="删除文件")
async def delete_file(
    file_id: str = Path(..., description="文件ID")
):
    """
    删除文件
    
    删除文件及其相关数据
    """
    try:
        success = await file_service.delete(file_id)
        
        if not success:
            raise file_not_found(file_id)
        
        return response_manager.success(
            message="文件删除成功"
        )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"删除文件失败: {str(e)}",
            code="E1005"
        )


@router.get("/{file_id}/download", summary="下载文件")
async def download_file(
    file_id: str = Path(..., description="文件ID")
):
    """
    下载文件
    
    返回文件的二进制内容
    """
    try:
        file_path = await file_service.get_file_path(file_id)
        
        if not file_path or not os.path.exists(file_path):
            raise file_not_found(file_id)
        
        # 获取文件信息用于设置下载文件名
        file_data = await file_service.get_by_id(file_id)
        filename = file_data["name"] if file_data else os.path.basename(file_path)
        
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type='application/octet-stream'
        )
        
    except VideoChateException:
        raise
    except Exception as e:
        return response_manager.error(
            message=f"下载文件失败: {str(e)}",
            code="E2001"
        )


@router.get("/stats/overview", summary="获取文件统计信息")
async def get_file_stats():
    """
    获取文件统计信息
    
    包括总数、大小、类型分布等
    """
    try:
        stats = await file_service.get_file_stats()
        
        return response_manager.success(
            data=stats,
            message="文件统计信息获取成功"
        )
        
    except Exception as e:
        return response_manager.error(
            message=f"获取文件统计失败: {str(e)}",
            code="E1005"
        )
