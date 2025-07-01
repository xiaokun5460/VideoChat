"""
流式响应优化器

优化流式响应的性能和用户体验
"""

import asyncio
import json
import time
from typing import AsyncGenerator, Dict, Any, Optional, List
from dataclasses import dataclass


@dataclass
class StreamChunk:
    """流式数据块"""
    data: Any
    chunk_id: int
    timestamp: float
    chunk_type: str = "data"
    metadata: Optional[Dict] = None


class StreamingOptimizer:
    """流式响应优化器"""
    
    def __init__(self, buffer_size: int = 1024, flush_interval: float = 0.1):
        self.buffer_size = buffer_size
        self.flush_interval = flush_interval
        self._buffer: List[str] = []
        self._buffer_size_bytes = 0
        self._last_flush = time.time()
        self._chunk_counter = 0
    
    async def stream_with_buffer(
        self, 
        data_generator: AsyncGenerator[str, None],
        content_type: str = "text/plain"
    ) -> AsyncGenerator[str, None]:
        """带缓冲的流式响应"""
        try:
            async for chunk in data_generator:
                # 添加到缓冲区
                self._buffer.append(chunk)
                self._buffer_size_bytes += len(chunk.encode('utf-8'))
                
                # 检查是否需要刷新缓冲区
                current_time = time.time()
                should_flush = (
                    self._buffer_size_bytes >= self.buffer_size or
                    current_time - self._last_flush >= self.flush_interval or
                    chunk.endswith('\n') or chunk.endswith('\r\n')
                )
                
                if should_flush:
                    # 刷新缓冲区
                    if self._buffer:
                        combined_chunk = ''.join(self._buffer)
                        self._buffer.clear()
                        self._buffer_size_bytes = 0
                        self._last_flush = current_time
                        yield combined_chunk
        
        finally:
            # 发送剩余的缓冲区内容
            if self._buffer:
                combined_chunk = ''.join(self._buffer)
                self._buffer.clear()
                self._buffer_size_bytes = 0
                yield combined_chunk
    
    async def stream_json_chunks(
        self, 
        data_generator: AsyncGenerator[Dict[str, Any], None]
    ) -> AsyncGenerator[str, None]:
        """流式JSON响应"""
        self._chunk_counter = 0
        
        # 发送开始标记
        yield "data: " + json.dumps({
            "type": "stream_start",
            "timestamp": time.time()
        }) + "\n\n"
        
        try:
            async for data in data_generator:
                self._chunk_counter += 1
                
                chunk = StreamChunk(
                    data=data,
                    chunk_id=self._chunk_counter,
                    timestamp=time.time(),
                    chunk_type="data"
                )
                
                # 格式化为SSE格式
                chunk_json = json.dumps({
                    "type": "data",
                    "chunk_id": chunk.chunk_id,
                    "timestamp": chunk.timestamp,
                    "data": chunk.data
                }, ensure_ascii=False)
                
                yield f"data: {chunk_json}\n\n"
                
                # 让出控制权
                await asyncio.sleep(0)
        
        except Exception as e:
            # 发送错误信息
            error_chunk = json.dumps({
                "type": "error",
                "timestamp": time.time(),
                "error": str(e)
            })
            yield f"data: {error_chunk}\n\n"
        
        finally:
            # 发送结束标记
            end_chunk = json.dumps({
                "type": "stream_end",
                "timestamp": time.time(),
                "total_chunks": self._chunk_counter
            })
            yield f"data: {end_chunk}\n\n"
    
    async def stream_transcription_progress(
        self,
        transcription_generator: AsyncGenerator[Dict[str, Any], None]
    ) -> AsyncGenerator[str, None]:
        """流式转录进度响应"""
        total_segments = 0
        processed_segments = 0
        
        # 发送开始事件
        yield "event: transcription_start\n"
        yield f"data: {json.dumps({'status': 'started', 'timestamp': time.time()})}\n\n"
        
        try:
            async for segment_data in transcription_generator:
                processed_segments += 1
                
                # 发送进度事件
                progress_data = {
                    "type": "progress",
                    "processed_segments": processed_segments,
                    "current_segment": segment_data,
                    "timestamp": time.time()
                }
                
                yield "event: transcription_progress\n"
                yield f"data: {json.dumps(progress_data, ensure_ascii=False)}\n\n"
                
                # 控制发送频率
                await asyncio.sleep(0.01)
        
        except Exception as e:
            # 发送错误事件
            error_data = {
                "type": "error",
                "error": str(e),
                "timestamp": time.time()
            }
            yield "event: transcription_error\n"
            yield f"data: {json.dumps(error_data)}\n\n"
        
        finally:
            # 发送完成事件
            complete_data = {
                "type": "completed",
                "total_segments": processed_segments,
                "timestamp": time.time()
            }
            yield "event: transcription_complete\n"
            yield f"data: {json.dumps(complete_data)}\n\n"
    
    async def stream_ai_response(
        self,
        ai_generator: AsyncGenerator[str, None],
        include_metadata: bool = True
    ) -> AsyncGenerator[str, None]:
        """流式AI响应优化"""
        start_time = time.time()
        total_tokens = 0
        
        if include_metadata:
            # 发送元数据
            metadata = {
                "type": "metadata",
                "start_time": start_time,
                "model": "ai_model"
            }
            yield f"data: {json.dumps(metadata)}\n\n"
        
        try:
            async for token in ai_generator:
                total_tokens += 1
                
                # 优化小token的合并
                if len(token.strip()) == 0:
                    continue
                
                token_data = {
                    "type": "token",
                    "content": token,
                    "token_count": total_tokens
                }
                
                if include_metadata:
                    token_data["timestamp"] = time.time()
                
                yield f"data: {json.dumps(token_data, ensure_ascii=False)}\n\n"
                
                # 动态调整发送频率
                if total_tokens % 5 == 0:  # 每5个token让出一次控制权
                    await asyncio.sleep(0.001)
        
        except Exception as e:
            error_data = {
                "type": "error",
                "error": str(e),
                "timestamp": time.time()
            }
            yield f"data: {json.dumps(error_data)}\n\n"
        
        finally:
            if include_metadata:
                # 发送完成统计
                end_time = time.time()
                stats = {
                    "type": "stats",
                    "total_tokens": total_tokens,
                    "duration": end_time - start_time,
                    "tokens_per_second": total_tokens / (end_time - start_time) if end_time > start_time else 0,
                    "end_time": end_time
                }
                yield f"data: {json.dumps(stats)}\n\n"


