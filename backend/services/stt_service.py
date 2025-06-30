"""
语音转文字服务

提供基于Whisper模型的音频转录功能，支持任务管理和并发安全
"""

import asyncio
import uuid
import time
import logging
from typing import Optional, List, Union, Any
from utils.model_manager import model_manager
from utils.simple_cache import simple_cache_manager, cache_transcription_simple
from utils.task_queue import task_queue, TaskPriority
from utils.resource_monitor import resource_monitor
from middleware.error_handler import TranscriptionError
from config import AI_CONFIG, STT_CONFIG, DOWNLOAD_CONFIG
from dao.transcription_dao import TranscriptionDAO
from dao.file_dao import FileDAO


class TranscriptionTask:
    """转录任务类"""

    def __init__(self, task_id: str, file_path: str):
        self.task_id = task_id
        self.file_path = file_path
        self.should_stop = False
        self.status = "pending"  # pending, running, completed, cancelled, error
        self.progress = 0.0
        self.result = None  # 转录结果
        self.error_message = None  # 错误信息

    def cancel(self):
        """取消任务"""
        self.should_stop = True
        self.status = "cancelled"


class TranscriptionManager:
    """转录任务管理器 - 单例模式"""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._tasks = {}
            cls._instance._lock = asyncio.Lock()
        return cls._instance

    async def create_task(self, file_path: str) -> str:
        """创建新的转录任务"""
        task_id = str(uuid.uuid4())
        async with self._lock:
            self._tasks[task_id] = TranscriptionTask(task_id, file_path)
        return task_id

    async def get_task(self, task_id: str) -> Optional[TranscriptionTask]:
        """获取任务"""
        async with self._lock:
            return self._tasks.get(task_id)

    async def cancel_task(self, task_id: str) -> bool:
        """取消任务"""
        async with self._lock:
            task = self._tasks.get(task_id)
            if task:
                task.cancel()
                return True
            return False

    async def cleanup_completed_tasks(self):
        """清理已完成的任务"""
        async with self._lock:
            completed_tasks = [
                task_id for task_id, task in self._tasks.items()
                if task.status in ["completed", "cancelled", "error"]
            ]
            for task_id in completed_tasks:
                del self._tasks[task_id]

    def is_file_being_transcribed(self, file_path: str) -> bool:
        """检查文件是否正在转录"""
        for task in self._tasks.values():
            if task.file_path == file_path and task.status == "running":
                return True
        return False


# 全局转录管理器
transcription_manager = TranscriptionManager()


@cache_transcription_simple(ttl_seconds=7200)  # 缓存2小时
async def transcribe_audio(file_path: str, task_id: Optional[str] = None) -> List[dict]:
    """
    转录音频文件（支持缓存和数据库持久化）

    Args:
        file_path: 音频文件路径
        task_id: 任务ID，如果不提供则创建新任务

    Returns:
        转录结果列表
    """
    import os

    # 获取配置
    from config import STT_CONFIG

    stt_config = STT_CONFIG

    # 计算文件信息
    file_name = os.path.basename(file_path)
    file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
    file_hash = FileDAO.calculate_file_hash(file_path)

    # 检查是否已有相同文件的转录结果
    existing_tasks = TranscriptionDAO.get_tasks_by_file_hash(file_hash)
    if existing_tasks:
        logging.info(f"🔄 发现相同文件的转录结果，直接返回缓存")
        result = TranscriptionDAO.get_task_result(existing_tasks[0].task_id)
        if result and result.segments:
            return result.segments

    # 创建或获取任务
    if task_id is None:
        # 创建数据库任务记录
        db_task = TranscriptionDAO.create_task(
            task_id=str(uuid.uuid4()),
            file_path=file_path,
            file_name=file_name,
            file_size=file_size,
            file_hash=file_hash,
            model_name=stt_config["whisper_model"],
            language=stt_config["language"],
            beam_size=stt_config["beam_size"]
        )
        task_id = db_task.task_id

    # 创建文件记录
    FileDAO.create_file_record(
        file_path=file_path,
        file_name=file_name,
        file_size=file_size,
        file_hash=file_hash
    )

    try:
        # 更新任务状态
        TranscriptionDAO.update_task_status(task_id, "running")
        start_time = time.time()

        # 获取模型
        model = await model_manager.get_model()

        # 执行转录
        segments_generator = model.transcribe(
            file_path,
            beam_size=stt_config["beam_size"],
            language=stt_config["language"],
            vad_filter=stt_config["vad_filter"]
        )

        transcription = []
        segments, info = segments_generator

        for segment in segments:
            transcription.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text
            })

            # 让出控制权，允许其他任务执行
            await asyncio.sleep(0)

        # 计算处理时间
        processing_time = time.time() - start_time

        # 保存转录结果到数据库
        duration = getattr(info, 'duration', None)
        TranscriptionDAO.save_transcription_result(
            task_id=task_id,
            segments=transcription,
            duration=float(duration) if duration is not None else None,
            processing_time=processing_time
        )

        # 更新任务状态
        TranscriptionDAO.update_task_status(task_id, "completed")

        # 更新文件处理状态
        FileDAO.update_file_processed(file_path, True)

        logging.info(f"✅ 转录完成，耗时 {processing_time:.2f} 秒")
        return transcription

    except asyncio.CancelledError:
        TranscriptionDAO.update_task_status(task_id, "cancelled")
        raise
    except Exception as e:
        error_msg = str(e)
        TranscriptionDAO.update_task_status(task_id, "error", error_message=error_msg)
        raise TranscriptionError(f"转录失败: {error_msg}", file_path)
    finally:
        # 释放模型引用
        await model_manager.release_model()


async def stop_transcription(task_id: Optional[str] = None, file_path: Optional[str] = None) -> bool:
    """
    停止转录任务

    Args:
        task_id: 任务ID
        file_path: 文件路径（如果没有task_id）

    Returns:
        是否成功停止
    """
    if task_id:
        return await transcription_manager.cancel_task(task_id)
    elif file_path:
        # 兼容旧接口，查找文件对应的任务
        for task in transcription_manager._tasks.values():
            if task.file_path == file_path and task.status == "running":
                task.cancel()
                return True
        return False
    else:
        return False


def is_file_being_transcribed(file_path: str) -> bool:
    """检查指定文件是否正在被转录"""
    return transcription_manager.is_file_being_transcribed(file_path)


async def get_transcription_status(task_id: str) -> Optional[dict]:
    """获取转录任务状态"""
    task = await transcription_manager.get_task(task_id)
    if not task:
        return None

    return {
        "task_id": task.task_id,
        "file_path": task.file_path,
        "status": task.status,
        "progress": task.progress,
        "error_message": task.error_message
    }
