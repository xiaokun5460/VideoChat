"""
AI功能扩展API路由

包含智能对话、详细总结、教学评价等扩展AI功能
"""

import logging
from fastapi import APIRouter, HTTPException
from utils.api_helpers import handle_streaming_ai_request
from services.ai_service import (
    chat_with_model, generate_detailed_summary, generate_teaching_evaluation
)
from models import (
    ChatMessage, ChatRequest, ChatResponse, DetailedSummaryResponse
)

# 创建路由器
router = APIRouter(prefix="/api", tags=["AI功能"])


# 导入TextRequest类（从主AI路由文件）
try:
    from .ai_routes import TextRequest
except ImportError:
    # 如果导入失败，定义一个本地版本
    from pydantic import BaseModel

    class TextRequest(BaseModel):
        text: str
        stream: bool = True


@router.post(
    "/chat",
    summary="智能对话",
    description="基于内容的AI对话助手",
    response_model=ChatResponse
)
async def chat_endpoint(request: ChatRequest):
    """智能对话接口"""
    try:
        # 调用AI服务进行对话
        response_generator = chat_with_model(request.messages, request.context or "", stream=False)

        # 收集所有响应内容
        response_content = ""
        async for chunk in response_generator:
            response_content += chunk

        return {"response": response_content}
    except Exception as e:
        logging.error(f"对话生成失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"对话生成失败: {str(e)}")


@router.post(
    "/detailed-summary",
    summary="生成详细总结",
    description="生成深入的内容分析总结",
    response_model=DetailedSummaryResponse
)
async def get_detailed_summary(request: TextRequest):
    return await handle_streaming_ai_request(
        text=request.text,
        stream=request.stream,
        ai_function=generate_detailed_summary,
        operation_name="详细总结生成"
    )


@router.post(
    "/ai/evaluate-teaching",
    summary="生成教学评价",
    description="基于内容生成教学评价建议"
)
async def get_teaching_evaluation(request: TextRequest):
    return await handle_streaming_ai_request(
        text=request.text,
        stream=request.stream,
        ai_function=generate_teaching_evaluation,
        operation_name="教学评价生成"
    )