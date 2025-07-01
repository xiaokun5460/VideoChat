"""
统一进度管理系统

提供统一的进度反馈、状态管理和实时更新功能
"""

import asyncio
import json
import logging
import time
import uuid
from dataclasses import dataclass, asdict
from enum import Enum
from typing import Dict, Optional, Callable, Any, AsyncGenerator, List
from datetime import datetime


class TaskStatus(Enum):
    """任务状态枚举"""
    PENDING = "pending"
    INITIALIZING = "initializing"
    PROCESSING = "processing"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskType(Enum):
    """任务类型枚举"""
    UPLOAD = "upload"
    TRANSCRIPTION = "transcription"
    AI_PROCESSING = "ai_processing"
    DOWNLOAD = "download"
    EXPORT = "export"


@dataclass
class ProgressInfo:
    """进度信息数据类"""
    task_id: str
    task_type: TaskType
    status: TaskStatus
    progress: float = 0.0  # 0-100
    current_step: str = ""
    total_steps: int = 1
    current_step_index: int = 0
    speed: str = "0 B/s"
    eta: str = "Unknown"
    file_name: str = ""
    file_size: int = 0
    processed_size: int = 0
    error_message: str = ""
    created_at: float = 0.0
    updated_at: float = 0.0
    completed_at: Optional[float] = None
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}
        if self.created_at == 0.0:
            self.created_at = time.time()
        self.updated_at = time.time()

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        data = asdict(self)
        data['task_type'] = self.task_type.value
        data['status'] = self.status.value
        data['created_at_iso'] = datetime.fromtimestamp(self.created_at).isoformat()
        data['updated_at_iso'] = datetime.fromtimestamp(self.updated_at).isoformat()
        if self.completed_at:
            data['completed_at_iso'] = datetime.fromtimestamp(self.completed_at).isoformat()
        return data


