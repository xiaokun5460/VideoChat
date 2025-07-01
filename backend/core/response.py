"""
统一响应管理器

提供标准化的API响应格式和处理逻辑，支持流式和非流式响应
"""

import uuid
import json
import asyncio
from datetime import datetime
from typing import Any, Dict, List, Optional, AsyncGenerator
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from .models import StandardResponse


# StandardResponse已移动到core.models.py中，避免重复定义


class StreamingChunk(BaseModel):
    """流式响应数据块格式"""
    success: bool
    data: Dict[str, Any]
    message: str
    code: Optional[str] = None
    timestamp: str
    request_id: str
    stream_info: Dict[str, Any]


class PaginatedData(BaseModel):
    """分页数据格式"""
    items: List[Any]
    total: int
    page: int
    page_size: int
    has_next: bool
    has_prev: bool


class ResponseManager:
    """统一响应管理器 - 支持流式和非流式响应"""

    @staticmethod
    def success(
        data: Any = None,
        message: str = "操作成功",
        code: Optional[str] = None,
        status_code: int = 200
    ) -> JSONResponse:
        """创建成功响应"""
        response = StandardResponse(
            success=True,
            data=data,
            message=message,
            code=code,
            timestamp=datetime.now().isoformat(),
            request_id=str(uuid.uuid4())
        )

        return JSONResponse(
            content=response.model_dump(),
            status_code=status_code
        )

    @staticmethod
    def error(
        message: str = "操作失败",
        code: Optional[str] = None,
        data: Any = None,
        status_code: int = 400
    ) -> JSONResponse:
        """创建错误响应"""
        response = StandardResponse(
            success=False,
            data=data,
            message=message,
            code=code,
            timestamp=datetime.now().isoformat(),
            request_id=str(uuid.uuid4())
        )

        return JSONResponse(
            content=response.model_dump(),
            status_code=status_code
        )

    @staticmethod
    async def streaming(
        data_generator: AsyncGenerator[str, None],
        message: str = "数据传输中",
        code: Optional[str] = None,
        operation_type: str = "stream"
    ) -> StreamingResponse:
        """创建流式响应"""
        request_id = str(uuid.uuid4())
        chunk_counter = 0

        async def generate_stream():
            nonlocal chunk_counter

            # 发送开始标记
            start_chunk = StreamingChunk(
                success=True,
                data={
                    "type": "stream_start",
                    "operation": operation_type
                },
                message=f"{message} - 开始",
                code=code,
                timestamp=datetime.now().isoformat(),
                request_id=request_id,
                stream_info={
                    "is_start": True,
                    "is_final": False,
                    "chunk_id": 0
                }
            )
            yield f"data: {json.dumps(start_chunk.model_dump(), ensure_ascii=False)}\n\n"

            try:
                # 发送数据块
                async for content in data_generator:
                    chunk_counter += 1

                    data_chunk = StreamingChunk(
                        success=True,
                        data={
                            "type": "content",
                            "content": content,
                            "operation": operation_type
                        },
                        message=message,
                        code=code,
                        timestamp=datetime.now().isoformat(),
                        request_id=request_id,
                        stream_info={
                            "is_start": False,
                            "is_final": False,
                            "chunk_id": chunk_counter
                        }
                    )
                    yield f"data: {json.dumps(data_chunk.model_dump(), ensure_ascii=False)}\n\n"

                    # 让出控制权
                    await asyncio.sleep(0)

                # 发送结束标记
                end_chunk = StreamingChunk(
                    success=True,
                    data={
                        "type": "stream_end",
                        "operation": operation_type,
                        "total_chunks": chunk_counter
                    },
                    message=f"{message} - 完成",
                    code=code,
                    timestamp=datetime.now().isoformat(),
                    request_id=request_id,
                    stream_info={
                        "is_start": False,
                        "is_final": True,
                        "chunk_id": chunk_counter + 1
                    }
                )
                yield f"data: {json.dumps(end_chunk.model_dump(), ensure_ascii=False)}\n\n"

            except Exception as e:
                # 发送错误标记
                error_chunk = StreamingChunk(
                    success=False,
                    data={
                        "type": "error",
                        "operation": operation_type,
                        "error_details": str(e)
                    },
                    message=f"流式处理失败: {str(e)}",
                    code="E5001",
                    timestamp=datetime.now().isoformat(),
                    request_id=request_id,
                    stream_info={
                        "is_start": False,
                        "is_final": True,
                        "chunk_id": chunk_counter + 1,
                        "has_error": True
                    }
                )
                yield f"data: {json.dumps(error_chunk.model_dump(), ensure_ascii=False)}\n\n"

        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*"
            }
        )
    
    @staticmethod
    def paginated(
        items: List[Any],
        total: int,
        page: int,
        page_size: int,
        message: str = "数据获取成功"
    ) -> JSONResponse:
        """创建分页响应"""
        has_next = (page * page_size) < total
        has_prev = page > 1

        paginated_data = PaginatedData(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            has_next=has_next,
            has_prev=has_prev
        )

        response = StandardResponse(
            success=True,
            data=paginated_data.model_dump(),
            message=message,
            timestamp=datetime.now().isoformat(),
            request_id=str(uuid.uuid4())
        )

        return JSONResponse(content=response.model_dump())

    @staticmethod
    def task_created(
        task_id: str,
        task_type: str,
        status: str = "created",
        estimated_duration: Optional[int] = None,
        message: str = "任务创建成功"
    ) -> JSONResponse:
        """创建任务响应"""
        task_data = {
            "task_id": task_id,
            "task_type": task_type,
            "status": status,
            "created_at": datetime.now().isoformat(),
            "estimated_duration": estimated_duration
        }

        response = StandardResponse(
            success=True,
            data=task_data,
            message=message,
            timestamp=datetime.now().isoformat(),
            request_id=str(uuid.uuid4())
        )

        return JSONResponse(content=response.model_dump())


# 全局响应管理器实例
response_manager = ResponseManager()
