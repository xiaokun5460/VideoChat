"""
文件处理相关API路由

提供文件上传、音视频转录等文件处理相关的API端点
"""

import os
import logging
import asyncio
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from utils.response import success_response, error_response
from utils.api_helpers import handle_transcription_task, handle_api_exception, validate_not_empty
from utils.chunked_upload import chunked_upload_manager
from utils.transcription_progress import transcription_tracker
from services.stt_service import transcribe_audio, stop_transcription
from models import (
    TranscriptionResponse, TranscribeDownloadedRequest, StopTranscribeResponse
)

# 创建路由器
router = APIRouter(prefix="/api", tags=["文件处理"])

# 全局变量来跟踪转录任务
transcription_task = None


@router.post(
    "/upload",
    summary="上传文件转录",
    description="上传音视频文件并自动转录为文本",
    response_model=TranscriptionResponse
)
@handle_api_exception("文件上传和转录")
async def upload_file(
    file: UploadFile = File(..., description="音视频文件")
):
    """上传文件并开始转录"""
    global transcription_task

    # 验证文件
    if not file.filename:
        return error_response("文件名不能为空")

    # 检查文件扩展名
    allowed_extensions = {'.mp3', '.wav', '.m4a', '.mp4', '.avi', '.mov', '.mkv', '.flv'}
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        return error_response(f"不支持的文件格式: {file_ext}")

    # 保存上传的文件
    file_path = f"uploads/{file.filename}"
    os.makedirs("uploads", exist_ok=True)

    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)

    # 使用统一的转录任务处理
    task_ref = {"task": transcription_task}
    result = await handle_transcription_task(transcribe_audio, file_path, task_ref, file.filename)
    transcription_task = task_ref["task"]

    if isinstance(result, JSONResponse):
        return result

    # 返回完整的转录结果，包含task_id用于进度跟踪
    return {
        "transcription": result["transcription"],
        "task_id": result.get("task_id"),
        "message": "文件上传成功，转录已开始",
        "status": "success"
    }


@router.post(
    "/transcribe-downloaded",
    summary="转录已下载文件",
    description="转录服务器上的音视频文件",
    response_model=TranscriptionResponse
)
@handle_api_exception("转录已下载文件")
async def transcribe_downloaded_file(request: TranscribeDownloadedRequest):
    """转录已下载的文件"""
    global transcription_task

    filename = request.filename
    file_path = request.file_path

    if not filename or not file_path:
        return error_response("缺少文件名或文件路径")

    # 确保文件路径安全
    if not file_path.startswith("uploads/"):
        return error_response("无效的文件路径")

    # 检查文件是否存在
    if not os.path.exists(file_path):
        return error_response("文件不存在")

    # 使用统一的转录任务处理
    task_ref = {"task": None}
    result = await handle_transcription_task(transcribe_audio, file_path, task_ref, filename)
    transcription_task = task_ref["task"]

    if isinstance(result, JSONResponse):
        return result
    return TranscriptionResponse(transcription=result["transcription"])


@router.post(
    "/stop-transcribe",
    summary="停止转录任务",
    description="中断当前转录任务",
    response_model=StopTranscribeResponse
)
async def stop_transcribe():
    """停止当前转录任务"""
    global transcription_task
    try:
        # 使用新的异步停止接口
        success = await stop_transcription()

        if transcription_task and not transcription_task.cancelled():
            # 取消正在进行的转录任务
            transcription_task.cancel()
            try:
                await asyncio.wait_for(transcription_task, timeout=0.5)
            except (asyncio.TimeoutError, asyncio.CancelledError):
                pass
            transcription_task = None

        return success_response(
            data={"stopped": success},
            message="转录已停止" if success else "没有正在进行的转录任务"
        )
    except Exception as e:
        return error_response(f"停止转录失败: {str(e)}")


# ==================== 分片上传相关端点 ====================

@router.post(
    "/upload/chunked/init",
    summary="初始化分片上传",
    description="创建分片上传会话"
)
@handle_api_exception("初始化分片上传")
async def init_chunked_upload(
    file_name: str,
    file_size: int,
    file_hash: str,
    chunk_size: int = 2 * 1024 * 1024  # 默认2MB
):
    """初始化分片上传会话"""
    try:
        session_id = await chunked_upload_manager.create_upload_session(
            file_name=file_name,
            file_size=file_size,
            file_hash=file_hash,
            chunk_size=chunk_size
        )

        return success_response(
            data={
                "session_id": session_id,
                "chunk_size": chunk_size,
                "total_chunks": (file_size + chunk_size - 1) // chunk_size
            },
            message="分片上传会话创建成功"
        )
    except Exception as e:
        logging.error(f"初始化分片上传失败: {str(e)}")
        return error_response(f"初始化分片上传失败: {str(e)}")


