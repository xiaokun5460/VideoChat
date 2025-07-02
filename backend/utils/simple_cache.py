"""
简化版缓存管理器

提供内存缓存功能，不依赖数据库
"""

import asyncio
import hashlib
import inspect
import json
import time
from functools import wraps
from typing import Any, Optional, Dict, Callable
from functools import wraps


class SimpleCache:
    """简单内存缓存（优化版）"""

    def __init__(self, max_size: int = 1000):
        self._cache: Dict[str, Dict] = {}
        self._max_size = max_size
        self._access_order = []  # LRU顺序
        self._stats = {
            'hits': 0,
            'misses': 0,
            'evictions': 0,
            'total_size': 0
        }
    
    def get(self, key: str) -> Optional[Any]:
        """获取缓存（优化版）"""
        if key in self._cache:
            entry = self._cache[key]

            # 检查是否过期
            if time.time() > entry['expires_at']:
                self.delete(key)
                self._stats['misses'] += 1
                return None

            # 更新访问顺序（优化：只在必要时移动）
            if key != self._access_order[-1] if self._access_order else True:
                if key in self._access_order:
                    self._access_order.remove(key)
                self._access_order.append(key)

            entry['hit_count'] += 1
            self._stats['hits'] += 1
            return entry['value']

        self._stats['misses'] += 1
        return None
    
    def set(self, key: str, value: Any, ttl_seconds: int = 3600):
        """设置缓存（优化版）"""
        # 如果缓存已满，删除最少使用的
        if len(self._cache) >= self._max_size and key not in self._cache:
            if self._access_order:
                oldest_key = self._access_order.pop(0)
                del self._cache[oldest_key]
                self._stats['evictions'] += 1

        # 计算值的大小（粗略估算）
        value_size = len(str(value)) if value else 0

        self._cache[key] = {
            'value': value,
            'expires_at': time.time() + ttl_seconds,
            'hit_count': 0,
            'created_at': time.time(),
            'size': value_size
        }

        self._stats['total_size'] += value_size

        # 更新访问顺序
        if key in self._access_order:
            self._access_order.remove(key)
        self._access_order.append(key)
    
    def delete(self, key: str) -> bool:
        """删除缓存"""
        if key in self._cache:
            del self._cache[key]
            if key in self._access_order:
                self._access_order.remove(key)
            return True
        return False
    
    def clear(self):
        """清空缓存"""
        self._cache.clear()
        self._access_order.clear()
        self._stats = {
            'hits': 0,
            'misses': 0,
            'evictions': 0,
            'total_size': 0
        }

    def get_stats(self) -> Dict[str, Any]:
        """获取缓存统计信息"""
        total_requests = self._stats['hits'] + self._stats['misses']
        hit_rate = (self._stats['hits'] / total_requests * 100) if total_requests > 0 else 0

        return {
            'hits': self._stats['hits'],
            'misses': self._stats['misses'],
            'hit_rate': hit_rate,
            'evictions': self._stats['evictions'],
            'current_size': len(self._cache),
            'max_size': self._max_size,
            'total_data_size': self._stats['total_size'],
            'average_item_size': self._stats['total_size'] / len(self._cache) if self._cache else 0
        }

    def optimize(self):
        """优化缓存（清理过期项）"""
        current_time = time.time()
        expired_keys = []

        for key, entry in self._cache.items():
            if current_time > entry['expires_at']:
                expired_keys.append(key)

        for key in expired_keys:
            self.delete(key)

        return len(expired_keys)
    
    def cleanup_expired(self) -> int:
        """清理过期缓存"""
        current_time = time.time()
        expired_keys = [
            key for key, entry in self._cache.items()
            if current_time > entry['expires_at']
        ]
        
        for key in expired_keys:
            self.delete(key)
        
        return len(expired_keys)
    
    def get_stats(self) -> Dict[str, Any]:
        """获取缓存统计"""
        total_hits = sum(entry['hit_count'] for entry in self._cache.values())
        return {
            'size': len(self._cache),
            'max_size': self._max_size,
            'total_hits': total_hits,
            'keys': list(self._cache.keys())
        }


