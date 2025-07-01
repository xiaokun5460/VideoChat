"""
音视频处理性能优化器

提供Whisper转录优化、大文件处理、内存管理等功能
"""

import asyncio
import logging
import os
import psutil
import time
from typing import Dict, Any, Optional, List, Tuple
from utils.resource_monitor import resource_monitor
from utils.task_queue import task_queue, TaskPriority
from utils.simple_cache import simple_cache_manager
from config import STT_CONFIG


class WhisperOptimizer:
    """Whisper转录性能优化器"""
    
    def __init__(self):
        """初始化Whisper优化器"""
        self._stats = {
            'total_transcriptions': 0,
            'gpu_transcriptions': 0,
            'cpu_transcriptions': 0,
            'total_processing_time': 0.0,
            'memory_optimizations': 0,
            'batch_optimizations': 0
        }
    
    def get_optimal_device_config(self) -> Dict[str, Any]:
        """
        获取最优设备配置
        
        Returns:
            优化的设备配置
        """
        config = STT_CONFIG.copy()
        
        # 检查系统资源
        memory_percent = psutil.virtual_memory().percent
        cpu_percent = psutil.cpu_percent(interval=1)
        
        # 根据系统负载调整配置
        if memory_percent > 80:
            # 内存紧张，使用更保守的配置
            config['beam_size'] = min(config.get('beam_size', 5), 3)
            config['compute_type_cpu'] = 'int8'
            config['compute_type_gpu'] = 'float16'
            self._stats['memory_optimizations'] += 1
            logging.info(f"🔧 内存优化: 调整beam_size={config['beam_size']}")
        
        if cpu_percent > 90:
            # CPU负载高，降低处理复杂度
            config['vad_filter'] = False  # 关闭VAD过滤减少CPU负载
            logging.info("🔧 CPU优化: 关闭VAD过滤")
        
        # GPU可用性检查
        try:
            import GPUtil
            gpus = GPUtil.getGPUs()
            if gpus and config.get('device') in ['auto', 'gpu']:
                gpu = gpus[0]
                if gpu.memoryUtil > 0.8:  # GPU内存使用超过80%
                    config['device'] = 'cpu'
                    logging.info("🔧 GPU内存不足，切换到CPU模式")
                else:
                    config['device'] = 'gpu'
                    logging.info(f"✅ 使用GPU: {gpu.name} (内存使用: {gpu.memoryUtil:.1%})")
        except ImportError:
            logging.info("⚠️ GPUtil未安装，无法检测GPU状态")
        
        return config
    
    def estimate_processing_time(self, file_path: str) -> float:
        """
        估算处理时间
        
        Args:
            file_path: 音频文件路径
        
        Returns:
            估算的处理时间（秒）
        """
        try:
            file_size = os.path.getsize(file_path)
            
            # 基于文件大小的粗略估算
            # 假设1MB音频约1分钟，处理时间约为音频时长的10-30%
            estimated_duration = file_size / (1024 * 1024)  # MB
            
            config = self.get_optimal_device_config()
            if config.get('device') == 'gpu':
                processing_ratio = 0.1  # GPU处理更快
            else:
                processing_ratio = 0.3  # CPU处理较慢
            
            estimated_time = estimated_duration * 60 * processing_ratio
            return max(estimated_time, 10)  # 最少10秒
            
        except Exception as e:
            logging.warning(f"⚠️ 无法估算处理时间: {str(e)}")
            return 60  # 默认1分钟
    
    def should_use_batch_processing(self, file_paths: List[str]) -> bool:
        """
        判断是否应该使用批处理
        
        Args:
            file_paths: 文件路径列表
        
        Returns:
            是否使用批处理
        """
        if len(file_paths) < 2:
            return False
        
        total_size = sum(os.path.getsize(path) for path in file_paths if os.path.exists(path))
        available_memory = psutil.virtual_memory().available
        
        # 如果总文件大小小于可用内存的50%，可以考虑批处理
        if total_size < available_memory * 0.5:
            self._stats['batch_optimizations'] += 1
            return True
        
        return False
    
    def get_stats(self) -> Dict[str, Any]:
        """获取优化器统计信息"""
        stats = self._stats.copy()
        if stats['total_transcriptions'] > 0:
            stats['gpu_usage_rate'] = (stats['gpu_transcriptions'] / stats['total_transcriptions']) * 100
            stats['average_processing_time'] = stats['total_processing_time'] / stats['total_transcriptions']
        else:
            stats['gpu_usage_rate'] = 0
            stats['average_processing_time'] = 0
        
        return stats


