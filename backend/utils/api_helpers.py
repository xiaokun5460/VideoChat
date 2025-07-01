"""
API公共工具函数

提供统一的API处理模式，消除重复代码，提升代码可维护性
"""

import logging
import asyncio
import tempfile
from datetime import datetime
from typing import AsyncGenerator, Callable, Any, Dict, Optional
from fastapi import HTTPException
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from functools import wraps


async def handle_streaming_ai_request(
    text: str,
    stream: bool,
    ai_function: Callable,
    operation_name: str
) -> Any:
    """
    统一处理流式AI请求的公共函数
    
    Args:
        text: 输入文本
        stream: 是否使用流式响应
        ai_function: AI服务函数
        operation_name: 操作名称（用于日志）
    
    Returns:
        StreamingResponse 或 dict 响应
    """
    logging.info(f"🚀 收到{operation_name}请求 - stream: {stream}, text长度: {len(text)}")

    if stream:
        logging.info(f"📡 开始流式{operation_name}生成...")
        
        async def generate():
            chunk_count = 0
            async for chunk in ai_function(text, stream=True):
                chunk_count += 1
                logging.info(f"📝 发送{operation_name}流式数据块 #{chunk_count}: {chunk[:50]}...")
                yield chunk
            logging.info(f"✅ 流式{operation_name}完成，共发送 {chunk_count} 个数据块")
        
        return StreamingResponse(generate(), media_type="text/plain")
    else:
        logging.info(f"📄 开始非流式{operation_name}生成...")
        # 非流式响应，返回完整内容
        result = ""
        async for chunk in ai_function(text, stream=False):
            result += chunk
        logging.info(f"✅ 非流式{operation_name}完成，内容长度: {len(result)}")
        # 根据操作名称返回正确的字段名
        if "详细总结" in operation_name:
            return {"detailed_summary": result}
        elif "总结" in operation_name:
            return {"summary": result}
        elif "教学评价" in operation_name:
            return {"evaluation": result}
        else:
            return {"result": result}