class SimpleCacheManager:
    """简化版缓存管理器"""
    
    def __init__(self, cache_size: int = 1000):
        self._cache = SimpleCache(cache_size)
        self._default_ttl = 3600  # 1小时
    
    def _generate_cache_key(self, prefix: str, *args, **kwargs) -> str:
        """生成缓存键"""
        key_data = {
            'args': args,
            'kwargs': sorted(kwargs.items()) if kwargs else {}
        }
        key_str = json.dumps(key_data, sort_keys=True, ensure_ascii=False)
        key_hash = hashlib.md5(key_str.encode()).hexdigest()
        return f"{prefix}:{key_hash}"
    
    def get(self, cache_key: str) -> Optional[Any]:
        """获取缓存"""
        return self._cache.get(cache_key)
    
    def set(self, cache_key: str, value: Any, ttl_seconds: Optional[int] = None):
        """设置缓存"""
        if ttl_seconds is None:
            ttl_seconds = self._default_ttl
        self._cache.set(cache_key, value, ttl_seconds)
    
    def delete(self, cache_key: str) -> bool:
        """删除缓存"""
        return self._cache.delete(cache_key)
    
    def clear(self):
        """清空缓存"""
        self._cache.clear()
    
    def cleanup_expired(self) -> int:
        """清理过期缓存"""
        return self._cache.cleanup_expired()
    
    def get_statistics(self) -> Dict[str, Any]:
        """获取缓存统计"""
        return {
            "memory_cache": self._cache.get_stats()
        }

    def get_stats(self) -> Dict[str, Any]:
        """获取缓存管理器统计信息"""
        return self._cache.get_stats()
    
    def cache_result(
        self,
        ttl_seconds: Optional[int] = None,
        key_prefix: Optional[str] = None
    ):
        """缓存装饰器"""
        def decorator(func: Callable):

            if inspect.iscoroutinefunction(func):
                # 异步函数装饰器
                @wraps(func)
                async def async_wrapper(*args, **kwargs):
                    # 生成缓存键，跳过第一个参数（通常是self）
                    prefix = key_prefix or f"{func.__module__}.{func.__name__}"
                    # 如果第一个参数看起来像是实例对象，跳过它
                    cache_args = args[1:] if args and hasattr(args[0], '__dict__') else args
                    cache_key = self._generate_cache_key(prefix, *cache_args, **kwargs)

                    # 尝试从缓存获取
                    cached_result = self.get(cache_key)
                    if cached_result is not None:
                        return cached_result

                    # 执行异步函数并缓存结果
                    result = await func(*args, **kwargs)
                    self.set(cache_key, result, ttl_seconds)

                    return result
                return async_wrapper
            else:
                # 同步函数装饰器
                @wraps(func)
                def sync_wrapper(*args, **kwargs):
                    # 生成缓存键，跳过第一个参数（通常是self）
                    prefix = key_prefix or f"{func.__module__}.{func.__name__}"
                    # 如果第一个参数看起来像是实例对象，跳过它
                    cache_args = args[1:] if args and hasattr(args[0], '__dict__') else args
                    cache_key = self._generate_cache_key(prefix, *cache_args, **kwargs)

                    # 尝试从缓存获取
                    cached_result = self.get(cache_key)
                    if cached_result is not None:
                        return cached_result

                    # 执行函数并缓存结果
                    result = func(*args, **kwargs)
                    self.set(cache_key, result, ttl_seconds)

                    return result
                return sync_wrapper
        return decorator


# 全局缓存管理器实例
simple_cache_manager = SimpleCacheManager()


# 便捷的缓存装饰器
def simple_cached(ttl_seconds: int = 3600, key_prefix: Optional[str] = None):
    """便捷的缓存装饰器"""
    return simple_cache_manager.cache_result(ttl_seconds, key_prefix)


# 特定类型的缓存装饰器
def cache_transcription_simple(ttl_seconds: int = 7200):  # 2小时
    """转录结果缓存装饰器（简化版）"""
    return simple_cached(ttl_seconds, "transcription")


def cache_ai_result_simple(ttl_seconds: int = 3600):  # 1小时
    """AI结果缓存装饰器（简化版）"""
    return simple_cached(ttl_seconds, "ai")


def cache_file_info_simple(ttl_seconds: int = 1800):  # 30分钟
    """文件信息缓存装饰器（简化版）"""
    return simple_cached(ttl_seconds, "file")
