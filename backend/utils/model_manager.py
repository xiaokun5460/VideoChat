"""
模型生命周期管理器

提供Whisper模型的动态加载、释放和内存管理功能
"""

import asyncio
import threading
import time
import logging
from typing import Optional
from faster_whisper import WhisperModel
from config import STT_CONFIG


class ModelManager:
    """Whisper模型管理器 - 单例模式"""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if hasattr(self, '_initialized'):
            return
            
        self._model: Optional[WhisperModel] = None
        self._last_used: float = 0
        self._model_lock = asyncio.Lock()
        self._reference_count = 0
        self._cleanup_task: Optional[asyncio.Task] = None
        self._initialized = True
        
        # 配置参数
        self.idle_timeout = 300  # 5分钟空闲后释放模型
        self.cleanup_interval = 60  # 每分钟检查一次
    
    async def get_model(self) -> WhisperModel:
        """获取模型实例，按需加载"""
        async with self._model_lock:
            self._reference_count += 1
            self._last_used = time.time()
            
            if self._model is None:
                logging.info("🔄 正在加载Whisper模型...")
                self._model = self._load_model()
                logging.info("✅ Whisper模型加载完成")
                
                # 启动清理任务
                if self._cleanup_task is None or self._cleanup_task.done():
                    self._cleanup_task = asyncio.create_task(self._cleanup_loop())
            
            return self._model
    
    async def release_model(self):
        """释放模型引用"""
        async with self._model_lock:
            self._reference_count = max(0, self._reference_count - 1)
            self._last_used = time.time()
    
    def _load_model(self) -> WhisperModel:
        """加载Whisper模型"""
        model_size = STT_CONFIG.get("whisper_model", "base")
        device = STT_CONFIG.get("device", "auto")
        
        try:
            if device == "auto":
                # 自动检测设备
                logging.info("🔍 自动检测设备...")
                try:
                    import torch
                    logging.info(f"✅ PyTorch版本: {torch.__version__}")
                    if torch.cuda.is_available():
                        gpu_count = torch.cuda.device_count()
                        gpu_name = torch.cuda.get_device_name(0) if gpu_count > 0 else "Unknown"
                        logging.info(f"🚀 检测到CUDA，GPU数量: {gpu_count}, GPU名称: {gpu_name}")
                        logging.info("🎯 使用GPU模式加载Whisper模型")
                        return WhisperModel(
                            model_size,
                            device="cuda",
                            compute_type="float16"
                        )
                    else:
                        logging.info("⚠️ CUDA不可用，原因可能是：1)未安装CUDA 2)未安装GPU版PyTorch 3)GPU驱动问题")
                except ImportError as e:
                    logging.info(f"⚠️ PyTorch未安装或导入失败: {e}")
                except Exception as e:
                    logging.info(f"⚠️ GPU检测失败: {e}")

                logging.info("💻 使用CPU模式加载Whisper模型")
                return WhisperModel(
                    model_size,
                    device="cpu",
                    compute_type="int8"
                )
            else:
                # 使用指定设备
                compute_type = "float16" if device == "cuda" else "int8"
                logging.info(f"🎯 使用指定设备: {device}, 计算类型: {compute_type}")
                return WhisperModel(
                    model_size,
                    device=device,
                    compute_type=compute_type
                )
                
        except Exception as e:
            logging.info(f"❌ 模型加载失败: {e}")
            # 降级到CPU模式
            logging.info("🔄 降级到CPU模式...")
            return WhisperModel(
                model_size,
                device="cpu",
                compute_type="int8"
            )
    
    async def _cleanup_loop(self):
        """清理循环，定期检查是否需要释放模型"""
        while True:
            try:
                await asyncio.sleep(self.cleanup_interval)
                
                async with self._model_lock:
                    if (self._model is not None and 
                        self._reference_count == 0 and 
                        time.time() - self._last_used > self.idle_timeout):
                        
                        logging.info("🧹 释放空闲的Whisper模型以节省内存")
                        del self._model
                        self._model = None
                        
                        # 如果没有引用，停止清理任务
                        break
                        
            except asyncio.CancelledError:
                break
            except Exception as e:
                logging.info(f"⚠️ 模型清理任务错误: {e}")
    
    async def force_cleanup(self):
        """强制清理模型"""
        async with self._model_lock:
            if self._model is not None:
                logging.info("🧹 强制释放Whisper模型")
                del self._model
                self._model = None
                self._reference_count = 0
                
            if self._cleanup_task and not self._cleanup_task.done():
                self._cleanup_task.cancel()
    
    def get_status(self) -> dict:
        """获取模型状态信息"""
        return {
            "model_loaded": self._model is not None,
            "reference_count": self._reference_count,
            "last_used": self._last_used,
            "idle_time": time.time() - self._last_used if self._last_used > 0 else 0,
            "memory_usage_mb": 0  # 简化版本，避免复杂的内存计算
        }

    def get_stats(self) -> dict:
        """获取模型统计信息（别名方法）"""
        return self.get_status()


# 全局模型管理器实例
model_manager = ModelManager()
