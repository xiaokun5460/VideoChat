"""
AI功能相关API路由

提供AI内容分析功能，包括文本总结、思维导图生成、智能对话等
"""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from utils.api_helpers import handle_streaming_ai_request
from services.ai_service import (
    generate_summary, generate_mindmap, generate_mindmap_image,
    export_content_to_image
)
from models import (
    SummaryResponse, MindmapResponse, MindmapImageResponse,
    ContentExportRequest, ContentExportResponse
)

# 创建路由器
router = APIRouter(prefix="/api", tags=["AI功能"])


class TextRequest(BaseModel):
    """文本处理请求模型

    用于AI功能（总结、思维导图等）的文本输入请求
    """
    text: str  # 要处理的文本内容，通常是转录结果
    stream: bool = True  # 是否使用流式响应，默认为True

    class Config:
        json_schema_extra = {
            "example": {
                "text": "这是一段关于人工智能发展的讲座内容，讲述了从早期的符号主义到现代的深度学习技术的演进过程...",
                "stream": True
            }
        }


@router.post(
    "/summary",
    summary="生成内容总结",
    description="基于文本内容生成AI总结",
    response_model=SummaryResponse
)
async def get_summary(request: TextRequest):
    return await handle_streaming_ai_request(
        text=request.text,
        stream=request.stream,
        ai_function=generate_summary,
        operation_name="总结生成"
    )


@router.post(
    "/mindmap",
    summary="生成思维导图",
    description="生成JSON格式思维导图数据",
    response_model=MindmapResponse
)
async def get_mindmap(request: TextRequest):
    try:
        mindmap_json = await generate_mindmap(request.text)
        return {"mindmap": mindmap_json}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/mindmap-image",
    summary="生成导图图片",
    description="生成思维导图PNG图片",
    response_model=MindmapImageResponse
)
async def get_mindmap_image(request: TextRequest):
    """
    生成思维导图图片接口

    接收文本内容，生成HTML格式的思维导图，然后转换为PNG图片文件
    """
    try:
        # 调用AI服务生成思维导图图片
        result = await generate_mindmap_image(request.text)

        if result and "image_path" in result:
            return {
                "image_path": result["image_path"],
                "message": "思维导图图片生成成功"
            }
        else:
            raise HTTPException(status_code=500, detail="思维导图图片生成失败")

    except Exception as e:
        logging.error(f"思维导图图片生成失败: {str(e)}")
        # 暂时返回友好的错误消息而不是500错误
        raise HTTPException(
            status_code=503,
            detail="思维导图图片生成功能暂时不可用，请使用文本版思维导图。原因：Playwright转换服务未配置"
        )


@router.post(
    "/export-content-image",
    summary="导出内容图片",
    description="将内容导出为PNG图片",
    response_model=ContentExportResponse
)
async def export_content_image(request: ContentExportRequest):
    """
    内容导出为图片接口

    接收HTML或Markdown内容，转换为PNG图片文件
    """
    try:
        # 调用AI服务导出内容为图片
        result = await export_content_to_image(request.content, request.content_type)

        if result and "image_path" in result:
            return {
                "image_path": result["image_path"],
                "message": "内容导出成功"
            }
        else:
            raise HTTPException(status_code=500, detail="内容导出失败")

    except Exception as e:
        logging.error(f"内容导出失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"内容导出失败: {str(e)}")