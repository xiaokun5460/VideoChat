"""
转录进度反馈系统

提供详细的转录进度跟踪和实时反馈
"""

import asyncio
import logging
import time
from typing import Dict, Any, Optional, AsyncGenerator, Callable
from utils.progress_manager import progress_manager, TaskType, TaskStatus


class TranscriptionProgressTracker:
    """转录进度跟踪器"""
    
    def __init__(self):
        """初始化转录进度跟踪器"""
        self.active_tasks: Dict[str, str] = {}  # file_path -> task_id
        
    async def start_transcription_tracking(
        self,
        file_path: str,
        file_name: str,
        estimated_duration: float = 0.0
    ) -> str:
        """
        开始转录进度跟踪
        
        Args:
            file_path: 文件路径
            file_name: 文件名
            estimated_duration: 预估时长（秒）
        
        Returns:
            任务ID
        """
        # 创建进度任务
        task_id = progress_manager.create_task(
            task_type=TaskType.TRANSCRIPTION,
            file_name=file_name,
            total_steps=4,  # 初始化、加载模型、转录、后处理
            metadata={
                'file_path': file_path,
                'estimated_duration': estimated_duration,
                'start_time': time.time()
            }
        )
        
        self.active_tasks[file_path] = task_id
        
        # 初始化进度
        progress_manager.update_progress(
            task_id=task_id,
            status=TaskStatus.INITIALIZING,
            current_step="准备转录任务",
            current_step_index=0,
            progress=0.0
        )
        
        logging.info(f"🎤 开始转录进度跟踪: {file_name} -> {task_id}")
        return task_id
    
    async def update_model_loading(self, file_path: str, model_name: str):
        """更新模型加载进度"""
        if file_path not in self.active_tasks:
            return
        
        task_id = self.active_tasks[file_path]
        progress_manager.update_progress(
            task_id=task_id,
            status=TaskStatus.PROCESSING,
            current_step=f"加载模型: {model_name}",
            current_step_index=1,
            progress=10.0
        )
        
        logging.info(f"🤖 模型加载: {model_name}")
    
    async def update_transcription_progress(
        self,
        file_path: str,
        progress_percent: float,
        current_segment: Optional[str] = None,
        segments_processed: int = 0,
        total_segments: int = 0
    ):
        """
        更新转录进度
        
        Args:
            file_path: 文件路径
            progress_percent: 进度百分比
            current_segment: 当前处理的文本段
            segments_processed: 已处理段数
            total_segments: 总段数
        """
        if file_path not in self.active_tasks:
            return
        
        task_id = self.active_tasks[file_path]
        
        # 转录进度占总进度的70%（10%-80%）
        actual_progress = 10.0 + (progress_percent * 0.7)
        
        step_text = "转录音频内容"
        if current_segment:
            step_text += f": {current_segment[:50]}..."
        if total_segments > 0:
            step_text += f" ({segments_processed}/{total_segments})"
        
        progress_manager.update_progress(
            task_id=task_id,
            status=TaskStatus.PROCESSING,
            current_step=step_text,
            current_step_index=2,
            progress=actual_progress,
            metadata={
                'segments_processed': segments_processed,
                'total_segments': total_segments,
                'current_segment': current_segment
            }
        )
    
    async def update_post_processing(self, file_path: str, step_name: str):
        """更新后处理进度"""
        if file_path not in self.active_tasks:
            return
        
        task_id = self.active_tasks[file_path]
        progress_manager.update_progress(
            task_id=task_id,
            status=TaskStatus.PROCESSING,
            current_step=f"后处理: {step_name}",
            current_step_index=3,
            progress=85.0
        )
        
        logging.info(f"⚙️ 后处理: {step_name}")
    
    async def complete_transcription(
        self,
        file_path: str,
        success: bool = True,
        result_text: str = "",
        error_message: str = "",
        segments_count: int = 0
    ):
        """
        完成转录
        
        Args:
            file_path: 文件路径
            success: 是否成功
            result_text: 转录结果文本
            error_message: 错误信息
            segments_count: 转录段数
        """
        if file_path not in self.active_tasks:
            return
        
        task_id = self.active_tasks[file_path]
        
        # 计算转录时长
        task_info = progress_manager.get_task(task_id)
        if task_info and task_info.metadata:
            start_time = task_info.metadata.get('start_time', time.time())
            duration = time.time() - start_time
        else:
            duration = 0
        
        # 完成任务
        result_metadata = {
            'transcription_duration': duration,
            'segments_count': segments_count,
            'text_length': len(result_text) if result_text else 0
        }
        
        if result_text:
            result_metadata['result_preview'] = result_text[:200] + "..." if len(result_text) > 200 else result_text
        
        progress_manager.complete_task(
            task_id=task_id,
            success=success,
            error_message=error_message,
            result_metadata=result_metadata
        )
        
        # 清理活跃任务
        del self.active_tasks[file_path]
        
        status = "成功" if success else "失败"
        logging.info(f"✅ 转录完成: {file_path} - {status} (耗时: {duration:.2f}s)")
    
    async def cancel_transcription(self, file_path: str):
        """取消转录"""
        if file_path not in self.active_tasks:
            return
        
        task_id = self.active_tasks[file_path]
        progress_manager.cancel_task(task_id)
        del self.active_tasks[file_path]
        
        logging.info(f"⏹️ 转录已取消: {file_path}")
    
    def get_transcription_task_id(self, file_path: str) -> Optional[str]:
        """获取转录任务ID"""
        return self.active_tasks.get(file_path)
    
    def get_active_transcriptions(self) -> Dict[str, str]:
        """获取所有活跃的转录任务"""
        return self.active_tasks.copy()


class WhisperProgressCallback:
    """Whisper转录进度回调"""
    
    def __init__(self, tracker: TranscriptionProgressTracker, file_path: str):
        """
        初始化回调
        
        Args:
            tracker: 进度跟踪器
            file_path: 文件路径
        """
        self.tracker = tracker
        self.file_path = file_path
        self.last_update = 0
        self.update_interval = 0.5  # 500ms更新一次
    
    async def on_segment(self, segment_info: Dict[str, Any]):
        """
        处理转录段回调
        
        Args:
            segment_info: 段信息，包含start, end, text等
        """
        current_time = time.time()
        if current_time - self.last_update < self.update_interval:
            return
        
        # 估算进度（基于时间）
        if 'start' in segment_info and 'end' in segment_info:
            # 这里需要总时长信息，暂时使用简单估算
            progress = min(segment_info['end'] / 300 * 100, 95)  # 假设最长5分钟
        else:
            progress = 50  # 默认进度
        
        await self.tracker.update_transcription_progress(
            file_path=self.file_path,
            progress_percent=progress,
            current_segment=segment_info.get('text', ''),
            segments_processed=segment_info.get('id', 0) + 1
        )
        
        self.last_update = current_time
    
    async def on_progress(self, progress_info: Dict[str, Any]):
        """
        处理通用进度回调
        
        Args:
            progress_info: 进度信息
        """
        progress = progress_info.get('progress', 0)
        step = progress_info.get('step', 'Processing')
        
        await self.tracker.update_transcription_progress(
            file_path=self.file_path,
            progress_percent=progress,
            current_segment=step
        )


# 全局转录进度跟踪器实例
transcription_tracker = TranscriptionProgressTracker()