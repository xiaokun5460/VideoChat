"""
任务队列管理器

提供智能任务队列和并发控制功能，优化系统资源利用
"""

import asyncio
import time
import uuid
import logging
from typing import Dict, List, Optional, Callable, Any
from enum import Enum
from dataclasses import dataclass
from config import AI_CONFIG, STT_CONFIG, DOWNLOAD_CONFIG


class TaskPriority(Enum):
    """任务优先级"""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    URGENT = 4


class TaskStatus(Enum):
    """任务状态"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class QueueTask:
    """队列任务"""
    task_id: str
    func: Callable
    args: tuple
    kwargs: dict
    priority: TaskPriority
    created_at: float
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    status: TaskStatus = TaskStatus.PENDING
    result: Any = None
    error: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3


class TaskQueue:
    """智能任务队列"""
    
    def __init__(self, max_workers: int = 3, max_queue_size: int = 100):
        self.max_workers = max_workers
        self.max_queue_size = max_queue_size
        self._tasks: Dict[str, QueueTask] = {}
        self._pending_queue: List[str] = []  # 按优先级排序的任务ID列表
        self._running_tasks: Dict[str, asyncio.Task] = {}
        self._workers: List[asyncio.Task] = []
        self._shutdown = False
        self._stats = {
            "total_tasks": 0,
            "completed_tasks": 0,
            "failed_tasks": 0,
            "cancelled_tasks": 0,
            "total_processing_time": 0.0
        }
    
    async def start(self):
        """启动任务队列"""
        if self._workers:
            return  # 已经启动
        
        logging.info(f"🚀 启动任务队列，工作线程数: {self.max_workers}")
        
        # 创建工作线程
        for i in range(self.max_workers):
            worker = asyncio.create_task(self._worker(f"worker-{i}"))
            self._workers.append(worker)
    
    async def stop(self):
        """停止任务队列"""
        logging.info("🛑 停止任务队列...")
        self._shutdown = True
        
        # 取消所有运行中的任务
        for task_id, task in self._running_tasks.items():
            if not task.done():
                task.cancel()
                if task_id in self._tasks:
                    self._tasks[task_id].status = TaskStatus.CANCELLED
        
        # 等待工作线程结束
        if self._workers:
            await asyncio.gather(*self._workers, return_exceptions=True)
            self._workers.clear()
        
        logging.info("✅ 任务队列已停止")
    
    async def submit_task(
        self,
        func: Callable,
        *args,
        priority: TaskPriority = TaskPriority.NORMAL,
        max_retries: int = 3,
        **kwargs
    ) -> str:
        """提交任务到队列"""
        if len(self._tasks) >= self.max_queue_size:
            raise RuntimeError(f"任务队列已满 (最大: {self.max_queue_size})")
        
        task_id = str(uuid.uuid4())
        task = QueueTask(
            task_id=task_id,
            func=func,
            args=args,
            kwargs=kwargs,
            priority=priority,
            created_at=time.time(),
            max_retries=max_retries
        )
        
        self._tasks[task_id] = task
        self._insert_by_priority(task_id)
        self._stats["total_tasks"] += 1
        
        logging.info(f"📝 任务已提交: {task_id} (优先级: {priority.name})")
        return task_id
    
    def _insert_by_priority(self, task_id: str):
        """按优先级插入任务"""
        task = self._tasks[task_id]
        
        # 找到合适的插入位置
        insert_pos = 0
        for i, existing_id in enumerate(self._pending_queue):
            existing_task = self._tasks[existing_id]
            if task.priority.value > existing_task.priority.value:
                insert_pos = i
                break
            elif task.priority.value == existing_task.priority.value:
                # 相同优先级，按创建时间排序
                if task.created_at < existing_task.created_at:
                    insert_pos = i
                    break
            insert_pos = i + 1
        
        self._pending_queue.insert(insert_pos, task_id)
    
    async def _worker(self, worker_name: str):
        """工作线程"""
        logging.info(f"👷 工作线程 {worker_name} 已启动")
        
        while not self._shutdown:
            try:
                # 获取下一个任务
                if not self._pending_queue:
                    await asyncio.sleep(0.1)
                    continue
                
                task_id = self._pending_queue.pop(0)
                task = self._tasks.get(task_id)
                
                if not task or task.status != TaskStatus.PENDING:
                    continue
                
                # 执行任务
                await self._execute_task(task, worker_name)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logging.error(f"❌ 工作线程 {worker_name} 错误: {e}")
                await asyncio.sleep(1)
        
        logging.info(f"👷 工作线程 {worker_name} 已停止")
    
    async def _execute_task(self, task: QueueTask, worker_name: str):
        """执行单个任务"""
        task.status = TaskStatus.RUNNING
        task.started_at = time.time()
        
        logging.info(f"⚡ {worker_name} 开始执行任务: {task.task_id}")
        
        try:
            # 创建任务协程
            if asyncio.iscoroutinefunction(task.func):
                coro = task.func(*task.args, **task.kwargs)
            else:
                # 同步函数包装为协程
                coro = asyncio.to_thread(task.func, *task.args, **task.kwargs)
            
            # 执行任务
            task_future = asyncio.create_task(coro)
            self._running_tasks[task.task_id] = task_future
            
            task.result = await task_future
            task.status = TaskStatus.COMPLETED
            task.completed_at = time.time()
            
            processing_time = task.completed_at - task.started_at
            self._stats["completed_tasks"] += 1
            self._stats["total_processing_time"] += processing_time
            
            logging.info(f"✅ 任务完成: {task.task_id} (耗时: {processing_time:.2f}s)")
            
        except asyncio.CancelledError:
            task.status = TaskStatus.CANCELLED
            self._stats["cancelled_tasks"] += 1
            logging.info(f"🚫 任务被取消: {task.task_id}")
            
        except Exception as e:
            task.error = str(e)
            task.retry_count += 1
            
            if task.retry_count <= task.max_retries:
                # 重试任务
                task.status = TaskStatus.PENDING
                task.started_at = None
                self._insert_by_priority(task.task_id)
                logging.info(f"🔄 任务重试 ({task.retry_count}/{task.max_retries}): {task.task_id}")
            else:
                # 任务失败
                task.status = TaskStatus.FAILED
                task.completed_at = time.time()
                self._stats["failed_tasks"] += 1
                logging.error(f"❌ 任务失败: {task.task_id} - {e}")
        
        finally:
            # 清理运行中的任务记录
            if task.task_id in self._running_tasks:
                del self._running_tasks[task.task_id]
    
    def get_task_status(self, task_id: str) -> Optional[Dict]:
        """获取任务状态"""
        task = self._tasks.get(task_id)
        if not task:
            return None
        
        return {
            "task_id": task.task_id,
            "status": task.status.value,
            "priority": task.priority.name,
            "created_at": task.created_at,
            "started_at": task.started_at,
            "completed_at": task.completed_at,
            "retry_count": task.retry_count,
            "error": task.error
        }
    
    def get_queue_stats(self) -> Dict:
        """获取队列统计信息"""
        avg_processing_time = (
            self._stats["total_processing_time"] / self._stats["completed_tasks"]
            if self._stats["completed_tasks"] > 0 else 0
        )
        
        return {
            "total_tasks": self._stats["total_tasks"],
            "pending_tasks": len(self._pending_queue),
            "running_tasks": len(self._running_tasks),
            "completed_tasks": self._stats["completed_tasks"],
            "failed_tasks": self._stats["failed_tasks"],
            "cancelled_tasks": self._stats["cancelled_tasks"],
            "avg_processing_time": avg_processing_time,
            "queue_utilization": len(self._running_tasks) / self.max_workers * 100
        }
    
    async def cancel_task(self, task_id: str) -> bool:
        """取消任务"""
        task = self._tasks.get(task_id)
        if not task:
            return False
        
        if task.status == TaskStatus.PENDING:
            # 从队列中移除
            if task_id in self._pending_queue:
                self._pending_queue.remove(task_id)
            task.status = TaskStatus.CANCELLED
            self._stats["cancelled_tasks"] += 1
            return True
        
        elif task.status == TaskStatus.RUNNING:
            # 取消运行中的任务
            if task_id in self._running_tasks:
                self._running_tasks[task_id].cancel()
            return True
        
        return False


# 全局任务队列实例
from config import STT_CONFIG

task_queue = TaskQueue(
    max_workers=STT_CONFIG.get("beam_size", 3),  # 使用配置的并发数
    max_queue_size=100
)
