"""
AI服务性能优化器

提供OpenAI API连接池、智能缓存、流式响应优化等功能
"""

import asyncio
import hashlib
import json
import logging
import time
from typing import Dict, Any, Optional, List, AsyncGenerator
from openai import AsyncOpenAI
from utils.simple_cache import simple_cache_manager
from config import AI_CONFIG


class AIConnectionPool:
    """OpenAI API连接池管理器"""
    
    def __init__(self, max_connections: int = 5, timeout: int = 30):
        """
        初始化连接池
        
        Args:
            max_connections: 最大连接数
            timeout: 请求超时时间
        """
        self.max_connections = max_connections
        self.timeout = timeout
        self._clients: List[AsyncOpenAI] = []
        self._semaphore = asyncio.Semaphore(max_connections)
        self._stats = {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'cache_hits': 0,
            'total_response_time': 0.0,
            'connection_reuses': 0
        }
    
    async def _get_client(self) -> AsyncOpenAI:
        """获取或创建OpenAI客户端"""
        if self._clients:
            client = self._clients.pop()
            self._stats['connection_reuses'] += 1
            return client
        
        # 创建新客户端
        return AsyncOpenAI(
            base_url=AI_CONFIG["base_url"],
            api_key=AI_CONFIG["api_key"],
            timeout=self.timeout
        )
    
    async def _return_client(self, client: AsyncOpenAI):
        """归还客户端到池中"""
        if len(self._clients) < self.max_connections:
            self._clients.append(client)
    
    async def create_completion(
        self,
        messages: List[Dict[str, str]],
        stream: bool = False,
        use_cache: bool = True,
        cache_ttl: int = 3600,
        **kwargs
    ) -> Any:
        """
        创建AI完成请求（支持连接池和缓存）
        
        Args:
            messages: 消息列表
            stream: 是否流式响应
            use_cache: 是否使用缓存
            cache_ttl: 缓存时间（秒）
            **kwargs: 其他参数
        
        Returns:
            AI响应结果
        """
        start_time = time.time()
        self._stats['total_requests'] += 1
        
        # 生成缓存键
        cache_key = None
        if use_cache and not stream:
            cache_key = self._generate_cache_key(messages, kwargs)
            cached_result = simple_cache_manager.get(cache_key)
            if cached_result:
                self._stats['cache_hits'] += 1
                logging.info(f"🔄 AI请求缓存命中: {cache_key[:16]}...")
                return cached_result
        
        async with self._semaphore:
            client = await self._get_client()
            
            try:
                # 设置默认参数
                request_params = {
                    'model': AI_CONFIG.get("model", "gpt-3.5-turbo"),
                    'messages': messages,
                    'stream': stream,
                    **kwargs
                }
                
                # 发送请求
                response = await client.chat.completions.create(**request_params)
                
                # 记录成功
                elapsed_time = time.time() - start_time
                self._stats['successful_requests'] += 1
                self._stats['total_response_time'] += elapsed_time
                
                logging.info(f"✅ AI请求完成，耗时: {elapsed_time:.2f}s")
                
                # 缓存非流式响应
                if use_cache and not stream and cache_key:
                    simple_cache_manager.set(cache_key, response, cache_ttl)
                
                return response
                
            except Exception as e:
                self._stats['failed_requests'] += 1
                logging.error(f"❌ AI请求失败: {str(e)}")
                raise
            
            finally:
                await self._return_client(client)
    
    def _generate_cache_key(self, messages: List[Dict], kwargs: Dict) -> str:
        """生成缓存键"""
        cache_data = {
            'messages': messages,
            'params': {k: v for k, v in kwargs.items() if k not in ['stream']}
        }
        cache_str = json.dumps(cache_data, sort_keys=True, ensure_ascii=False)
        return f"ai_completion:{hashlib.md5(cache_str.encode()).hexdigest()}"
    
    def get_stats(self) -> Dict[str, Any]:
        """获取连接池统计信息"""
        stats = self._stats.copy()
        if stats['total_requests'] > 0:
            stats['success_rate'] = (stats['successful_requests'] / stats['total_requests']) * 100
            stats['cache_hit_rate'] = (stats['cache_hits'] / stats['total_requests']) * 100
            stats['average_response_time'] = stats['total_response_time'] / stats['successful_requests'] if stats['successful_requests'] > 0 else 0
        else:
            stats['success_rate'] = 0
            stats['cache_hit_rate'] = 0
            stats['average_response_time'] = 0
        
        stats['active_connections'] = len(self._clients)
        stats['max_connections'] = self.max_connections
        return stats