class ChunkedUploadOptimizer:
    """分块上传优化器"""
    
    def __init__(self, chunk_size: int = 1024 * 1024):  # 1MB chunks
        self.chunk_size = chunk_size
    
    async def process_chunked_upload(
        self,
        file_data: bytes,
        progress_callback: Optional[callable] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """处理分块上传"""
        total_size = len(file_data)
        uploaded_size = 0
        chunk_count = 0
        
        while uploaded_size < total_size:
            # 计算当前块大小
            current_chunk_size = min(self.chunk_size, total_size - uploaded_size)
            chunk_data = file_data[uploaded_size:uploaded_size + current_chunk_size]
            
            chunk_count += 1
            uploaded_size += current_chunk_size
            
            # 计算进度
            progress = (uploaded_size / total_size) * 100
            
            chunk_info = {
                "chunk_id": chunk_count,
                "chunk_size": current_chunk_size,
                "uploaded_size": uploaded_size,
                "total_size": total_size,
                "progress": progress,
                "data": chunk_data
            }
            
            # 调用进度回调
            if progress_callback:
                await progress_callback(chunk_info)
            
            yield chunk_info
            
            # 让出控制权
            await asyncio.sleep(0.001)


# 全局优化器实例
streaming_optimizer = StreamingOptimizer()
chunked_upload_optimizer = ChunkedUploadOptimizer()