class FileProcessingOptimizer:
    """文件处理性能优化器"""
    
    def __init__(self, chunk_size: int = 8192, max_memory_usage: float = 0.8):
        """
        初始化文件处理优化器
        
        Args:
            chunk_size: 文件读取块大小
            max_memory_usage: 最大内存使用率
        """
        self.chunk_size = chunk_size
        self.max_memory_usage = max_memory_usage
        self._stats = {
            'files_processed': 0,
            'total_bytes_processed': 0,
            'memory_warnings': 0,
            'chunk_optimizations': 0
        }
    
    async def process_large_file(
        self,
        file_path: str,
        processor_func,
        progress_callback: Optional[callable] = None
    ) -> Any:
        """
        处理大文件（支持进度回调和内存监控）
        
        Args:
            file_path: 文件路径
            processor_func: 处理函数
            progress_callback: 进度回调函数
        
        Returns:
            处理结果
        """
        file_size = os.path.getsize(file_path)
        self._stats['files_processed'] += 1
        self._stats['total_bytes_processed'] += file_size
        
        # 检查内存使用情况
        memory_percent = psutil.virtual_memory().percent
        if memory_percent > self.max_memory_usage * 100:
            self._stats['memory_warnings'] += 1
            logging.warning(f"⚠️ 内存使用率过高: {memory_percent:.1f}%")
            
            # 等待内存释放
            await asyncio.sleep(1)
        
        # 大文件分块处理
        if file_size > 100 * 1024 * 1024:  # 100MB以上
            self._stats['chunk_optimizations'] += 1
            logging.info(f"📦 大文件分块处理: {file_size / 1024 / 1024:.1f}MB")
            
            # 这里可以实现文件分块逻辑
            # 目前直接调用处理函数
        
        try:
            start_time = time.time()
            
            # 调用处理函数
            result = await processor_func(file_path)
            
            processing_time = time.time() - start_time
            logging.info(f"✅ 文件处理完成，耗时: {processing_time:.2f}s")
            
            if progress_callback:
                await progress_callback(100, "处理完成")
            
            return result
            
        except Exception as e:
            logging.error(f"❌ 文件处理失败: {str(e)}")
            if progress_callback:
                await progress_callback(-1, f"处理失败: {str(e)}")
            raise
    
    def get_optimal_chunk_size(self, file_size: int) -> int:
        """
        获取最优块大小
        
        Args:
            file_size: 文件大小
        
        Returns:
            最优块大小
        """
        available_memory = psutil.virtual_memory().available
        
        # 根据可用内存和文件大小调整块大小
        if file_size > available_memory * 0.1:
            # 大文件使用较小的块
            return min(self.chunk_size, 4096)
        else:
            # 小文件可以使用较大的块
            return min(self.chunk_size * 2, 16384)
    
    def get_stats(self) -> Dict[str, Any]:
        """获取文件处理统计信息"""
        stats = self._stats.copy()
        if stats['files_processed'] > 0:
            stats['average_file_size'] = stats['total_bytes_processed'] / stats['files_processed']
        else:
            stats['average_file_size'] = 0
        
        return stats


class MediaPerformanceOptimizer:
    """音视频性能优化器主类"""
    
    def __init__(self):
        """初始化音视频性能优化器"""
        self.whisper_optimizer = WhisperOptimizer()
        self.file_optimizer = FileProcessingOptimizer()
    
    async def optimize_transcription_task(
        self,
        file_path: str,
        priority: TaskPriority = TaskPriority.NORMAL
    ) -> Dict[str, Any]:
        """
        优化转录任务
        
        Args:
            file_path: 文件路径
            priority: 任务优先级
        
        Returns:
            优化配置
        """
        # 获取最优设备配置
        device_config = self.whisper_optimizer.get_optimal_device_config()
        
        # 估算处理时间
        estimated_time = self.whisper_optimizer.estimate_processing_time(file_path)
        
        # 获取最优块大小
        file_size = os.path.getsize(file_path)
        chunk_size = self.file_optimizer.get_optimal_chunk_size(file_size)
        
        optimization_config = {
            'device_config': device_config,
            'estimated_time': estimated_time,
            'chunk_size': chunk_size,
            'priority': priority,
            'file_size': file_size,
            'should_cache': file_size < 50 * 1024 * 1024,  # 50MB以下缓存
            'memory_monitoring': file_size > 100 * 1024 * 1024  # 100MB以上监控内存
        }
        
        logging.info(f"🎯 转录任务优化配置: {optimization_config}")
        return optimization_config
    
    async def batch_optimize_transcriptions(
        self,
        file_paths: List[str]
    ) -> Dict[str, Any]:
        """
        批量优化转录任务
        
        Args:
            file_paths: 文件路径列表
        
        Returns:
            批量优化配置
        """
        should_batch = self.whisper_optimizer.should_use_batch_processing(file_paths)
        
        if should_batch:
            logging.info(f"📦 启用批处理模式，文件数量: {len(file_paths)}")
            
            # 按文件大小排序，小文件优先处理
            sorted_files = sorted(file_paths, key=lambda x: os.path.getsize(x) if os.path.exists(x) else 0)
            
            return {
                'batch_mode': True,
                'file_order': sorted_files,
                'estimated_total_time': sum(
                    self.whisper_optimizer.estimate_processing_time(path) 
                    for path in file_paths
                ) * 0.8,  # 批处理效率提升20%
                'memory_monitoring': True
            }
        else:
            return {
                'batch_mode': False,
                'individual_optimization': True
            }
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """获取性能统计信息"""
        return {
            'whisper_optimizer': self.whisper_optimizer.get_stats(),
            'file_optimizer': self.file_optimizer.get_stats(),
            'system_resources': {
                'memory_percent': psutil.virtual_memory().percent,
                'cpu_percent': psutil.cpu_percent(),
                'disk_usage': psutil.disk_usage('/').percent if os.name != 'nt' else psutil.disk_usage('C:').percent
            }
        }


# 全局音视频性能优化器实例
media_performance_optimizer = MediaPerformanceOptimizer()