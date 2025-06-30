"""
高性能转录服务

集成任务队列、资源监控和智能缓存的转录服务
"""

import asyncio
import uuid
import time
import os
import logging
from typing import Optional, List, Dict, Any
from utils.model_manager import model_manager
from utils.simple_cache import simple_cache_manager, cache_transcription_simple
from utils.task_queue import task_queue, TaskPriority
from utils.resource_monitor import resource_monitor
from middleware.error_handler import TranscriptionError
from config import AI_CONFIG, STT_CONFIG, DOWNLOAD_CONFIG


class PerformanceSTTService:
    """高性能转录服务"""
    
    def __init__(self):
        self._initialized = False
        self._stats = {
            "total_requests": 0,
            "cache_hits": 0,
            "queue_submissions": 0,
            "completed_tasks": 0,
            "failed_tasks": 0,
            "total_processing_time": 0.0
        }
    
    async def initialize(self):
        """初始化服务"""
        if self._initialized:
            return
        
        logging.info("🚀 初始化高性能转录服务...")
        
        # 启动任务队列
        await task_queue.start()
        
        # 启动资源监控
        await resource_monitor.start_monitoring()
        
        # 添加资源监控回调
        resource_monitor.add_callback(self._on_resource_update)
        
        self._initialized = True
        logging.info("✅ 高性能转录服务初始化完成")
    
    async def shutdown(self):
        """关闭服务"""
        if not self._initialized:
            return
        
        logging.info("🛑 关闭高性能转录服务...")
        
        # 停止任务队列
        await task_queue.stop()
        
        # 停止资源监控
        await resource_monitor.stop_monitoring()
        
        self._initialized = False
        logging.info("✅ 高性能转录服务已关闭")
    
    def _on_resource_update(self, snapshot):
        """资源监控回调"""
        # 根据资源使用情况动态调整
        if snapshot.memory_percent > 85:
            logging.info("⚠️ 内存使用率过高，建议释放模型")
            # 可以在这里实现自动模型释放逻辑
    
    async def transcribe_audio_async(
        self, 
        file_path: str, 
        priority: TaskPriority = TaskPriority.NORMAL,
        use_queue: bool = True
    ) -> str:
        """
        异步转录音频文件
        
        Args:
            file_path: 音频文件路径
            priority: 任务优先级
            use_queue: 是否使用任务队列
        
        Returns:
            任务ID
        """
        if not self._initialized:
            await self.initialize()
        
        self._stats["total_requests"] += 1
        
        # 检查缓存
        cache_key = self._generate_cache_key(file_path)
        cached_result = simple_cache_manager.get(cache_key)
        if cached_result:
            self._stats["cache_hits"] += 1
            logging.info(f"🔄 缓存命中: {file_path}")
            return cached_result.get("task_id", str(uuid.uuid4()))
        
        if use_queue:
            # 提交到任务队列
            task_id = await task_queue.submit_task(
                self._transcribe_worker,
                file_path,
                priority=priority
            )
            self._stats["queue_submissions"] += 1
            return task_id
        else:
            # 直接执行
            return await self._transcribe_worker(file_path)
    
    def _generate_cache_key(self, file_path: str) -> str:
        """生成缓存键"""
        try:
            file_stat = os.stat(file_path)
            return f"transcription:{file_path}:{file_stat.st_size}:{file_stat.st_mtime}"
        except Exception:
            return f"transcription:{file_path}:{time.time()}"
    
    async def _transcribe_worker(self, file_path: str) -> str:
        """转录工作函数"""
        task_id = str(uuid.uuid4())
        start_time = time.time()
        
        try:
            logging.info(f"🎯 开始转录: {task_id} - {os.path.basename(file_path)}")
            
            # 获取配置
            stt_config = STT_CONFIG
            
            # 检查资源状态
            resource_status = resource_monitor.get_current_status()
            if resource_status and resource_status.memory_percent > 90:
                raise TranscriptionError("系统内存不足，无法执行转录", file_path)
            
            # 获取模型
            model = await model_manager.get_model()
            
            # 执行转录
            segments_generator = model.transcribe(
                file_path,
                beam_size=stt_config.get("beam_size", 5),
                language=stt_config.get("language", "zh"),
                vad_filter=stt_config.get("vad_filter", True)
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
            
            # 缓存结果
            cache_key = self._generate_cache_key(file_path)
            result_data = {
                "task_id": task_id,
                "segments": transcription,
                "processing_time": processing_time,
                "file_path": file_path,
                "completed_at": time.time()
            }
            simple_cache_manager.set(cache_key, result_data, ttl_seconds=7200)
            
            # 更新统计
            self._stats["completed_tasks"] += 1
            self._stats["total_processing_time"] += processing_time
            
            logging.info(f"✅ 转录完成: {task_id} (耗时: {processing_time:.2f}s)")
            return task_id
            
        except Exception as e:
            self._stats["failed_tasks"] += 1
            error_msg = str(e)
            logging.error(f"❌ 转录失败: {task_id} - {error_msg}")
            raise TranscriptionError(f"转录失败: {error_msg}", file_path)
        
        finally:
            # 释放模型引用
            await model_manager.release_model()
    
    async def get_transcription_result(self, task_id: str) -> Optional[Dict]:
        """获取转录结果"""
        # 首先检查任务队列状态
        task_status = task_queue.get_task_status(task_id)
        if task_status:
            if task_status["status"] == "completed":
                # 从缓存中查找结果
                for key in simple_cache_manager._cache._cache.keys():
                    if key.startswith("transcription:"):
                        cached_data = simple_cache_manager.get(key)
                        if cached_data and cached_data.get("task_id") == task_id:
                            return cached_data
            return {"status": task_status["status"], "task_id": task_id}
        
        return None
    
    async def cancel_transcription(self, task_id: str) -> bool:
        """取消转录任务"""
        return await task_queue.cancel_task(task_id)
    
    def get_service_stats(self) -> Dict[str, Any]:
        """获取服务统计信息"""
        queue_stats = task_queue.get_queue_stats()
        resource_stats = resource_monitor.get_statistics(minutes=5)
        
        # 计算缓存命中率
        cache_hit_rate = (
            self._stats["cache_hits"] / self._stats["total_requests"] * 100
            if self._stats["total_requests"] > 0 else 0
        )
        
        # 计算平均处理时间
        avg_processing_time = (
            self._stats["total_processing_time"] / self._stats["completed_tasks"]
            if self._stats["completed_tasks"] > 0 else 0
        )
        
        return {
            "service_stats": {
                "total_requests": self._stats["total_requests"],
                "cache_hits": self._stats["cache_hits"],
                "cache_hit_rate": cache_hit_rate,
                "completed_tasks": self._stats["completed_tasks"],
                "failed_tasks": self._stats["failed_tasks"],
                "avg_processing_time": avg_processing_time
            },
            "queue_stats": queue_stats,
            "resource_stats": resource_stats,
            "recommendations": resource_monitor.get_memory_recommendations()
        }
    
    async def optimize_performance(self):
        """性能优化"""
        logging.info("🔧 执行性能优化...")
        
        # 清理过期缓存
        expired_count = simple_cache_manager.cleanup_expired()
        if expired_count > 0:
            logging.info(f"🧹 清理了 {expired_count} 个过期缓存")
        
        # 检查资源使用情况
        resource_status = resource_monitor.get_current_status()
        if resource_status:
            if resource_status.memory_percent > 80:
                logging.info("💾 内存使用率较高，建议释放模型")
                await model_manager.release_model()
            
            if (resource_status.gpu_memory_used_mb and 
                resource_status.gpu_memory_total_mb and
                resource_status.gpu_memory_used_mb / resource_status.gpu_memory_total_mb > 0.8):
                logging.info("🎮 GPU内存使用率较高")
        
        logging.info("✅ 性能优化完成")


# 全局高性能转录服务实例
performance_stt_service = PerformanceSTTService()


# 便捷函数
async def transcribe_audio_performance(
    file_path: str, 
    priority: TaskPriority = TaskPriority.NORMAL
) -> str:
    """高性能转录音频文件"""
    return await performance_stt_service.transcribe_audio_async(file_path, priority)


async def get_transcription_result_performance(task_id: str) -> Optional[Dict]:
    """获取转录结果"""
    return await performance_stt_service.get_transcription_result(task_id)
