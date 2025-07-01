"""
任务管理服务

处理异步任务的创建、执行、监控等功能
"""

import uuid
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, AsyncGenerator

from .base import BaseService
from core.models import TaskStatus, TaskType
from core.exceptions import task_not_found, TaskException, ErrorCodes


class TaskService(BaseService):
    """任务管理服务"""
    
    def __init__(self):
        super().__init__()
        self._tasks_db = {}  # 临时内存存储
        self._task_workers = {}  # 任务执行器
        self._max_concurrent_tasks = self.settings.max_concurrent_tasks
        self._running_tasks = 0
    
    async def create_task(
        self,
        task_type: TaskType,
        file_id: Optional[str] = None,
        parameters: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        创建任务
        
        Args:
            task_type: 任务类型
            file_id: 关联文件ID
            parameters: 任务参数
            
        Returns:
            str: 任务ID
        """
        return await self.async_safe_execute(
            "创建任务",
            self._create_task_impl,
            task_type, file_id, parameters
        )
    
    async def _create_task_impl(
        self, 
        task_type: TaskType, 
        file_id: str,
        parameters: Dict[str, Any]
    ) -> str:
        """任务创建实现"""
        task_id = str(uuid.uuid4())
        
        # 创建任务信息
        task_data = {
            "task_id": task_id,
            "task_type": task_type.value if hasattr(task_type, 'value') else task_type,
            "status": TaskStatus.CREATED.value,
            "progress": 0.0,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "file_id": file_id,
            "current_step": "任务已创建",
            "total_steps": 1,
            "current_step_index": 0,
            "metadata": parameters or {}
        }
        
        # 保存任务
        self._tasks_db[task_id] = task_data
        
        # 如果有空闲资源，立即开始执行
        if self._running_tasks < self._max_concurrent_tasks:
            await self._start_task_execution(task_id)
        else:
            # 否则加入队列
            await self._queue_task(task_id)
        
        self.log_info(f"任务创建成功: {task_type}", task_id=task_id)
        return task_id
    
    async def _start_task_execution(self, task_id: str):
        """开始执行任务"""
        await self._update_task_status(task_id, TaskStatus.PROCESSING)
        self._running_tasks += 1
        
        # 创建异步任务执行器
        task = asyncio.create_task(self._execute_task(task_id))
        self._task_workers[task_id] = task
    
    async def _queue_task(self, task_id: str):
        """将任务加入队列"""
        await self._update_task_status(task_id, TaskStatus.QUEUED)
        self.log_info(f"任务加入队列: {task_id}")
    
    async def _execute_task(self, task_id: str):
        """执行任务"""
        try:
            task_data = self._tasks_db.get(task_id)
            if not task_data:
                return
            
            task_type = task_data["task_type"]

            # 根据任务类型执行不同的处理逻辑
            if task_type == TaskType.TRANSCRIPTION.value:
                await self._execute_transcription_task(task_id)
            elif task_type == TaskType.AI_PROCESSING.value:
                await self._execute_ai_task(task_id)
            elif task_type == TaskType.DOWNLOAD.value:
                await self._execute_download_task(task_id)
            elif task_type == TaskType.EXPORT.value:
                await self._execute_export_task(task_id)
            else:
                raise TaskException(f"不支持的任务类型: {task_type}", ErrorCodes.TASK_FAILED)
            
            # 任务完成
            await self._complete_task(task_id)
            
        except Exception as e:
            await self._fail_task(task_id, str(e))
        finally:
            self._running_tasks -= 1
            if task_id in self._task_workers:
                del self._task_workers[task_id]
            
            # 检查是否有排队的任务可以执行
            await self._process_queued_tasks()
    
    async def _execute_transcription_task(self, task_id: str):
        """执行转录任务"""
        await self._update_task_progress(task_id, 10, "开始转录处理")

        # 获取任务信息
        task_data = self._tasks_db.get(task_id)
        if not task_data:
            return

        file_id = task_data.get("file_id")
        if not file_id:
            raise TaskException("转录任务缺少文件ID", ErrorCodes.TASK_FAILED)

        try:
            # 获取文件路径
            from services import file_service
            file_path = await file_service.get_file_path(file_id)
            if not file_path:
                raise TaskException("文件不存在或无法访问", ErrorCodes.FILE_NOT_FOUND)

            await self._update_task_progress(task_id, 20, "文件验证完成")

            # 创建转录任务
            from services import transcription_service
            language = task_data.get("metadata", {}).get("language", "auto")
            transcription_id = await transcription_service.create_transcription_task(
                file_id=file_id,
                file_path=file_path,
                language=language
            )

            # 设置转录任务的关联
            await transcription_service.set_task_id(transcription_id, task_id)

            await self._update_task_progress(task_id, 30, "转录任务已创建")

            # 等待转录完成（模拟）
            for i in range(1, 8):
                # 检查任务是否被取消
                current_task = self._tasks_db.get(task_id)
                if current_task and current_task["status"] == TaskStatus.CANCELLED.value:
                    self.log_info(f"转录任务被取消: {task_id}")
                    return

                await asyncio.sleep(2)  # 增加处理时间以便测试取消功能
                progress = 30 + i * 8  # 30% 到 86%
                await self._update_task_progress(task_id, progress, f"转录进行中 {i}/7")

            # 保存转录ID到任务元数据
            self._tasks_db[task_id]["metadata"]["transcription_id"] = transcription_id
            await self._update_task_progress(task_id, 100, "转录完成")

        except Exception as e:
            self.log_error(f"转录任务执行失败: {task_id}", exception=e)
            raise
    
    async def _execute_ai_task(self, task_id: str):
        """执行AI处理任务"""
        await self._update_task_progress(task_id, 20, "AI模型加载中")
        await asyncio.sleep(2)
        
        await self._update_task_progress(task_id, 50, "AI分析中")
        await asyncio.sleep(3)
        
        await self._update_task_progress(task_id, 80, "生成结果中")
        await asyncio.sleep(2)
        
        await self._update_task_progress(task_id, 100, "AI处理完成")
    
    async def _execute_download_task(self, task_id: str):
        """执行下载任务"""
        await self._update_task_progress(task_id, 10, "开始下载")
        
        # 模拟下载进度
        for i in range(1, 10):
            await asyncio.sleep(0.5)
            progress = 10 + i * 9
            await self._update_task_progress(task_id, progress, f"下载中 {progress}%")
        
        await self._update_task_progress(task_id, 100, "下载完成")
    
    async def _execute_export_task(self, task_id: str):
        """执行导出任务"""
        await self._update_task_progress(task_id, 25, "准备导出数据")
        await asyncio.sleep(1)
        
        await self._update_task_progress(task_id, 50, "格式化数据")
        await asyncio.sleep(2)
        
        await self._update_task_progress(task_id, 75, "生成文件")
        await asyncio.sleep(1)
        
        await self._update_task_progress(task_id, 100, "导出完成")
    
    async def _update_task_status(self, task_id: str, status: TaskStatus):
        """更新任务状态"""
        if task_id in self._tasks_db:
            self._tasks_db[task_id]["status"] = status.value if hasattr(status, 'value') else status
            self._tasks_db[task_id]["updated_at"] = datetime.now().isoformat()
    
    async def _update_task_progress(self, task_id: str, progress: float, current_step: str):
        """更新任务进度"""
        if task_id in self._tasks_db:
            self._tasks_db[task_id]["progress"] = progress
            self._tasks_db[task_id]["current_step"] = current_step
            self._tasks_db[task_id]["updated_at"] = datetime.now().isoformat()
    
    async def _complete_task(self, task_id: str):
        """完成任务"""
        if task_id in self._tasks_db:
            self._tasks_db[task_id]["status"] = TaskStatus.COMPLETED.value
            self._tasks_db[task_id]["completed_at"] = datetime.now().isoformat()
            self._tasks_db[task_id]["updated_at"] = datetime.now().isoformat()
            self.log_info(f"任务完成: {task_id}")

    async def _fail_task(self, task_id: str, error_message: str):
        """任务失败"""
        if task_id in self._tasks_db:
            self._tasks_db[task_id]["status"] = TaskStatus.FAILED.value
            self._tasks_db[task_id]["error_message"] = error_message
            self._tasks_db[task_id]["updated_at"] = datetime.now().isoformat()
            self.log_error(f"任务失败: {task_id}", error_message=error_message)
    
    async def _process_queued_tasks(self):
        """处理排队的任务"""
        if self._running_tasks >= self._max_concurrent_tasks:
            return
        
        # 找到最早的排队任务
        queued_tasks = [
            (task_id, task_data) for task_id, task_data in self._tasks_db.items()
            if task_data["status"] == TaskStatus.QUEUED
        ]
        
        if queued_tasks:
            # 按创建时间排序
            queued_tasks.sort(key=lambda x: x[1]["created_at"])
            task_id = queued_tasks[0][0]
            await self._start_task_execution(task_id)
    
    async def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """获取任务状态"""
        task_data = self._tasks_db.get(task_id)
        if not task_data:
            raise task_not_found(task_id)
        return task_data
    
    async def cancel_task(self, task_id: str) -> bool:
        """取消任务"""
        task_data = self._tasks_db.get(task_id)
        if not task_data:
            return False
        
        status = task_data["status"]
        
        # 只能取消未完成的任务
        if status in [TaskStatus.COMPLETED.value, TaskStatus.FAILED.value, TaskStatus.CANCELLED.value]:
            return False
        
        # 如果任务正在执行，取消执行器
        if task_id in self._task_workers:
            self._task_workers[task_id].cancel()
            del self._task_workers[task_id]
            self._running_tasks -= 1
        
        # 更新任务状态
        self._tasks_db[task_id]["status"] = TaskStatus.CANCELLED.value
        self._tasks_db[task_id]["updated_at"] = datetime.now().isoformat()
        
        self.log_info(f"任务已取消: {task_id}")
        
        # 处理排队的任务
        await self._process_queued_tasks()
        
        return True
    
    async def get_task_result(self, task_id: str) -> Optional[Dict[str, Any]]:
        """获取任务结果"""
        task_data = await self.get_task_status(task_id)
        
        if task_data["status"] != TaskStatus.COMPLETED.value:
            return None
        
        # 这里应该返回具体的任务结果
        # 目前返回任务信息作为结果
        return task_data
    
    async def get_active_tasks(self) -> List[Dict[str, Any]]:
        """获取活跃任务列表"""
        active_statuses = [TaskStatus.CREATED.value, TaskStatus.QUEUED.value, TaskStatus.PROCESSING.value]
        return [
            task_data for task_data in self._tasks_db.values()
            if task_data["status"] in active_statuses
        ]
    
    async def get_task_list(
        self, 
        page: int = 1, 
        page_size: int = 20,
        status: Optional[TaskStatus] = None,
        task_type: Optional[TaskType] = None
    ) -> tuple[List[Dict[str, Any]], int]:
        """获取任务列表"""
        all_tasks = list(self._tasks_db.values())
        
        # 应用筛选
        if status:
            status_value = status.value if hasattr(status, 'value') else status
            all_tasks = [t for t in all_tasks if t["status"] == status_value]
        if task_type:
            task_type_value = task_type.value if hasattr(task_type, 'value') else task_type
            all_tasks = [t for t in all_tasks if t["task_type"] == task_type_value]
        
        # 按创建时间倒序排序
        all_tasks.sort(key=lambda x: x["created_at"], reverse=True)
        
        # 分页
        total = len(all_tasks)
        start = (page - 1) * page_size
        end = start + page_size
        page_tasks = all_tasks[start:end]
        
        return page_tasks, total
    
    async def cleanup_completed_tasks(self, days: int = 7) -> int:
        """清理已完成的任务"""
        cutoff_time = datetime.now() - timedelta(days=days)
        
        to_delete = []
        for task_id, task_data in self._tasks_db.items():
            if (task_data["status"] in [TaskStatus.COMPLETED.value, TaskStatus.FAILED.value, TaskStatus.CANCELLED.value] and
                datetime.fromisoformat(task_data["updated_at"]) < cutoff_time):
                to_delete.append(task_id)
        
        for task_id in to_delete:
            del self._tasks_db[task_id]
        
        self.log_info(f"清理了 {len(to_delete)} 个过期任务")
        return len(to_delete)
    
    async def get_task_stats(self) -> Dict[str, Any]:
        """获取任务统计信息"""
        all_tasks = list(self._tasks_db.values())
        
        stats = {
            "total_tasks": len(all_tasks),
            "running_tasks": self._running_tasks,
            "max_concurrent": self._max_concurrent_tasks,
            "by_status": {},
            "by_type": {}
        }
        
        # 按状态统计
        for task_data in all_tasks:
            status = task_data["status"]
            stats["by_status"][status] = stats["by_status"].get(status, 0) + 1
        
        # 按类型统计
        for task_data in all_tasks:
            task_type = task_data["task_type"]
            stats["by_type"][task_type] = stats["by_type"].get(task_type, 0) + 1
        
        return stats
    
    async def stream_task_progress(self, task_id: str) -> AsyncGenerator[str, None]:
        """流式获取任务进度"""
        if task_id not in self._tasks_db:
            raise task_not_found(task_id)
        
        last_update = None
        
        while True:
            task_data = self._tasks_db.get(task_id)
            if not task_data:
                break
            
            current_update = task_data["updated_at"]
            
            # 如果有更新，发送数据
            if current_update != last_update:
                yield f"data: {task_data}\n\n"
                last_update = current_update
            
            # 如果任务已完成，结束流
            if task_data["status"] in [TaskStatus.COMPLETED.value, TaskStatus.FAILED.value, TaskStatus.CANCELLED.value]:
                break
            
            await asyncio.sleep(1)  # 每秒检查一次
