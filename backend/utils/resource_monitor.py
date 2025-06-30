"""
资源监控器

监控系统资源使用情况，包括CPU、内存、GPU等
"""

import asyncio
import time
import psutil
import threading
import logging
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass
from collections import deque


@dataclass
class ResourceSnapshot:
    """资源快照"""
    timestamp: float
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    memory_available_mb: float
    disk_usage_percent: float
    gpu_memory_used_mb: Optional[float] = None
    gpu_memory_total_mb: Optional[float] = None
    gpu_utilization: Optional[float] = None


class ResourceMonitor:
    """资源监控器"""
    
    def __init__(self, history_size: int = 100, sample_interval: float = 1.0):
        self.history_size = history_size
        self.sample_interval = sample_interval
        self._history: deque = deque(maxlen=history_size)
        self._monitoring = False
        self._monitor_task: Optional[asyncio.Task] = None
        self._callbacks: List[Callable[[ResourceSnapshot], None]] = []
        self._thresholds = {
            "cpu_warning": 80.0,
            "cpu_critical": 95.0,
            "memory_warning": 80.0,
            "memory_critical": 95.0,
            "gpu_memory_warning": 80.0,
            "gpu_memory_critical": 95.0
        }
        self._alerts_enabled = True
        
        # GPU检测
        self._gpu_available = self._check_gpu_availability()
    
    def _check_gpu_availability(self) -> bool:
        """检查GPU是否可用"""
        try:
            import GPUtil
            gpus = GPUtil.getGPUs()
            return len(gpus) > 0
        except ImportError:
            return False
        except Exception:
            return False
    
    def _get_gpu_info(self) -> tuple:
        """获取GPU信息"""
        if not self._gpu_available:
            return None, None, None
        
        try:
            import GPUtil
            gpus = GPUtil.getGPUs()
            if gpus:
                gpu = gpus[0]  # 使用第一个GPU
                memory_used = gpu.memoryUsed
                memory_total = gpu.memoryTotal
                utilization = gpu.load * 100
                return memory_used, memory_total, utilization
        except Exception as e:
            logging.info(f"⚠️ 获取GPU信息失败: {e}")
        
        return None, None, None
    
    def _collect_snapshot(self) -> ResourceSnapshot:
        """收集资源快照"""
        # CPU和内存信息
        cpu_percent = psutil.cpu_percent(interval=None)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # GPU信息
        gpu_memory_used, gpu_memory_total, gpu_utilization = self._get_gpu_info()
        
        snapshot = ResourceSnapshot(
            timestamp=time.time(),
            cpu_percent=cpu_percent,
            memory_percent=memory.percent,
            memory_used_mb=memory.used / 1024 / 1024,
            memory_available_mb=memory.available / 1024 / 1024,
            disk_usage_percent=disk.percent,
            gpu_memory_used_mb=gpu_memory_used,
            gpu_memory_total_mb=gpu_memory_total,
            gpu_utilization=gpu_utilization
        )
        
        return snapshot
    
    async def start_monitoring(self):
        """开始监控"""
        if self._monitoring:
            return
        
        self._monitoring = True
        self._monitor_task = asyncio.create_task(self._monitor_loop())
        logging.info("📊 资源监控已启动")
    
    async def stop_monitoring(self):
        """停止监控"""
        if not self._monitoring:
            return
        
        self._monitoring = False
        if self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass
        
        logging.info("📊 资源监控已停止")
    
    async def _monitor_loop(self):
        """监控循环"""
        while self._monitoring:
            try:
                snapshot = self._collect_snapshot()
                self._history.append(snapshot)
                
                # 检查阈值告警
                if self._alerts_enabled:
                    self._check_thresholds(snapshot)
                
                # 调用回调函数
                for callback in self._callbacks:
                    try:
                        callback(snapshot)
                    except Exception as e:
                        logging.info(f"⚠️ 资源监控回调错误: {e}")
                
                await asyncio.sleep(self.sample_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logging.info(f"❌ 资源监控错误: {e}")
                await asyncio.sleep(self.sample_interval)
    
    def _check_thresholds(self, snapshot: ResourceSnapshot):
        """检查阈值告警"""
        # CPU告警
        if snapshot.cpu_percent >= self._thresholds["cpu_critical"]:
            logging.info(f"🚨 CPU使用率严重告警: {snapshot.cpu_percent:.1f}%")
        elif snapshot.cpu_percent >= self._thresholds["cpu_warning"]:
            logging.info(f"⚠️ CPU使用率告警: {snapshot.cpu_percent:.1f}%")
        
        # 内存告警
        if snapshot.memory_percent >= self._thresholds["memory_critical"]:
            logging.info(f"🚨 内存使用率严重告警: {snapshot.memory_percent:.1f}%")
        elif snapshot.memory_percent >= self._thresholds["memory_warning"]:
            logging.info(f"⚠️ 内存使用率告警: {snapshot.memory_percent:.1f}%")
        
        # GPU内存告警
        if (snapshot.gpu_memory_used_mb is not None and 
            snapshot.gpu_memory_total_mb is not None):
            gpu_memory_percent = (snapshot.gpu_memory_used_mb / 
                                snapshot.gpu_memory_total_mb * 100)
            
            if gpu_memory_percent >= self._thresholds["gpu_memory_critical"]:
                logging.info(f"🚨 GPU内存使用率严重告警: {gpu_memory_percent:.1f}%")
            elif gpu_memory_percent >= self._thresholds["gpu_memory_warning"]:
                logging.info(f"⚠️ GPU内存使用率告警: {gpu_memory_percent:.1f}%")
    
    def get_current_status(self) -> Optional[ResourceSnapshot]:
        """获取当前资源状态"""
        if not self._history:
            return self._collect_snapshot()
        return self._history[-1]
    
    def get_statistics(self, minutes: int = 5) -> Dict:
        """获取统计信息"""
        if not self._history:
            return {}
        
        # 获取指定时间范围内的数据
        cutoff_time = time.time() - (minutes * 60)
        recent_data = [s for s in self._history if s.timestamp >= cutoff_time]
        
        if not recent_data:
            recent_data = list(self._history)
        
        # 计算统计信息
        cpu_values = [s.cpu_percent for s in recent_data]
        memory_values = [s.memory_percent for s in recent_data]
        
        stats = {
            "time_range_minutes": minutes,
            "sample_count": len(recent_data),
            "cpu": {
                "current": recent_data[-1].cpu_percent,
                "average": sum(cpu_values) / len(cpu_values),
                "max": max(cpu_values),
                "min": min(cpu_values)
            },
            "memory": {
                "current": recent_data[-1].memory_percent,
                "average": sum(memory_values) / len(memory_values),
                "max": max(memory_values),
                "min": min(memory_values),
                "used_mb": recent_data[-1].memory_used_mb,
                "available_mb": recent_data[-1].memory_available_mb
            },
            "disk": {
                "usage_percent": recent_data[-1].disk_usage_percent
            }
        }
        
        # GPU统计
        if self._gpu_available and recent_data[-1].gpu_memory_used_mb is not None:
            gpu_util_values = [s.gpu_utilization for s in recent_data 
                             if s.gpu_utilization is not None]
            
            if gpu_util_values:
                stats["gpu"] = {
                    "memory_used_mb": recent_data[-1].gpu_memory_used_mb,
                    "memory_total_mb": recent_data[-1].gpu_memory_total_mb,
                    "memory_percent": (recent_data[-1].gpu_memory_used_mb / 
                                     recent_data[-1].gpu_memory_total_mb * 100),
                    "utilization": {
                        "current": recent_data[-1].gpu_utilization,
                        "average": sum(gpu_util_values) / len(gpu_util_values),
                        "max": max(gpu_util_values),
                        "min": min(gpu_util_values)
                    }
                }
        
        return stats
    
    def add_callback(self, callback: Callable[[ResourceSnapshot], None]):
        """添加监控回调"""
        self._callbacks.append(callback)
    
    def remove_callback(self, callback: Callable[[ResourceSnapshot], None]):
        """移除监控回调"""
        if callback in self._callbacks:
            self._callbacks.remove(callback)
    
    def set_thresholds(self, **thresholds):
        """设置告警阈值"""
        for key, value in thresholds.items():
            if key in self._thresholds:
                self._thresholds[key] = value
    
    def enable_alerts(self, enabled: bool = True):
        """启用/禁用告警"""
        self._alerts_enabled = enabled
    
    def get_memory_recommendations(self) -> List[str]:
        """获取内存优化建议"""
        current = self.get_current_status()
        if not current:
            return []
        
        recommendations = []
        
        if current.memory_percent > 80:
            recommendations.append("内存使用率较高，建议释放不必要的模型")
        
        if current.memory_percent > 90:
            recommendations.append("内存使用率严重，建议立即清理缓存")
        
        if (current.gpu_memory_used_mb and current.gpu_memory_total_mb and
            current.gpu_memory_used_mb / current.gpu_memory_total_mb > 0.8):
            recommendations.append("GPU内存使用率较高，建议使用较小的模型")
        
        return recommendations


# 全局资源监控器实例
resource_monitor = ResourceMonitor(history_size=300, sample_interval=2.0)
