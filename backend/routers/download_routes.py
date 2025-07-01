"""
视频下载相关API路由

提供在线视频下载功能，支持YouTube、Bilibili等主流平台
"""

import logging
from fastapi import APIRouter, HTTPException, Path
from pydantic import BaseModel
from typing import Optional
from utils.response import success_response, error_response
from utils.api_helpers import handle_api_exception, validate_not_empty
from services.video_download_service import download_service
from models import (
    DownloadStartResponse, DownloadProgressResponse, CancelDownloadResponse,
    DownloadListResponse, DownloadAndTranscribeResponse, TranscriptionResponse
)

# 创建路由器
router = APIRouter(prefix="/api", tags=["视频下载"])


class DownloadRequest(BaseModel):
    """视频下载请求模型
    
    用于在线视频下载的请求参数
    """
    url: str  # 视频URL，支持YouTube、Bilibili等主流平台
    filename: Optional[str] = None  # 自定义文件名（可选）

    class Config:
        json_schema_extra = {
            "example": {
                "url": "https://www.youtube.com/watch?v=example",
                "filename": "AI讲座视频"
            }
        }


@router.post(
    "/download-video",
    summary="下载在线视频",
    description="从在线平台下载视频文件",
    response_model=DownloadStartResponse
)
@handle_api_exception("启动下载")
async def download_video(request: DownloadRequest):
    # 验证URL不为空
    validate_not_empty(request.url, "URL")

    # 开始下载
    task_id = download_service.start_download(request.url, request.filename)

    return {
        "task_id": task_id,
        "message": "下载任务已开始",
        "url": request.url
    }


@router.get(
    "/download-progress/{task_id}",
    summary="查询下载进度",
    description="根据任务ID查询下载进度",
    response_model=DownloadProgressResponse
)
@handle_api_exception("获取下载进度")
async def get_download_progress(
    task_id: str = Path(..., description="下载任务的唯一标识符")
):
    progress = download_service.get_download_progress(task_id)
    if progress is None:
        raise HTTPException(status_code=404, detail="下载任务不存在")

    return progress


@router.post(
    "/cancel-download/{task_id}",
    summary="取消下载任务",
    description="取消正在进行的下载任务",
    response_model=CancelDownloadResponse
)
@handle_api_exception("取消下载")
async def cancel_download(
    task_id: str = Path(..., description="要取消的下载任务ID")
):
    success = download_service.cancel_download(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="下载任务不存在")

    return {"message": "下载任务已取消", "task_id": task_id}


@router.get(
    "/downloads",
    summary="获取所有下载任务",
    description="""
    获取系统中所有下载任务的列表和状态信息。

    **返回信息：**
    - 📋 所有任务的完整列表
    - 📊 每个任务的详细状态
    - 📁 文件名和下载进度
    - ⏰ 任务创建和完成时间

    **任务状态包括：**
    - `pending` - 等待开始
    - `downloading` - 下载中
    - `completed` - 已完成
    - `failed` - 下载失败
    - `cancelled` - 已取消

    **使用场景：**
    - 📈 监控下载队列状态
    - 🔍 查找历史下载记录
    - 📊 统计下载成功率
    - 🧹 清理失败或取消的任务
    """,
    response_model=DownloadListResponse,
    responses={
        200: {
            "description": "成功获取下载任务列表",
            "model": DownloadListResponse
        },
        500: {
            "description": "获取下载列表失败",
            "content": {
                "application/json": {
                    "example": {"detail": "获取下载列表失败: 数据库连接错误"}
                }
            }
        }
    }
)
@handle_api_exception("获取下载列表")
async def get_all_downloads():
    downloads = download_service.get_all_downloads()
    return {"downloads": downloads}