def log_api_request(operation_name: str):
    """
    API请求日志装饰器
    
    Args:
        operation_name: 操作名称
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            logging.info(f"🎯 开始处理{operation_name}请求")
            try:
                result = await func(*args, **kwargs)
                logging.info(f"✅ {operation_name}请求处理成功")
                return result
            except Exception as e:
                logging.error(f"❌ {operation_name}请求处理失败: {str(e)}")
                raise
        return wrapper
    return decorator


async def create_ai_streaming_response(
    ai_generator: AsyncGenerator[str, None],
    operation_name: str
) -> StreamingResponse:
    """
    创建AI流式响应的简化函数
    
    Args:
        ai_generator: AI生成器
        operation_name: 操作名称
    
    Returns:
        StreamingResponse
    """
    async def generate():
        chunk_count = 0
        async for chunk in ai_generator:
            chunk_count += 1
            logging.info(f"📝 发送{operation_name}数据块 #{chunk_count}: {chunk[:50]}...")
            yield chunk
        logging.info(f"✅ {operation_name}流式响应完成，共发送 {chunk_count} 个数据块")
    
    return StreamingResponse(generate(), media_type="text/plain")


async def create_ai_non_streaming_response(
    ai_generator: AsyncGenerator[str, None],
    response_key: str,
    operation_name: str
) -> Dict[str, str]:
    """
    创建AI非流式响应的简化函数
    
    Args:
        ai_generator: AI生成器
        response_key: 响应字段名
        operation_name: 操作名称
    
    Returns:
        包含结果的字典
    """
    result = ""
    async for chunk in ai_generator:
        result += chunk
    logging.info(f"✅ 非流式{operation_name}完成，内容长度: {len(result)}")
    return {response_key: result}


async def handle_transcription_task(
    transcription_func: Callable,
    file_path: str,
    task_ref: Dict[str, Any],
    file_name: str = ""
) -> Any:
    """
    统一处理转录任务的错误处理和取消逻辑，集成进度反馈

    Args:
        transcription_func: 转录函数
        file_path: 文件路径
        task_ref: 任务引用字典，用于存储task对象
        file_name: 文件名（用于进度跟踪）

    Returns:
        转录结果或错误响应
    """
    from utils.transcription_progress import transcription_tracker

    # 开始转录进度跟踪
    if not file_name:
        file_name = file_path.split('/')[-1] if '/' in file_path else file_path.split('\\')[-1]

    transcription_task_id = await transcription_tracker.start_transcription_tracking(
        file_path=file_path,
        file_name=file_name
    )

    try:
        # 更新模型加载进度
        await transcription_tracker.update_model_loading(file_path, "Whisper")

        # 执行转录
        transcription = await transcription_func(file_path)

        # 完成转录跟踪
        # 处理转录结果：如果是列表，计算段数；如果是字符串，按行分割计算
        if isinstance(transcription, list):
            segments_count = len(transcription)
            result_text = '\n'.join([seg.get('text', '') if isinstance(seg, dict) else str(seg) for seg in transcription])
        else:
            result_text = str(transcription) if transcription else ""
            segments_count = len(result_text.split('\n')) if result_text else 0

        await transcription_tracker.complete_transcription(
            file_path=file_path,
            success=True,
            result_text=result_text,
            segments_count=segments_count
        )

        return {
            "transcription": transcription,
            "task_id": transcription_task_id
        }

    except asyncio.CancelledError:
        logging.warning(f"转录任务被取消: {file_path}")

        # 取消转录跟踪
        await transcription_tracker.cancel_transcription(file_path)

        # 清理任务引用
        if "task" in task_ref and task_ref["task"] and not task_ref["task"].cancelled():
            task_ref["task"].cancel()
        task_ref["task"] = None

        return JSONResponse(
            status_code=499,
            content={"status": "interrupted", "detail": "Transcription interrupted"}
        )

    except Exception as e:
        logging.error(f"转录任务失败: {str(e)}")

        # 完成转录跟踪（失败）
        await transcription_tracker.complete_transcription(
            file_path=file_path,
            success=False,
            error_message=str(e)
        )

        # 清理任务引用
        if "task" in task_ref and task_ref["task"]:
            task_ref["task"] = None

        return JSONResponse(
            status_code=500,
            content={"status": "failed", "detail": str(e)}
        )


def handle_api_exception(operation_name: str):
    """
    统一的API异常处理装饰器

    Args:
        operation_name: 操作名称，用于错误日志
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except HTTPException:
                # 重新抛出HTTP异常
                raise
            except Exception as e:
                logging.error(f"{operation_name}失败: {str(e)}")
                raise HTTPException(status_code=500, detail=f"{operation_name}失败: {str(e)}")
        return wrapper
    return decorator


def generate_timestamp_filename(prefix: str, extension: str) -> tuple[str, str]:
    """
    生成带时间戳的文件名

    Args:
        prefix: 文件名前缀
        extension: 文件扩展名

    Returns:
        (timestamp, filename) 元组
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{prefix}_{timestamp}.{extension}"
    return timestamp, filename


async def create_temp_file_response(
    content: str,
    filename: str,
    media_type: str
) -> FileResponse:
    """
    创建临时文件响应的统一函数

    Args:
        content: 文件内容
        filename: 文件名
        media_type: MIME类型

    Returns:
        FileResponse对象
    """
    try:
        # 创建临时文件
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{filename.split('.')[-1]}") as temp_file:
            temp_file.write(content.encode('utf-8'))
            temp_file.flush()

            return FileResponse(
                path=temp_file.name,
                filename=filename,
                media_type=media_type,
                background=None
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件创建失败: {str(e)}")


def validate_not_empty(value: str, field_name: str) -> None:
    """
    验证字段不为空的统一函数

    Args:
        value: 要验证的值
        field_name: 字段名称

    Raises:
        HTTPException: 如果值为空
    """
    if not value or not value.strip():
        raise HTTPException(status_code=400, detail=f"{field_name}不能为空")