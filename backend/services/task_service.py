"""
任务管理服务

处理异步任务的创建、执行、监控等功能
"""

import os
import uuid
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, AsyncGenerator

from .base import BaseService
from core.models import TaskStatus, TaskType, TaskInfo
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
    ) -> TaskInfo:
        """
        创建任务
        
        Args:
            task_type: 任务类型
            file_id: 关联文件ID
            parameters: 任务参数
            
        Returns:
            str: 任务ID
        """
        task_id = await self.async_safe_execute(
            "创建任务",
            self._create_task_impl,
            task_type, file_id, parameters
        )
        
        # 返回TaskInfo模型
        task_data = self._tasks_db.get(task_id)
        return TaskInfo(**task_data)
    
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
        from services import ai_service
        
        task_data = self._tasks_db.get(task_id)
        if not task_data:
            raise task_not_found(task_id)
        
        try:
            # 获取任务参数
            ai_type = task_data["metadata"].get("ai_type", "summary")
            text_content = task_data["metadata"].get("text", "")
            parameters = task_data["metadata"].get("parameters", {})
            
            await self._update_task_progress(task_id, 20, "AI模型加载中")
            
            # 根据AI类型执行不同的处理
            result = None
            if ai_type == "summary":
                await self._update_task_progress(task_id, 40, "生成总结中")
                max_length = parameters.get("max_length", 200)
                
                # 调用AI服务生成总结
                summary_content = ""
                async for chunk in ai_service.generate_summary(text_content, stream=False, max_length=max_length):
                    summary_content += chunk
                
                result = {
                    "type": "summary",
                    "content": summary_content,
                    "parameters": {"max_length": max_length}
                }
                
            elif ai_type == "detailed_summary":
                await self._update_task_progress(task_id, 40, "生成详细总结中")
                
                # 调用AI服务生成详细总结
                summary_content = ""
                async for chunk in ai_service.generate_detailed_summary(text_content, stream=False):
                    summary_content += chunk
                
                result = {
                    "type": "detailed_summary",
                    "content": summary_content
                }
                
            elif ai_type == "mindmap":
                await self._update_task_progress(task_id, 40, "生成思维导图中")
                
                # 调用AI服务生成思维导图
                mindmap_content = ""
                async for chunk in ai_service.generate_mindmap(text_content, stream=False):
                    mindmap_content += chunk
                
                result = {
                    "type": "mindmap",
                    "content": mindmap_content
                }
                
            elif ai_type == "teaching_evaluation":
                await self._update_task_progress(task_id, 40, "生成教学评估中")
                
                # 调用AI服务生成教学评估
                evaluation_content = ""
                async for chunk in ai_service.generate_teaching_evaluation(text_content, stream=False):
                    evaluation_content += chunk
                
                result = {
                    "type": "teaching_evaluation",
                    "content": evaluation_content
                }
            
            await self._update_task_progress(task_id, 80, "保存结果中")
            
            # 保存AI结果
            if result:
                result_id = await ai_service.save_ai_result(
                    ai_type, result["content"], parameters
                )
                result["result_id"] = result_id
            
            # 更新任务结果
            task_data["result"] = result
            task_data["metadata"]["result_id"] = result.get("result_id") if result else None
            
            await self._update_task_progress(task_id, 100, "AI处理完成")
            
        except Exception as e:
            self.log_error(f"AI任务执行失败: {task_id}", exception=e)
            raise
    
    async def _execute_download_task(self, task_id: str):
        """执行下载任务"""
        import aiohttp
        import aiofiles
        from services import file_service
        
        task_data = self._tasks_db.get(task_id)
        if not task_data:
            raise task_not_found(task_id)
        
        try:
            # 获取下载参数
            url = task_data["metadata"].get("url")
            filename = task_data["metadata"].get("filename")
            
            if not url:
                raise ValueError("下载URL不能为空")
            
            await self._update_task_progress(task_id, 10, "开始下载")
            
            # 执行实际下载
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status != 200:
                        raise ValueError(f"下载失败，HTTP状态码: {response.status}")
                    
                    total_size = int(response.headers.get('content-length', 0))
                    downloaded = 0
                    
                    # 生成文件路径
                    if not filename:
                        filename = url.split('/')[-1] or "downloaded_file"
                    
                    file_path = os.path.join(self.settings.upload_dir, filename)
                    
                    # 下载文件
                    async with aiofiles.open(file_path, 'wb') as file:
                        async for chunk in response.content.iter_chunked(8192):
                            await file.write(chunk)
                            downloaded += len(chunk)
                            
                            if total_size > 0:
                                progress = 10 + int((downloaded / total_size) * 80)
                                await self._update_task_progress(task_id, progress, f"下载中 {progress}%")
            
            await self._update_task_progress(task_id, 90, "创建文件记录")
            
            # 创建文件记录
            file_info = await file_service.upload_file_from_path(
                file_path=file_path,
                filename=filename,
                description=f"从 {url} 下载"
            )
            
            # 更新任务结果
            task_data["result"] = {
                "type": "download",
                "file_id": file_info.id,
                "file_path": file_path,
                "filename": filename,
                "url": url,
                "size": os.path.getsize(file_path) if os.path.exists(file_path) else 0
            }
            
            await self._update_task_progress(task_id, 100, "下载完成")
            
        except Exception as e:
            self.log_error(f"下载任务执行失败: {task_id}", exception=e)
            raise
    
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
    
    async def get_task_status(self, task_id: str) -> TaskInfo:
        """获取任务状态"""
        task_data = self._tasks_db.get(task_id)
        if not task_data:
            raise task_not_found(task_id)
        return TaskInfo(**task_data)
    
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
    
    async def get_task_info(self, task_id: str) -> Optional[TaskInfo]:
        """获取任务信息"""
        try:
            return await self.get_task_status(task_id)
        except:
            return None
    
    async def get_task_progress(self, task_id: str) -> Optional[Dict[str, Any]]:
        """获取任务进度"""
        task_data = self._tasks_db.get(task_id)
        if not task_data:
            return None
        
        return {
            "task_id": task_id,
            "progress": task_data["progress"],
            "status": task_data["status"],
            "current_step": task_data["current_step"],
            "total_steps": task_data["total_steps"],
            "current_step_index": task_data["current_step_index"],
            "speed": task_data.get("speed"),
            "eta": task_data.get("eta"),
            "error_message": task_data.get("error_message")
        }
    
    async def get_task_progress_stream(self, task_id: str):
        """获取任务进度流"""
        while True:
            progress_data = await self.get_task_progress(task_id)
            if not progress_data:
                break
            
            yield progress_data
            
            # 如果任务完成或失败，停止流
            if progress_data["status"] in [TaskStatus.COMPLETED.value, TaskStatus.FAILED.value, TaskStatus.CANCELLED.value]:
                break
            
            await asyncio.sleep(1)  # 每秒更新一次
    
    async def get_task_stats(self) -> Dict[str, Any]:
        """获取任务统计信息"""
        all_tasks = list(self._tasks_db.values())
        
        stats = {
            "total": len(all_tasks),
            "by_status": {},
            "by_type": {},
            "performance": {
                "running_tasks": self._running_tasks,
                "max_concurrent": self._max_concurrent_tasks,
                "queue_length": len([t for t in all_tasks if t["status"] == TaskStatus.QUEUED.value])
            }
        }
        
        # 按状态统计
        for status in TaskStatus:
            count = len([t for t in all_tasks if t["status"] == status.value])
            stats["by_status"][status.value] = count
        
        # 按类型统计
        for task_type in TaskType:
            count = len([t for t in all_tasks if t["task_type"] == task_type.value])
            stats["by_type"][task_type.value] = count
        
        return stats
    
    async def cleanup_completed_tasks(self, older_than_days: int) -> int:
        """清理已完成的任务"""
        cutoff_time = datetime.now() - timedelta(days=older_than_days)
        cutoff_iso = cutoff_time.isoformat()
        
        cleaned_count = 0
        tasks_to_remove = []
        
        for task_id, task_data in self._tasks_db.items():
            if (task_data["status"] == TaskStatus.COMPLETED.value and 
                task_data.get("completed_at") and 
                task_data["completed_at"] < cutoff_iso):
                tasks_to_remove.append(task_id)
        
        for task_id in tasks_to_remove:
            del self._tasks_db[task_id]
            cleaned_count += 1
        
        self.log_info(f"清理了 {cleaned_count} 个已完成任务")
        return cleaned_count