@router.post(
    "/upload/chunked/{session_id}/chunk/{chunk_id}",
    summary="上传文件分片",
    description="上传指定的文件分片"
)
@handle_api_exception("上传文件分片")
async def upload_chunk(
    session_id: str,
    chunk_id: int,
    chunk: UploadFile = File(..., description="文件分片")
):
    """上传文件分片"""
    try:
        # 读取分片数据
        chunk_data = await chunk.read()

        # 上传分片
        success = await chunked_upload_manager.upload_chunk(
            session_id=session_id,
            chunk_id=chunk_id,
            chunk_data=chunk_data
        )

        if success:
            # 获取上传状态
            status = await chunked_upload_manager.get_upload_status(session_id)

            return success_response(
                data={
                    "chunk_id": chunk_id,
                    "uploaded": True,
                    "progress": status["progress"],
                    "uploaded_chunks": status["uploaded_chunks"],
                    "total_chunks": status["total_chunks"],
                    "completed": status["completed"]
                },
                message=f"分片 {chunk_id} 上传成功"
            )
        else:
            return error_response(f"分片 {chunk_id} 上传失败")

    except Exception as e:
        logging.error(f"上传分片失败: {str(e)}")
        return error_response(f"上传分片失败: {str(e)}")


@router.get(
    "/upload/chunked/{session_id}/status",
    summary="查询上传状态",
    description="获取分片上传状态"
)
@handle_api_exception("查询上传状态")
async def get_upload_status(session_id: str):
    """获取分片上传状态"""
    try:
        status = await chunked_upload_manager.get_upload_status(session_id)
        return success_response(
            data=status,
            message="上传状态获取成功"
        )
    except Exception as e:
        logging.error(f"获取上传状态失败: {str(e)}")
        return error_response(f"获取上传状态失败: {str(e)}")


@router.post(
    "/upload/chunked/{session_id}/cancel",
    summary="取消分片上传",
    description="取消分片上传会话"
)
@handle_api_exception("取消分片上传")
async def cancel_chunked_upload(session_id: str):
    """取消分片上传"""
    try:
        success = await chunked_upload_manager.cancel_upload(session_id)
        if success:
            return success_response(
                data={"session_id": session_id},
                message="分片上传已取消"
            )
        else:
            return error_response("取消上传失败，会话不存在")
    except Exception as e:
        logging.error(f"取消分片上传失败: {str(e)}")
        return error_response(f"取消分片上传失败: {str(e)}")


@router.post(
    "/upload/chunked/{session_id}/transcribe",
    summary="转录上传文件",
    description="对分片上传完成的文件进行转录"
)
@handle_api_exception("转录上传文件")
async def transcribe_chunked_upload(session_id: str):
    """转录分片上传的文件"""
    global transcription_task

    try:
        # 获取上传状态
        status = await chunked_upload_manager.get_upload_status(session_id)

        if not status["completed"]:
            return error_response("文件上传未完成，无法开始转录")

        # 获取任务信息
        task_info = status["task_info"]
        if not task_info or "result_metadata" not in task_info:
            return error_response("无法获取上传文件信息")

        file_path = task_info["result_metadata"]["file_path"]
        file_name = status["file_name"]

        # 开始转录进度跟踪
        transcription_task_id = await transcription_tracker.start_transcription_tracking(
            file_path=file_path,
            file_name=file_name
        )

        # 异步执行转录
        async def transcribe_with_progress():
            try:
                await transcription_tracker.update_model_loading(file_path, "Whisper")
                transcription = await transcribe_audio(file_path)

                await transcription_tracker.complete_transcription(
                    file_path=file_path,
                    success=True,
                    result_text=transcription,
                    segments_count=len(transcription.split('\n')) if transcription else 0
                )
                return transcription

            except Exception as e:
                await transcription_tracker.complete_transcription(
                    file_path=file_path,
                    success=False,
                    error_message=str(e)
                )
                raise e

        # 启动转录任务
        transcription_task = asyncio.create_task(transcribe_with_progress())

        return success_response(
            data={
                "transcription_task_id": transcription_task_id,
                "session_id": session_id,
                "file_path": file_path,
                "status": "started"
            },
            message="转录任务已启动"
        )

    except Exception as e:
        logging.error(f"转录上传文件失败: {str(e)}")
        return error_response(f"转录上传文件失败: {str(e)}")