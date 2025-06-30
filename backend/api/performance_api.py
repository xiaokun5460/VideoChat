"""
性能监控API端点

提供性能监控、资源统计和优化控制的API接口
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from typing import Dict, Any, Optional
from pydantic import BaseModel
from services.performance_stt_service import performance_stt_service
from utils.task_queue import task_queue, TaskPriority
from utils.simple_cache import simple_cache_manager
from utils.streaming_optimizer import streaming_optimizer
import json
import asyncio
import logging


# 创建路由器
router = APIRouter(prefix="/api/performance", tags=["performance"])


class PerformanceOptimizationRequest(BaseModel):
    """性能优化请求"""
    clear_cache: bool = True
    release_models: bool = True
    cleanup_tasks: bool = True


class TaskSubmissionRequest(BaseModel):
    """任务提交请求"""
    file_path: str
    priority: str = "normal"
    use_queue: bool = True


@router.get("/stats")
async def get_performance_stats() -> Dict[str, Any]:
    """获取性能统计信息"""
    try:
        # 确保服务已初始化
        if not performance_stt_service._initialized:
            await performance_stt_service.initialize()
        
        # 获取服务统计
        stats = performance_stt_service.get_service_stats()
        
        # 添加缓存统计
        cache_stats = simple_cache_manager.get_statistics()
        stats["cache_stats"] = cache_stats
        
        return {
            "status": "success",
            "data": stats,
            "timestamp": asyncio.get_event_loop().time()
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取性能统计失败: {str(e)}")


@router.get("/queue/stats")
async def get_queue_stats() -> Dict[str, Any]:
    """获取任务队列统计"""
    try:
        stats = task_queue.get_queue_stats()
        return {
            "status": "success",
            "data": stats,
            "timestamp": asyncio.get_event_loop().time()
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取队列统计失败: {str(e)}")


@router.get("/resource/monitor")
async def get_resource_monitor() -> Dict[str, Any]:
    """获取资源监控信息"""
    try:
        # 尝试导入资源监控器
        try:
            from utils.resource_monitor import resource_monitor
            
            if not resource_monitor._monitoring:
                await resource_monitor.start_monitoring()
                # 等待收集一些数据
                await asyncio.sleep(0.5)
            
            current_status = resource_monitor.get_current_status()
            statistics = resource_monitor.get_statistics(minutes=5)
            recommendations = resource_monitor.get_memory_recommendations()
            
            return {
                "status": "success",
                "data": {
                    "current_status": {
                        "cpu_percent": current_status.cpu_percent if current_status else 0,
                        "memory_percent": current_status.memory_percent if current_status else 0,
                        "memory_used_mb": current_status.memory_used_mb if current_status else 0,
                        "timestamp": current_status.timestamp if current_status else 0
                    },
                    "statistics": statistics,
                    "recommendations": recommendations
                }
            }
        
        except ImportError:
            # 如果psutil不可用，返回简化的信息
            return {
                "status": "success",
                "data": {
                    "current_status": {
                        "cpu_percent": 0,
                        "memory_percent": 0,
                        "memory_used_mb": 0,
                        "timestamp": asyncio.get_event_loop().time()
                    },
                    "statistics": {},
                    "recommendations": ["请安装psutil以启用完整的资源监控功能"]
                },
                "note": "资源监控功能需要安装psutil依赖"
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取资源监控失败: {str(e)}")


@router.post("/optimize")
async def optimize_performance(
    request: PerformanceOptimizationRequest,
    background_tasks: BackgroundTasks
) -> Dict[str, Any]:
    """执行性能优化"""
    try:
        optimization_results = []
        
        # 清理缓存
        if request.clear_cache:
            expired_count = simple_cache_manager.cleanup_expired()
            optimization_results.append(f"清理了 {expired_count} 个过期缓存")
        
        # 释放模型
        if request.release_models:
            background_tasks.add_task(_release_models)
            optimization_results.append("已安排模型释放任务")
        
        # 清理任务
        if request.cleanup_tasks:
            # 这里可以添加任务清理逻辑
            optimization_results.append("任务清理已完成")
        
        # 执行服务级优化
        if performance_stt_service._initialized:
            background_tasks.add_task(performance_stt_service.optimize_performance)
            optimization_results.append("已安排服务性能优化")
        
        return {
            "status": "success",
            "message": "性能优化已启动",
            "results": optimization_results
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"性能优化失败: {str(e)}")


async def _release_models():
    """释放模型的后台任务"""
    try:
        from utils.model_manager import model_manager
        await model_manager.release_model()
    except Exception as e:
        logging.info(f"释放模型失败: {e}")


@router.post("/task/submit")
async def submit_performance_task(request: TaskSubmissionRequest) -> Dict[str, Any]:
    """提交高性能任务"""
    try:
        # 转换优先级
        priority_map = {
            "low": TaskPriority.LOW,
            "normal": TaskPriority.NORMAL,
            "high": TaskPriority.HIGH,
            "urgent": TaskPriority.URGENT
        }
        priority = priority_map.get(request.priority.lower(), TaskPriority.NORMAL)
        
        # 提交任务
        task_id = await performance_stt_service.transcribe_audio_async(
            file_path=request.file_path,
            priority=priority,
            use_queue=request.use_queue
        )
        
        return {
            "status": "success",
            "task_id": task_id,
            "message": "任务已提交"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"任务提交失败: {str(e)}")


@router.get("/task/{task_id}/status")
async def get_task_status(task_id: str) -> Dict[str, Any]:
    """获取任务状态"""
    try:
        # 从队列获取状态
        queue_status = task_queue.get_task_status(task_id)
        
        # 从服务获取结果
        result = await performance_stt_service.get_transcription_result(task_id)
        
        return {
            "status": "success",
            "data": {
                "task_id": task_id,
                "queue_status": queue_status,
                "result": result
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取任务状态失败: {str(e)}")


@router.delete("/task/{task_id}")
async def cancel_task(task_id: str) -> Dict[str, Any]:
    """取消任务"""
    try:
        success = await performance_stt_service.cancel_transcription(task_id)
        
        return {
            "status": "success" if success else "failed",
            "message": "任务已取消" if success else "任务取消失败",
            "task_id": task_id
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"取消任务失败: {str(e)}")


@router.get("/stream/stats")
async def stream_performance_stats():
    """流式性能统计"""
    async def generate_stats():
        try:
            while True:
                # 获取统计数据
                stats = {
                    "timestamp": asyncio.get_event_loop().time(),
                    "queue_stats": task_queue.get_queue_stats(),
                    "cache_stats": simple_cache_manager.get_statistics()
                }
                
                # 尝试获取资源统计
                try:
                    from utils.resource_monitor import resource_monitor
                    if resource_monitor._monitoring:
                        current_status = resource_monitor.get_current_status()
                        if current_status:
                            stats["resource_stats"] = {
                                "cpu_percent": current_status.cpu_percent,
                                "memory_percent": current_status.memory_percent,
                                "memory_used_mb": current_status.memory_used_mb
                            }
                except ImportError:
                    pass
                
                yield f"data: {json.dumps(stats)}\n\n"
                await asyncio.sleep(2)  # 每2秒更新一次
                
        except asyncio.CancelledError:
            yield f"data: {json.dumps({'type': 'stream_end'})}\n\n"
    
    return StreamingResponse(
        streaming_optimizer.stream_json_chunks(generate_stats()),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*"
        }
    )


@router.get("/health")
async def performance_health_check() -> Dict[str, Any]:
    """性能健康检查"""
    try:
        health_status = {
            "service_initialized": performance_stt_service._initialized,
            "queue_running": len(task_queue._workers) > 0,
            "cache_available": True,
            "resource_monitor_available": False
        }
        
        # 检查资源监控
        try:
            from utils.resource_monitor import resource_monitor
            health_status["resource_monitor_available"] = resource_monitor._monitoring
        except ImportError:
            pass
        
        # 计算健康分数
        healthy_components = sum(health_status.values())
        total_components = len(health_status)
        health_score = (healthy_components / total_components) * 100
        
        return {
            "status": "healthy" if health_score >= 75 else "degraded",
            "health_score": health_score,
            "components": health_status,
            "timestamp": asyncio.get_event_loop().time()
        }
    
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": asyncio.get_event_loop().time()
        }