class ProgressManager:
    """统一进度管理器"""
    
    def __init__(self):
        """初始化进度管理器"""
        self._tasks: Dict[str, ProgressInfo] = {}
        self._callbacks: Dict[str, List[Callable]] = {}
        self._cleanup_interval = 3600  # 1小时清理一次完成的任务
        self._max_completed_tasks = 100  # 最多保留100个已完成任务
        self._stats = {
            'total_tasks': 0,
            'active_tasks': 0,
            'completed_tasks': 0,
            'failed_tasks': 0
        }
    
    def create_task(
        self,
        task_type: TaskType,
        file_name: str = "",
        file_size: int = 0,
        total_steps: int = 1,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        创建新任务
        
        Args:
            task_type: 任务类型
            file_name: 文件名
            file_size: 文件大小
            total_steps: 总步骤数
            metadata: 额外元数据
        
        Returns:
            任务ID
        """
        task_id = str(uuid.uuid4())
        
        progress_info = ProgressInfo(
            task_id=task_id,
            task_type=task_type,
            status=TaskStatus.PENDING,
            file_name=file_name,
            file_size=file_size,
            total_steps=total_steps,
            metadata=metadata or {}
        )
        
        self._tasks[task_id] = progress_info
        self._stats['total_tasks'] += 1
        self._stats['active_tasks'] += 1
        
        logging.info(f"📋 创建任务: {task_id} ({task_type.value}) - {file_name}")
        return task_id
    
    def update_progress(
        self,
        task_id: str,
        progress: Optional[float] = None,
        status: Optional[TaskStatus] = None,
        current_step: Optional[str] = None,
        current_step_index: Optional[int] = None,
        processed_size: Optional[int] = None,
        speed: Optional[str] = None,
        eta: Optional[str] = None,
        error_message: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        更新任务进度
        
        Args:
            task_id: 任务ID
            progress: 进度百分比 (0-100)
            status: 任务状态
            current_step: 当前步骤描述
            current_step_index: 当前步骤索引
            processed_size: 已处理大小
            speed: 处理速度
            eta: 预计剩余时间
            error_message: 错误信息
            metadata: 额外元数据
        
        Returns:
            是否更新成功
        """
        if task_id not in self._tasks:
            logging.warning(f"⚠️ 任务不存在: {task_id}")
            return False
        
        task = self._tasks[task_id]
        old_status = task.status
        
        # 更新字段
        if progress is not None:
            task.progress = max(0, min(100, progress))
        if status is not None:
            task.status = status
        if current_step is not None:
            task.current_step = current_step
        if current_step_index is not None:
            task.current_step_index = current_step_index
        if processed_size is not None:
            task.processed_size = processed_size
        if speed is not None:
            task.speed = speed
        if eta is not None:
            task.eta = eta
        if error_message is not None:
            task.error_message = error_message
        if metadata is not None:
            task.metadata.update(metadata)
        
        task.updated_at = time.time()
        
        # 处理状态变化
        if status and status != old_status:
            self._handle_status_change(task_id, old_status, status)
        
        # 触发回调
        self._trigger_callbacks(task_id, task)
        
        return True
    
    def complete_task(
        self,
        task_id: str,
        success: bool = True,
        error_message: str = "",
        result_metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        完成任务
        
        Args:
            task_id: 任务ID
            success: 是否成功
            error_message: 错误信息（如果失败）
            result_metadata: 结果元数据
        
        Returns:
            是否操作成功
        """
        if task_id not in self._tasks:
            return False
        
        task = self._tasks[task_id]
        task.progress = 100.0 if success else task.progress
        task.status = TaskStatus.COMPLETED if success else TaskStatus.FAILED
        task.completed_at = time.time()
        task.updated_at = time.time()
        
        if error_message:
            task.error_message = error_message
        
        if result_metadata:
            task.metadata.update(result_metadata)
        
        # 更新统计
        self._stats['active_tasks'] -= 1
        if success:
            self._stats['completed_tasks'] += 1
        else:
            self._stats['failed_tasks'] += 1
        
        # 触发回调
        self._trigger_callbacks(task_id, task)
        
        logging.info(f"✅ 任务完成: {task_id} - {'成功' if success else '失败'}")
        return True
    
    def cancel_task(self, task_id: str) -> bool:
        """
        取消任务
        
        Args:
            task_id: 任务ID
        
        Returns:
            是否取消成功
        """
        if task_id not in self._tasks:
            return False
        
        task = self._tasks[task_id]
        if task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED]:
            return False
        
        task.status = TaskStatus.CANCELLED
        task.updated_at = time.time()
        task.completed_at = time.time()
        
        # 更新统计
        self._stats['active_tasks'] -= 1
        self._stats['failed_tasks'] += 1
        
        # 触发回调
        self._trigger_callbacks(task_id, task)
        
        logging.info(f"⏹️ 任务已取消: {task_id}")
        return True
    
    def get_task(self, task_id: str) -> Optional[ProgressInfo]:
        """获取任务信息"""
        return self._tasks.get(task_id)
    
    def get_task_dict(self, task_id: str) -> Optional[Dict[str, Any]]:
        """获取任务信息（字典格式）"""
        task = self.get_task(task_id)
        return task.to_dict() if task else None
    
    def get_active_tasks(self) -> List[ProgressInfo]:
        """获取所有活跃任务"""
        return [
            task for task in self._tasks.values()
            if task.status not in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED]
        ]
    
    def get_tasks_by_type(self, task_type: TaskType) -> List[ProgressInfo]:
        """根据类型获取任务"""
        return [task for task in self._tasks.values() if task.task_type == task_type]
    
    def register_callback(self, task_id: str, callback: Callable[[ProgressInfo], None]):
        """注册进度回调"""
        if task_id not in self._callbacks:
            self._callbacks[task_id] = []
        self._callbacks[task_id].append(callback)
    
    def unregister_callback(self, task_id: str, callback: Callable):
        """取消注册回调"""
        if task_id in self._callbacks:
            try:
                self._callbacks[task_id].remove(callback)
            except ValueError:
                pass
    
    async def stream_progress(self, task_id: str) -> AsyncGenerator[str, None]:
        """
        流式进度推送
        
        Args:
            task_id: 任务ID
        
        Yields:
            SSE格式的进度数据
        """
        if task_id not in self._tasks:
            yield f"data: {json.dumps({'error': 'Task not found'})}\n\n"
            return
        
        # 发送初始状态
        task = self._tasks[task_id]
        yield f"data: {json.dumps(task.to_dict())}\n\n"
        
        # 持续推送更新
        last_update = task.updated_at
        while task.status not in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED]:
            await asyncio.sleep(0.5)  # 500ms检查一次
            
            if task_id not in self._tasks:
                break
            
            task = self._tasks[task_id]
            if task.updated_at > last_update:
                yield f"data: {json.dumps(task.to_dict())}\n\n"
                last_update = task.updated_at
        
        # 发送最终状态
        if task_id in self._tasks:
            final_task = self._tasks[task_id]
            yield f"data: {json.dumps(final_task.to_dict())}\n\n"
    
    def _handle_status_change(self, task_id: str, old_status: TaskStatus, new_status: TaskStatus):
        """处理状态变化"""
        logging.info(f"📊 任务状态变化: {task_id} {old_status.value} → {new_status.value}")
    
    def _trigger_callbacks(self, task_id: str, task: ProgressInfo):
        """触发回调函数"""
        if task_id in self._callbacks:
            for callback in self._callbacks[task_id]:
                try:
                    callback(task)
                except Exception as e:
                    logging.error(f"❌ 回调函数执行失败: {str(e)}")
    
    def cleanup_completed_tasks(self):
        """清理已完成的任务"""
        completed_tasks = [
            task_id for task_id, task in self._tasks.items()
            if task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED]
            and time.time() - task.completed_at > self._cleanup_interval
        ]
        
        # 保留最近的任务
        if len(completed_tasks) > self._max_completed_tasks:
            tasks_to_remove = completed_tasks[:-self._max_completed_tasks]
            for task_id in tasks_to_remove:
                del self._tasks[task_id]
                if task_id in self._callbacks:
                    del self._callbacks[task_id]
            
            logging.info(f"🧹 清理了 {len(tasks_to_remove)} 个已完成任务")
    
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        return {
            **self._stats,
            'current_active_tasks': len(self.get_active_tasks()),
            'total_stored_tasks': len(self._tasks)
        }


# 全局进度管理器实例
progress_manager = ProgressManager()