class StreamingOptimizer:
    """流式响应优化器"""
    
    def __init__(self, buffer_size: int = 512, flush_interval: float = 0.05):
        """
        初始化流式优化器
        
        Args:
            buffer_size: 缓冲区大小（字符数）
            flush_interval: 刷新间隔（秒）
        """
        self.buffer_size = buffer_size
        self.flush_interval = flush_interval
    
    async def optimize_stream(
        self,
        stream_generator: AsyncGenerator[str, None],
        enable_buffering: bool = True
    ) -> AsyncGenerator[str, None]:
        """
        优化流式响应
        
        Args:
            stream_generator: 原始流式生成器
            enable_buffering: 是否启用缓冲
        
        Yields:
            优化后的流式数据
        """
        if not enable_buffering:
            # 直接透传
            async for chunk in stream_generator:
                yield chunk
            return
        
        buffer = ""
        last_flush = time.time()
        
        try:
            async for chunk in stream_generator:
                buffer += chunk
                current_time = time.time()
                
                # 检查是否需要刷新缓冲区
                should_flush = (
                    len(buffer) >= self.buffer_size or
                    current_time - last_flush >= self.flush_interval or
                    chunk.endswith(('\n', '。', '！', '？', '.', '!', '?'))
                )
                
                if should_flush and buffer:
                    yield buffer
                    buffer = ""
                    last_flush = current_time
        
        finally:
            # 发送剩余缓冲区内容
            if buffer:
                yield buffer


class AIPerformanceOptimizer:
    """AI性能优化器主类"""
    
    def __init__(self):
        """初始化AI性能优化器"""
        self.connection_pool = AIConnectionPool(
            max_connections=AI_CONFIG.get("max_connections", 5),
            timeout=AI_CONFIG.get("timeout", 30)
        )
        self.streaming_optimizer = StreamingOptimizer()
    
    async def create_optimized_completion(
        self,
        messages: List[Dict[str, str]],
        stream: bool = False,
        use_cache: bool = True,
        enable_stream_buffering: bool = True,
        **kwargs
    ) -> Any:
        """
        创建优化的AI完成请求
        
        Args:
            messages: 消息列表
            stream: 是否流式响应
            use_cache: 是否使用缓存
            enable_stream_buffering: 是否启用流式缓冲
            **kwargs: 其他参数
        
        Returns:
            优化后的AI响应
        """
        response = await self.connection_pool.create_completion(
            messages=messages,
            stream=stream,
            use_cache=use_cache,
            **kwargs
        )
        
        if stream:
            # 优化流式响应
            async def optimized_stream():
                async for chunk in response:
                    if (chunk.choices and
                        len(chunk.choices) > 0 and
                        hasattr(chunk.choices[0], 'delta') and
                        chunk.choices[0].delta.content is not None):
                        yield chunk.choices[0].delta.content
            
            return self.streaming_optimizer.optimize_stream(
                optimized_stream(),
                enable_stream_buffering
            )
        
        return response
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """获取性能统计信息"""
        return {
            'connection_pool': self.connection_pool.get_stats(),
            'streaming_optimizer': {
                'buffer_size': self.streaming_optimizer.buffer_size,
                'flush_interval': self.streaming_optimizer.flush_interval
            }
        }


# 全局AI性能优化器实例
ai_performance_optimizer = AIPerformanceOptimizer()