@router.post(
    "/download-and-transcribe",
    summary="下载视频并自动转录",
    description="""
    一站式服务：下载在线视频并自动进行音频转录。

    **工作流程：**
    1. 🎬 开始下载指定URL的视频
    2. ⏳ 等待下载完成（最长5分钟）
    3. 🎵 自动提取音频并开始转录
    4. 📝 返回完整的转录结果

    **功能特点：**
    - 🔄 全自动化流程，无需手动干预
    - ⏱️ 智能超时控制，避免长时间等待
    - 🎯 支持任务中断和恢复
    - 📊 实时状态反馈

    **超时处理：**
    - 下载超时：5分钟
    - 转录可中断：支持取消操作

    **适用场景：**
    - 🎓 在线课程内容转录
    - 📺 视频会议记录整理
    - 🎤 播客内容文字化
    - 📰 新闻视频快速摘要
    """,
    response_model=DownloadAndTranscribeResponse,
    responses={
        200: {
            "description": "下载和转录成功完成",
            "model": DownloadAndTranscribeResponse
        },
        400: {
            "description": "请求参数错误或下载被取消",
            "content": {
                "application/json": {
                    "examples": {
                        "empty_url": {
                            "summary": "URL为空",
                            "value": {"detail": "URL不能为空"}
                        },
                        "cancelled": {
                            "summary": "下载被取消",
                            "value": {"detail": "下载被取消"}
                        }
                    }
                }
            }
        },
        404: {
            "description": "下载任务不存在",
            "content": {
                "application/json": {
                    "example": {"detail": "下载任务不存在"}
                }
            }
        },
        499: {
            "description": "转录任务被中断",
            "content": {
                "application/json": {
                    "example": {"status": "interrupted", "detail": "转录被中断"}
                }
            }
        },
        500: {
            "description": "下载或转录过程中发生错误",
            "content": {
                "application/json": {
                    "examples": {
                        "download_failed": {
                            "summary": "下载失败",
                            "value": {"detail": "下载失败: 视频不存在或无法访问"}
                        },
                        "file_path_error": {
                            "summary": "文件路径错误",
                            "value": {"detail": "无法获取下载的文件路径"}
                        }
                    }
                }
            }
        }
    }
)
async def download_and_transcribe(request: DownloadRequest):
    import asyncio
    from fastapi.responses import JSONResponse
    from services.stt_service import transcribe_audio

    # 全局变量来跟踪转录任务
    transcription_task = None

    try:
        if not request.url.strip():
            raise HTTPException(status_code=400, detail="URL不能为空")

        # 开始下载
        task_id = download_service.start_download(request.url, request.filename)

        # 等待下载完成
        max_wait_time = 300  # 最大等待5分钟
        wait_interval = 2    # 每2秒检查一次
        waited_time = 0

        while waited_time < max_wait_time:
            progress = download_service.get_download_progress(task_id)
            if not progress:
                raise HTTPException(status_code=404, detail="下载任务不存在")

            if progress['status'] == 'completed':
                # 下载完成，获取文件路径并开始转录
                file_path = download_service.get_downloaded_file_path(task_id)
                if not file_path:
                    raise HTTPException(status_code=500, detail="无法获取下载的文件路径")

                # 开始转录
                transcription_task = asyncio.create_task(transcribe_audio(file_path))
                try:
                    transcription = await transcription_task
                    transcription_task = None

                    return {
                        "task_id": task_id,
                        "file_path": file_path,
                        "filename": progress['filename'],
                        "transcription": transcription,
                        "message": "下载和转录完成"
                    }
                except asyncio.CancelledError:
                    if not transcription_task.cancelled():
                        transcription_task.cancel()
                    transcription_task = None
                    return JSONResponse(
                        status_code=499,
                        content={"status": "interrupted", "detail": "转录被中断"}
                    )

            elif progress['status'] == 'failed':
                raise HTTPException(status_code=500, detail=f"下载失败: {progress.get('error_message', '未知错误')}")

            elif progress['status'] == 'cancelled':
                raise HTTPException(status_code=400, detail="下载被取消")

            # 等待一段时间后再检查
            await asyncio.sleep(wait_interval)
            waited_time += wait_interval

        # 超时
        download_service.cancel_download(task_id)
        raise HTTPException(status_code=408, detail="下载超时")

    except HTTPException:
        raise
    except Exception as e:
        if transcription_task and not transcription_task.cancelled():
            transcription_task.cancel()
        transcription_task = None
        raise HTTPException(status_code=500, detail=f"下载和转录失败: {str(e)}")