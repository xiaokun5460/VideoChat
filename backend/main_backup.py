import sys
import os
import logging
# 添加当前目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, UploadFile, File, HTTPException, Body, Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import tempfile
from datetime import datetime
from middleware.error_handler import ErrorHandlerMiddleware
from utils.response import success_response, error_response, streaming_response_wrapper
from services.stt_service import transcribe_audio, stop_transcription, is_file_being_transcribed, get_transcription_status
from services.ai_service import generate_summary, generate_mindmap, chat_with_model, generate_detailed_summary, generate_mindmap_image, generate_teaching_evaluation, export_content_to_image
from services.video_download_service import download_service
from models import (
    ChatMessage, ChatRequest, TranscriptionSegment, TranscriptionResponse,
    SummaryResponse, MindmapResponse, ChatResponse, DetailedSummaryResponse,
    MindmapImageResponse, DownloadProgressResponse, DownloadStartResponse,
    TranscribeDownloadedRequest, StopTranscribeResponse, CancelDownloadResponse,
    DownloadListResponse, DownloadAndTranscribeResponse, ExportRequest,
    ContentExportRequest, ContentExportResponse
)
import asyncio

# API文档配置
tags_metadata = [
    {
        "name": "文件处理",
        "description": "文件上传、音视频转录相关接口，支持多种格式的音视频文件处理",
    },
    {
        "name": "AI功能",
        "description": "基于AI的内容分析功能，包括文本总结、思维导图生成、智能对话等",
    },
    {
        "name": "视频下载",
        "description": "在线视频下载功能，支持YouTube、Bilibili等主流平台的视频下载",
    },
    {
        "name": "文件导出",
        "description": "处理结果导出功能，支持多种格式的文件导出和下载",
    },
]

app = FastAPI(
    title="VideoChat 音视频处理 API",
    description="""
    ## VideoChat - 音视频内容一键总结 AI 工具 🎥 ✨

    VideoChat 是一个强大的音视频内容处理工具，提供完整的中文化后端API接口。

    ### 核心功能模块

    * **音视频转录** 🎯 - 支持多种音视频格式，批量文件处理，实时转录进度显示
    * **AI内容总结** 📝 - 智能生成简单总结、详细总结和可视化思维导图
    * **智能对话助手** 💬 - 基于音视频转录内容的上下文智能对话
    * **在线视频下载** 📥 - 支持YouTube、Bilibili等主流平台的视频下载
    * **多格式文件导出** 💾 - 支持VTT字幕、SRT字幕、纯文本、Markdown等格式导出

    ### 技术特色

    * 🚀 异步处理架构，支持任务中断和恢复
    * 📡 流式数据响应，实时传输处理结果
    * 🛡️ 完整的错误处理和状态管理机制
    * 📦 支持批量文件处理和并发任务管理
    * 🎛️ 灵活的配置选项，支持CPU/GPU模式切换

    ### 使用说明

    所有接口均采用RESTful设计，支持JSON格式的请求和响应。
    部分接口支持流式响应，可实时获取处理进度和结果。
    """,
    version="1.0.0",
    contact={
        "name": "VideoChat 开发团队",
        "url": "https://github.com/Airmomo/VideoChat",
        "email": "support@videochat.ai"
    },
    license_info={
        "name": "MIT 开源许可证",
        "url": "https://opensource.org/licenses/MIT",
    },
    tags_metadata=tags_metadata,
)

# 添加静态文件服务
uploads_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
app.mount("/uploads", StaticFiles(directory=uploads_path), name="uploads")

# 添加错误处理中间件
app.add_middleware(ErrorHandlerMiddleware)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 添加一个变量来跟踪转录任务
transcription_task = None

# 健康检查端点
@app.get(
    "/api/health",
    tags=["系统"],
    summary="系统健康检查",
    description="检查系统状态和模型加载情况"
)
async def health_check():
    """系统健康检查"""
    from utils.model_manager import model_manager

    model_status = model_manager.get_status()

    return success_response(
        data={
            "status": "healthy",
            "model_status": model_status,
            "timestamp": datetime.now().isoformat()
        },
        message="系统运行正常"
    )

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

class DownloadRequest(BaseModel):
    """视频下载请求模型

    用于在线视频下载的请求参数
    """
    url: str  # 视频URL，支持YouTube、Bilibili等主流平台
    filename: Optional[str] = None  # 自定义文件名（可选）

    class Config:
        json_schema_extra = {
            "example": {
                "url": "https://www.youtube.com/watch?v=example",
                "filename": "AI讲座视频"
            }
        }

@app.post(
    "/api/upload",
    tags=["文件处理"],
    summary="上传音视频文件并开始转录",
    description="上传音视频文件到服务器，并自动开始转录处理。支持多种音视频格式，转录完成后返回带时间戳的文本内容。",
    response_model=TranscriptionResponse,
    responses={
        200: {
            "description": "文件上传并转录成功",
            "model": TranscriptionResponse
        },
        400: {
            "description": "文件格式不支持或转录失败",
            "content": {
                "application/json": {
                    "example": {"detail": "不支持的文件格式"}
                }
            }
        },
        499: {
            "description": "转录任务被中断",
            "content": {
                "application/json": {
                    "example": {"status": "interrupted", "detail": "转录被中断"}
                }
            }
        }
    }
)
async def upload_file(
    file: UploadFile = File(..., description="要上传的音视频文件，支持常见的音视频格式")
):
    """上传文件并开始转录"""
    global transcription_task

    # 验证文件
    if not file.filename:
        return error_response("文件名不能为空")

    # 检查文件扩展名
    allowed_extensions = {'.mp3', '.wav', '.m4a', '.mp4', '.avi', '.mov', '.mkv', '.flv'}
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        return error_response(f"不支持的文件格式: {file_ext}")

    try:
        # 保存上传的文件
        file_path = f"uploads/{file.filename}"
        os.makedirs("uploads", exist_ok=True)

        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # 直接调用转录函数，避免协程重用问题
        try:
            transcription = await transcribe_audio(file_path)

            return TranscriptionResponse(transcription=transcription)

        except asyncio.CancelledError:
            logging.warning(f"转录任务被取消: {file_path}")
            raise HTTPException(status_code=499, detail="转录任务被取消")

    except asyncio.CancelledError:
        # 返回特定的状态码和消息
        return JSONResponse(
            status_code=499,
            content={"status": "interrupted", "detail": "Transcription interrupted"}
        )
    except Exception as e:
        if transcription_task and not transcription_task.cancelled():
            transcription_task.cancel()
        transcription_task = None
        raise HTTPException(status_code=400, detail=str(e))

@app.post(
    "/api/summary",
    tags=["AI功能"],
    summary="生成文本内容总结",
    description="""
    基于输入的文本内容生成AI总结。支持流式和非流式两种响应模式。

    **功能特点：**
    - 🤖 使用先进的AI模型生成高质量总结
    - 📡 支持流式响应，实时获取生成进度
    - 📝 自动提取关键信息和要点
    - 🎯 适用于音视频转录内容的快速总结

    **使用场景：**
    - 音视频内容快速总结
    - 长文本内容要点提取
    - 会议记录自动整理
    """,
    response_model=SummaryResponse,
    responses={
        200: {
            "description": "总结生成成功",
            "content": {
                "application/json": {
                    "example": {"summary": "这是一段关于人工智能发展的总结..."},
                    "schema": {"$ref": "#/components/schemas/SummaryResponse"}
                },
                "text/plain": {
                    "description": "流式响应模式下的文本流",
                    "example": "这是一段关于人工智能发展的总结..."
                }
            }
        },
        400: {
            "description": "请求参数错误",
            "content": {
                "application/json": {
                    "example": {"detail": "文本内容不能为空"}
                }
            }
        },
        500: {
            "description": "AI服务内部错误",
            "content": {
                "application/json": {
                    "example": {"detail": "总结生成失败"}
                }
            }
        }
    }
)
async def get_summary(request: TextRequest):
    logging.info(f"🚀 收到总结请求 - stream: {request.stream}, text长度: {len(request.text)}")

    if request.stream:
        logging.info("📡 开始流式总结生成...")
        async def generate():
            chunk_count = 0
            async for chunk in generate_summary(request.text, stream=True):
                chunk_count += 1
                logging.info(f"📝 发送流式数据块 #{chunk_count}: {chunk[:50]}...")
                yield chunk
            logging.info(f"✅ 流式总结完成，共发送 {chunk_count} 个数据块")
        return StreamingResponse(generate(), media_type="text/plain")
    else:
        logging.info("📄 开始非流式总结生成...")
        # 非流式响应，返回完整内容
        result = ""
        async for chunk in generate_summary(request.text, stream=False):
            result += chunk
        logging.info(f"✅ 非流式总结完成，内容长度: {len(result)}")
        return {"summary": result}

@app.post(
    "/api/mindmap",
    tags=["AI功能"],
    summary="生成思维导图",
    description="""
    基于输入的文本内容生成结构化的思维导图JSON数据。

    **功能特点：**
    - 🧠 智能分析文本结构和逻辑关系
    - 🌳 生成层次化的思维导图结构
    - 📊 符合jsMind格式规范，可直接用于前端展示
    - 🎨 自动提取主题、子主题和关键点

    **使用场景：**
    - 学习笔记可视化
    - 会议内容结构化展示
    - 知识点梳理和整理
    - 复杂内容的逻辑关系分析
    """,
    response_model=MindmapResponse,
    responses={
        200: {
            "description": "思维导图生成成功",
            "model": MindmapResponse
        },
        400: {
            "description": "请求参数错误",
            "content": {
                "application/json": {
                    "example": {"detail": "文本内容不能为空"}
                }
            }
        },
        500: {
            "description": "思维导图生成失败",
            "content": {
                "application/json": {
                    "example": {"detail": "思维导图生成过程中发生错误"}
                }
            }
        }
    }
)
async def get_mindmap(request: TextRequest):
    try:
        mindmap_json = await generate_mindmap(request.text)
        return {"mindmap": mindmap_json}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post(
    "/api/mindmap-image",
    tags=["AI功能"],
    summary="生成思维导图图片",
    description="""
    基于输入的文本内容生成可视化的思维导图图片文件。

    **功能特点：**
    - 🎨 AI生成美观的HTML思维导图
    - 🖼️ 自动转换为高质量PNG图片
    - 📱 响应式设计，适配不同屏幕尺寸
    - 🎯 中文字体优化，显示效果佳
    - 🌈 现代化UI设计，包含渐变和阴影效果

    **使用场景：**
    - 制作演示文稿的思维导图
    - 生成可打印的学习资料
    - 社交媒体分享的可视化内容
    - 报告和文档中的图表插图

    **技术实现：**
    - 使用AI生成结构化HTML思维导图
    - 通过Playwright进行高质量截图
    - 自动保存到服务器并返回访问链接
    """,
    response_model=MindmapImageResponse,
    responses={
        200: {
            "description": "思维导图图片生成成功",
            "model": MindmapImageResponse
        },
        400: {
            "description": "请求参数错误",
            "content": {
                "application/json": {
                    "example": {"detail": "文本内容不能为空"}
                }
            }
        },
        500: {
            "description": "思维导图图片生成失败",
            "content": {
                "application/json": {
                    "example": {"detail": "图片生成过程中发生错误"}
                }
            }
        }
    }
)
async def get_mindmap_image(request: TextRequest):
    """
    生成思维导图图片接口

    接收文本内容，生成HTML格式的思维导图，然后转换为PNG图片文件
    """
    try:
        logging.info(f"🖼️ 收到思维导图图片生成请求: {request.text[:50]}...")

        if not request.text or not request.text.strip():
            logging.info("❌ 文本内容为空")
            raise HTTPException(status_code=400, detail="文本内容不能为空")

        logging.info("🔄 开始调用AI服务...")
        # 调用AI服务生成思维导图图片
        result = await generate_mindmap_image(request.text)

        logging.info(f"✅ 生成成功: {result['image_path']}")
        return {
            "image_path": result["image_path"],
            "image_url": result["image_url"]
        }

    except HTTPException:
        # 重新抛出HTTP异常
        raise
    except Exception as e:
        logging.info(f"❌ 思维导图图片生成接口错误: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"思维导图图片生成失败: {str(e)}")

@app.post(
    "/api/export-content-image",
    tags=["AI功能"],
    summary="内容导出为图片",
    description="""
    将Markdown内容转换为高质量的PNG图片。支持智能总结、教师评价、思维导图等多种内容类型。

    **功能特点：**
    - 支持Markdown格式内容
    - 自动适配不同内容类型的样式主题
    - 高质量图片输出，支持中文字体
    - 专业的排版和布局

    **支持的内容类型：**
    - summary: 智能总结
    - evaluation: 教师评价
    - mindmap: 思维导图
    """,
    response_model=ContentExportResponse,
    responses={
        200: {
            "description": "图片生成成功",
            "content": {
                "application/json": {
                    "example": {
                        "image_path": "/uploads/exports/summary_20231201_123456_abc12345.png",
                        "image_url": "/uploads/exports/summary_20231201_123456_abc12345.png"
                    }
                }
            }
        },
        400: {
            "description": "请求参数错误",
            "content": {
                "application/json": {
                    "example": {"detail": "内容不能为空"}
                }
            }
        },
        500: {
            "description": "图片生成失败",
            "content": {
                "application/json": {
                    "example": {"detail": "图片转换失败"}
                }
            }
        }
    }
)
async def export_content_image(request: ContentExportRequest):
    """
    内容导出为图片接口

    将Markdown内容转换为格式化的HTML并生成PNG图片文件
    """
    try:
        logging.info(f"🖼️ 收到内容导出请求: {request.content_type} - {request.title}")

        if not request.content or not request.content.strip():
            logging.info("❌ 内容为空")
            raise HTTPException(status_code=400, detail="内容不能为空")

        if not request.title or not request.title.strip():
            logging.info("❌ 标题为空")
            raise HTTPException(status_code=400, detail="标题不能为空")

        if request.content_type not in ['summary', 'evaluation', 'mindmap']:
            logging.info(f"❌ 不支持的内容类型: {request.content_type}")
            raise HTTPException(status_code=400, detail="不支持的内容类型")

        logging.info("🔄 开始调用内容导出服务...")
        # 调用AI服务生成图片
        result = await export_content_to_image(request.content, request.title, request.content_type)

        logging.info(f"✅ 内容导出成功: {result['image_url']}")
        return ContentExportResponse(
            image_path=result["image_path"],
            image_url=result["image_url"]
        )

    except HTTPException:
        # 重新抛出HTTP异常
        raise
    except Exception as e:
        logging.info(f"❌ 内容导出接口错误: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"内容导出失败: {str(e)}")

@app.post(
    "/api/chat",
    tags=["AI功能"],
    summary="智能对话助手",
    description="""
    基于音视频转录内容进行上下文相关的智能对话。支持流式和非流式响应。

    **功能特点：**
    - 💬 基于转录内容的上下文对话
    - 🧠 理解对话历史和语境
    - 📡 支持流式响应，实时对话体验
    - 🎯 针对音视频内容的专业问答

    **使用场景：**
    - 基于视频内容的问答
    - 学习内容的深入讨论
    - 会议记录的详细解释
    - 内容相关的知识扩展

    **参数说明：**
    - `messages`: 对话历史记录
    - `context`: 音视频转录的文本内容
    - `stream`: 是否使用流式响应
    """,
    response_model=ChatResponse,
    responses={
        200: {
            "description": "对话响应成功",
            "content": {
                "application/json": {
                    "example": {"response": "根据视频内容，这个问题的答案是..."},
                    "schema": {"$ref": "#/components/schemas/ChatResponse"}
                },
                "text/plain": {
                    "description": "流式响应模式下的文本流",
                    "example": "根据视频内容，这个问题的答案是..."
                }
            }
        },
        400: {
            "description": "请求参数错误",
            "content": {
                "application/json": {
                    "example": {"detail": "消息列表不能为空"}
                }
            }
        },
        500: {
            "description": "对话服务内部错误",
            "content": {
                "application/json": {
                    "example": {"detail": "对话生成失败"}
                }
            }
        }
    }
)
async def chat(request: ChatRequest):
    if request.stream:
        async def generate():
            async for chunk in chat_with_model(request.messages, request.context, stream=True):
                yield chunk
        return StreamingResponse(generate(), media_type="text/plain")
    else:
        # 非流式响应，返回完整内容
        result = ""
        async for chunk in chat_with_model(request.messages, request.context, stream=False):
            result += chunk
        return {"response": result}

@app.post(
    "/api/detailed-summary",
    tags=["AI功能"],
    summary="生成详细总结",
    description="""
    基于输入的文本内容生成详细的Markdown格式总结。支持流式和非流式响应。

    **功能特点：**
    - 📝 生成结构化的详细总结
    - 🎨 使用Markdown格式，支持标题、列表、强调等
    - 📡 支持流式响应，实时查看生成过程
    - 🔍 深入分析内容细节和要点
    - 📊 包含章节划分和逻辑结构

    **使用场景：**
    - 学术内容的详细分析
    - 会议记录的完整整理
    - 教学视频的知识点梳理
    - 复杂内容的深度解读

    **输出格式：**
    - Markdown格式文本
    - 包含标题层级结构
    - 自动生成要点列表
    - 支持代码块和引用
    """,
    response_model=DetailedSummaryResponse,
    responses={
        200: {
            "description": "详细总结生成成功",
            "content": {
                "application/json": {
                    "example": {"detailed_summary": "# 详细总结\n\n## 主要内容\n\n这是一段详细的总结..."},
                    "schema": {"$ref": "#/components/schemas/DetailedSummaryResponse"}
                },
                "text/plain": {
                    "description": "流式响应模式下的Markdown文本流",
                    "example": "# 详细总结\n\n## 主要内容\n\n这是一段详细的总结..."
                }
            }
        },
        400: {
            "description": "请求参数错误",
            "content": {
                "application/json": {
                    "example": {"detail": "文本内容不能为空"}
                }
            }
        },
        500: {
            "description": "详细总结生成失败",
            "content": {
                "application/json": {
                    "example": {"detail": "详细总结生成过程中发生错误"}
                }
            }
        }
    }
)
async def get_detailed_summary(request: TextRequest):
    logging.info(f"🚀 收到详细总结请求 - stream: {request.stream}, text长度: {len(request.text)}")

    if request.stream:
        logging.info("📡 开始流式详细总结生成...")
        async def generate():
            chunk_count = 0
            async for chunk in generate_detailed_summary(request.text, stream=True):
                chunk_count += 1
                logging.info(f"📝 发送详细总结流式数据块 #{chunk_count}: {chunk[:50]}...")
                yield chunk
            logging.info(f"✅ 流式详细总结完成，共发送 {chunk_count} 个数据块")
        return StreamingResponse(generate(), media_type="text/plain")
    else:
        logging.info("📄 开始非流式详细总结生成...")
        # 非流式响应，返回完整内容
        result = ""
        async for chunk in generate_detailed_summary(request.text, stream=False):
            result += chunk
        logging.info(f"✅ 非流式详细总结完成，内容长度: {len(result)}")
        return {"detailed_summary": result}

@app.post(
    "/api/ai/evaluate-teaching",
    tags=["AI功能"],
    summary="生成智能教学评价",
    description="""
    基于转录内容生成专业的教学评价报告。

    **8个专业评价维度：**
    - 🚀 课堂导入 - 导入方式是否新颖有趣，能否激发学习兴趣
    - 🎯 课程重点 - 重点是否明确突出，讲解是否充分到位
    - 💡 课程难点 - 难点识别是否准确，突破方法是否有效
    - 🏗️ 课堂设计 - 教学环节设计是否合理，时间分配是否恰当
    - 🔍 内容讲解深度 - 知识点讲解是否深入透彻，理论阐述是否清晰
    - 📚 内容讲解广度 - 知识面覆盖是否全面，内容是否丰富完整
    - 🌟 知识延伸 - 是否进行适当拓展，联系实际培养发散思维
    - 📝 课堂总结 - 是否有明确小结，突出重点梳理知识脉络

    **输出格式：**
    - 📊 8个维度详细分析和评分
    - ✅ 具体的优点和改进建议
    - 🏆 综合评分（满分100分）
    - 📝 专业Markdown格式输出

    **支持流式和非流式响应**
    """,
    response_model=None,
    responses={
        200: {
            "description": "成功生成教学评价",
            "content": {
                "application/json": {
                    "example": {
                        "evaluation": "# 教学评价报告\n\n## 课程导入\n..."
                    }
                },
                "text/plain": {
                    "example": "# 教学评价报告\n\n## 课程导入\n..."
                }
            }
        }
    }
)
async def get_teaching_evaluation(request: TextRequest):
    logging.info(f"🚀 收到教学评价请求 - stream: {request.stream}, text长度: {len(request.text)}")

    if request.stream:
        logging.info("📡 开始流式教学评价生成...")
        async def generate():
            chunk_count = 0
            async for chunk in generate_teaching_evaluation(request.text, stream=True):
                chunk_count += 1
                logging.info(f"📝 发送教学评价流式数据块 #{chunk_count}: {chunk[:50]}...")
                yield chunk
            logging.info(f"✅ 流式教学评价完成，共发送 {chunk_count} 个数据块")
        return StreamingResponse(generate(), media_type="text/plain")
    else:
        logging.info("📄 开始非流式教学评价生成...")
        # 非流式响应，返回完整内容
        result = ""
        async for chunk in generate_teaching_evaluation(request.text, stream=False):
            result += chunk
        logging.info(f"✅ 非流式教学评价完成，内容长度: {len(result)}")
        return {"evaluation": result}

@app.post(
    "/api/export/summary",
    tags=["文件导出"],
    summary="导出总结为Markdown文件",
    description="""
    将AI生成的总结内容导出为Markdown格式文件并下载。

    **功能特点：**
    - 📝 支持Markdown格式导出
    - 📁 自动生成带时间戳的文件名
    - 💾 直接下载到本地
    - 🎨 保持Markdown格式和样式

    **文件格式：**
    - 格式：Markdown (.md)
    - 编码：UTF-8
    - 命名规则：summary_YYYYMMDD_HHMMSS.md

    **使用场景：**
    - 📚 保存AI总结结果
    - 📄 创建文档备份
    - 📤 分享总结内容
    - 📋 离线查看和编辑
    """,
    responses={
        200: {
            "description": "成功导出Markdown文件",
            "content": {
                "text/markdown": {
                    "example": "# 总结内容\n\n这是AI生成的总结..."
                }
            },
            "headers": {
                "Content-Disposition": {
                    "description": "文件下载头，包含文件名",
                    "schema": {"type": "string", "example": "attachment; filename=summary_20231225_143022.md"}
                }
            }
        },
        400: {
            "description": "请求参数错误",
            "content": {
                "application/json": {
                    "example": {"detail": "总结内容不能为空"}
                }
            }
        },
        500: {
            "description": "文件导出失败",
            "content": {
                "application/json": {
                    "example": {"detail": "文件创建失败"}
                }
            }
        }
    }
)
async def export_summary(
    summary: str = Body(..., description="要导出的总结内容，支持Markdown格式")
):
    try:
        # 生成文件名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"summary_{timestamp}.md"
        
        # 创建临时文件
        with tempfile.NamedTemporaryFile(delete=False, suffix=".md") as temp_file:
            temp_file.write(summary.encode('utf-8'))
            temp_file.flush()
            
            return FileResponse(
                path=temp_file.name,
                filename=filename,
                media_type="text/markdown",
                background=None
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def generate_vtt(transcription):
    vtt_content = "WEBVTT\n\n"
    for segment in transcription:
        start = format_timestamp(segment['start'])
        end = format_timestamp(segment['end'])
        vtt_content += f"{start} --> {end}\n{segment['text']}\n\n"
    return vtt_content

def generate_srt(transcription):
    srt_content = ""
    for i, segment in enumerate(transcription, 1):
        start = format_timestamp(segment['start'], srt=True)
        end = format_timestamp(segment['end'], srt=True)
        srt_content += f"{i}\n{start} --> {end}\n{segment['text']}\n\n"
    return srt_content

def generate_txt(transcription):
    return "\n".join(segment['text'] for segment in transcription)

def format_timestamp(seconds, srt=False):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    msecs = int((seconds - int(seconds)) * 1000)
    
    if srt:
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{msecs:03d}"
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{msecs:03d}"

@app.post(
    "/api/export/{format}",
    tags=["文件导出"],
    summary="导出转录内容为指定格式",
    description="""
    将音视频转录结果导出为指定格式的文件并下载。支持多种主流字幕和文本格式。

    **支持的导出格式：**
    - 🎬 **VTT** - WebVTT字幕格式，支持网页播放器
    - 📺 **SRT** - SubRip字幕格式，通用性最强
    - 📝 **TXT** - 纯文本格式，仅包含文字内容

    **格式特点对比：**

    | 格式 | 时间戳 | 兼容性 | 用途 |
    |------|--------|--------|------|
    | VTT  | ✅ 精确 | 网页播放器 | 在线视频字幕 |
    | SRT  | ✅ 精确 | 几乎所有播放器 | 通用字幕文件 |
    | TXT  | ❌ 无 | 所有文本编辑器 | 纯文本阅读 |

    **文件命名规则：**
    - 格式：transcription_YYYYMMDD_HHMMSS.{format}
    - 编码：UTF-8
    - 时间戳：精确到毫秒

    **使用场景：**
    - 🎥 为视频添加字幕
    - 📚 创建学习笔记
    - 📄 生成会议记录
    - 🔍 文本搜索和分析
    """,
    responses={
        200: {
            "description": "成功导出指定格式文件",
            "content": {
                "text/vtt": {
                    "description": "WebVTT字幕文件",
                    "example": "WEBVTT\n\n00:00:00.000 --> 00:00:05.200\n大家好，欢迎来到今天的讲座\n\n"
                },
                "application/x-subrip": {
                    "description": "SRT字幕文件",
                    "example": "1\n00:00:00,000 --> 00:00:05,200\n大家好，欢迎来到今天的讲座\n\n"
                },
                "text/plain": {
                    "description": "纯文本文件",
                    "example": "大家好，欢迎来到今天的讲座\n今天我们要讨论的主题是人工智能的发展"
                }
            },
            "headers": {
                "Content-Disposition": {
                    "description": "文件下载头，包含文件名",
                    "schema": {"type": "string", "example": "attachment; filename=transcription_20231225_143022.vtt"}
                }
            }
        },
        400: {
            "description": "请求参数错误",
            "content": {
                "application/json": {
                    "examples": {
                        "no_data": {
                            "summary": "缺少转录数据",
                            "value": {"detail": "No transcription data provided"}
                        },
                        "unsupported_format": {
                            "summary": "不支持的格式",
                            "value": {"detail": "Unsupported format"}
                        }
                    }
                }
            }
        },
        500: {
            "description": "文件导出失败",
            "content": {
                "application/json": {
                    "example": {"detail": "文件生成过程中发生错误"}
                }
            }
        }
    }
)
async def export_transcription(
    format: str = Path(
        ...,
        description="导出格式",
        regex="^(vtt|srt|txt)$",
        example="vtt"
    ),
    transcription: List[dict] = Body(
        ...,
        description="转录数据列表，包含时间戳和文本内容",
        example=[
            {"start": 0.0, "end": 5.2, "text": "大家好，欢迎来到今天的讲座"},
            {"start": 5.2, "end": 12.8, "text": "今天我们要讨论的主题是人工智能的发展"}
        ]
    )
):
    if not transcription:
        raise HTTPException(status_code=400, detail="No transcription data provided")
    
    try:
        # 创建临时文件
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{format}") as temp_file:
            content = ""
            if format == "vtt":
                content = generate_vtt(transcription)
                mime_type = "text/vtt"
            elif format == "srt":
                content = generate_srt(transcription)
                mime_type = "application/x-subrip"
            elif format == "txt":
                content = generate_txt(transcription)
                mime_type = "text/plain"
            else:
                raise HTTPException(status_code=400, detail="Unsupported format")
            
            temp_file.write(content.encode('utf-8'))
            temp_file.flush()
            
            # 生成文件名
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"transcription_{timestamp}.{format}"
            
            # 返回文件
            return FileResponse(
                path=temp_file.name,
                filename=filename,
                media_type=mime_type,
                background=None  # 立即发送文件
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post(
    "/api/transcribe-downloaded",
    tags=["文件处理"],
    summary="转录已下载的文件",
    description="对已经下载到服务器的音视频文件进行转录处理。通常用于转录通过视频下载功能获取的文件。",
    response_model=TranscriptionResponse,
    responses={
        200: {
            "description": "文件转录成功",
            "model": TranscriptionResponse
        },
        400: {
            "description": "请求参数错误或文件路径无效",
            "content": {
                "application/json": {
                    "example": {"detail": "缺少文件名或文件路径"}
                }
            }
        },
        404: {
            "description": "指定的文件不存在",
            "content": {
                "application/json": {
                    "example": {"detail": "文件不存在"}
                }
            }
        },
        499: {
            "description": "转录任务被中断",
            "content": {
                "application/json": {
                    "example": {"status": "interrupted", "detail": "转录被中断"}
                }
            }
        }
    }
)
async def transcribe_downloaded_file(request: TranscribeDownloadedRequest):
    """转录已下载的文件"""
    global transcription_task

    filename = request.filename
    file_path = request.file_path

    if not filename or not file_path:
        return error_response("缺少文件名或文件路径")

    # 确保文件路径安全
    if not file_path.startswith("uploads/"):
        return error_response("无效的文件路径")

    # 检查文件是否存在
    if not os.path.exists(file_path):
        return error_response("文件不存在")

    try:
        # 创建转录任务
        transcription_task = asyncio.create_task(transcribe_audio(file_path))
        try:
            transcription = await transcription_task
            transcription_task = None

            return TranscriptionResponse(transcription=transcription)

        except asyncio.CancelledError:
            if transcription_task and not transcription_task.cancelled():
                transcription_task.cancel()
            transcription_task = None
            return JSONResponse(
                status_code=499,
                content={"status": "interrupted", "detail": "Transcription interrupted"}
            )

    except asyncio.CancelledError:
        return JSONResponse(
            status_code=499,
            content={"status": "interrupted", "detail": "Transcription interrupted"}
        )
    except Exception as e:
        if transcription_task and not transcription_task.cancelled():
            transcription_task.cancel()
        transcription_task = None
        raise HTTPException(status_code=400, detail=str(e))

@app.post(
    "/api/stop-transcribe",
    tags=["文件处理"],
    summary="停止正在进行的转录任务",
    description="中断当前正在执行的音视频转录任务。如果没有正在进行的转录任务，则返回相应提示。",
    response_model=StopTranscribeResponse,
    responses={
        200: {
            "description": "转录任务已成功停止",
            "model": StopTranscribeResponse
        },
        500: {
            "description": "停止转录时发生内部错误",
            "content": {
                "application/json": {
                    "example": {"detail": "停止转录失败"}
                }
            }
        }
    }
)
async def stop_transcribe():
    """停止当前转录任务"""
    global transcription_task
    try:
        # 使用新的异步停止接口
        success = await stop_transcription()

        if transcription_task and not transcription_task.cancelled():
            # 取消正在进行的转录任务
            transcription_task.cancel()
            try:
                await asyncio.wait_for(transcription_task, timeout=0.5)
            except (asyncio.TimeoutError, asyncio.CancelledError):
                pass
            transcription_task = None

        return success_response(
            data={"stopped": success},
            message="转录已停止" if success else "没有正在进行的转录任务"
        )
    except Exception as e:
        return error_response(f"停止转录失败: {str(e)}")

# 视频下载相关API端点
@app.post(
    "/api/download-video",
    tags=["视频下载"],
    summary="开始下载在线视频",
    description="""
    从支持的在线平台下载视频文件到服务器。支持多个主流视频平台。

    **支持的平台：**
    - 🎬 YouTube - 全球最大的视频平台
    - 📺 Bilibili - 中国领先的视频弹幕网站
    - 🎥 其他主流视频平台（通过yt-dlp支持）

    **功能特点：**
    - 🚀 异步下载，不阻塞其他操作
    - 📊 实时进度跟踪
    - 🎯 自动格式选择和质量优化
    - 📁 自定义文件名支持
    - ⏸️ 支持任务暂停和取消

    **使用流程：**
    1. 提交下载请求，获得任务ID
    2. 使用任务ID查询下载进度
    3. 下载完成后可进行转录处理
    """,
    response_model=DownloadStartResponse,
    responses={
        200: {
            "description": "下载任务成功启动",
            "model": DownloadStartResponse
        },
        400: {
            "description": "请求参数错误",
            "content": {
                "application/json": {
                    "example": {"detail": "URL不能为空"}
                }
            }
        },
        500: {
            "description": "下载服务内部错误",
            "content": {
                "application/json": {
                    "example": {"detail": "启动下载失败: 不支持的视频平台"}
                }
            }
        }
    }
)
async def download_video(request: DownloadRequest):
    try:
        if not request.url.strip():
            raise HTTPException(status_code=400, detail="URL不能为空")

        # 开始下载
        task_id = download_service.start_download(request.url, request.filename)

        return {
            "task_id": task_id,
            "message": "下载任务已开始",
            "url": request.url
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"启动下载失败: {str(e)}")

@app.get(
    "/api/download-progress/{task_id}",
    tags=["视频下载"],
    summary="获取下载进度",
    description="""
    根据任务ID查询视频下载的实时进度信息。

    **进度状态说明：**
    - 📋 `pending` - 任务已创建，等待开始下载
    - 📥 `downloading` - 正在下载中，包含进度百分比
    - ✅ `completed` - 下载完成，文件已保存
    - ❌ `failed` - 下载失败，包含错误信息
    - ⏹️ `cancelled` - 任务被用户取消

    **返回信息：**
    - 任务ID和当前状态
    - 下载进度百分比（0-100）
    - 文件名和保存路径
    - 错误信息（如果失败）

    **轮询建议：**
    建议每2-5秒查询一次进度，避免过于频繁的请求。
    """,
    response_model=DownloadProgressResponse,
    responses={
        200: {
            "description": "成功获取下载进度",
            "model": DownloadProgressResponse
        },
        404: {
            "description": "下载任务不存在",
            "content": {
                "application/json": {
                    "example": {"detail": "下载任务不存在"}
                }
            }
        },
        500: {
            "description": "获取进度失败",
            "content": {
                "application/json": {
                    "example": {"detail": "获取下载进度失败: 服务器内部错误"}
                }
            }
        }
    }
)
async def get_download_progress(
    task_id: str = Path(..., description="下载任务的唯一标识符")
):
    try:
        progress = download_service.get_download_progress(task_id)
        if progress is None:
            raise HTTPException(status_code=404, detail="下载任务不存在")

        return progress
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取下载进度失败: {str(e)}")

@app.post(
    "/api/cancel-download/{task_id}",
    tags=["视频下载"],
    summary="取消下载任务",
    description="""
    取消正在进行或等待中的视频下载任务。

    **适用状态：**
    - 📋 `pending` - 可以取消等待中的任务
    - 📥 `downloading` - 可以中断正在下载的任务

    **不适用状态：**
    - ✅ `completed` - 已完成的任务无法取消
    - ❌ `failed` - 已失败的任务无需取消
    - ⏹️ `cancelled` - 已取消的任务

    **操作结果：**
    - 成功取消：返回确认消息和任务ID
    - 任务不存在：返回404错误
    - 无法取消：返回相应错误信息

    **注意事项：**
    取消操作是不可逆的，已下载的部分文件将被清理。
    """,
    response_model=CancelDownloadResponse,
    responses={
        200: {
            "description": "下载任务成功取消",
            "model": CancelDownloadResponse
        },
        404: {
            "description": "下载任务不存在",
            "content": {
                "application/json": {
                    "example": {"detail": "下载任务不存在"}
                }
            }
        },
        500: {
            "description": "取消下载失败",
            "content": {
                "application/json": {
                    "example": {"detail": "取消下载失败: 任务正在清理中"}
                }
            }
        }
    }
)
async def cancel_download(
    task_id: str = Path(..., description="要取消的下载任务ID")
):
    try:
        success = download_service.cancel_download(task_id)
        if not success:
            raise HTTPException(status_code=404, detail="下载任务不存在")

        return {"message": "下载任务已取消", "task_id": task_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"取消下载失败: {str(e)}")

@app.get(
    "/api/downloads",
    tags=["视频下载"],
    summary="获取所有下载任务",
    description="""
    获取系统中所有下载任务的列表和状态信息。

    **返回信息：**
    - 📋 所有任务的完整列表
    - 📊 每个任务的详细状态
    - 📁 文件名和下载进度
    - ⏰ 任务创建和完成时间

    **任务状态包括：**
    - `pending` - 等待开始
    - `downloading` - 下载中
    - `completed` - 已完成
    - `failed` - 下载失败
    - `cancelled` - 已取消

    **使用场景：**
    - 📈 监控下载队列状态
    - 🔍 查找历史下载记录
    - 📊 统计下载成功率
    - 🧹 清理失败或取消的任务
    """,
    response_model=DownloadListResponse,
    responses={
        200: {
            "description": "成功获取下载任务列表",
            "model": DownloadListResponse
        },
        500: {
            "description": "获取下载列表失败",
            "content": {
                "application/json": {
                    "example": {"detail": "获取下载列表失败: 数据库连接错误"}
                }
            }
        }
    }
)
async def get_all_downloads():
    try:
        downloads = download_service.get_all_downloads()
        return {"downloads": downloads}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取下载列表失败: {str(e)}")

@app.post(
    "/api/download-and-transcribe",
    tags=["视频下载"],
    summary="下载视频并自动转录",
    description="""
    一站式服务：下载在线视频并自动进行音频转录。

    **工作流程：**
    1. 🎬 开始下载指定URL的视频
    2. ⏳ 等待下载完成（最长5分钟）
    3. 🎵 自动提取音频并开始转录
    4. 📝 返回完整的转录结果

    **功能特点：**
    - 🔄 全自动化流程，无需手动干预
    - ⏱️ 智能超时控制，避免长时间等待
    - 🎯 支持任务中断和恢复
    - 📊 实时状态反馈

    **超时处理：**
    - 下载超时：5分钟
    - 转录可中断：支持取消操作

    **适用场景：**
    - 🎓 在线课程内容转录
    - 📺 视频会议记录整理
    - 🎤 播客内容文字化
    - 📰 新闻视频快速摘要
    """,
    response_model=DownloadAndTranscribeResponse,
    responses={
        200: {
            "description": "下载和转录成功完成",
            "model": DownloadAndTranscribeResponse
        },
        400: {
            "description": "请求参数错误或下载被取消",
            "content": {
                "application/json": {
                    "examples": {
                        "empty_url": {
                            "summary": "URL为空",
                            "value": {"detail": "URL不能为空"}
                        },
                        "cancelled": {
                            "summary": "下载被取消",
                            "value": {"detail": "下载被取消"}
                        }
                    }
                }
            }
        },
        404: {
            "description": "下载任务不存在",
            "content": {
                "application/json": {
                    "example": {"detail": "下载任务不存在"}
                }
            }
        },
        499: {
            "description": "转录任务被中断",
            "content": {
                "application/json": {
                    "example": {"status": "interrupted", "detail": "转录被中断"}
                }
            }
        },
        500: {
            "description": "下载或转录过程中发生错误",
            "content": {
                "application/json": {
                    "examples": {
                        "download_failed": {
                            "summary": "下载失败",
                            "value": {"detail": "下载失败: 视频不存在或无法访问"}
                        },
                        "file_path_error": {
                            "summary": "文件路径错误",
                            "value": {"detail": "无法获取下载的文件路径"}
                        }
                    }
                }
            }
        }
    }
)
async def download_and_transcribe(request: DownloadRequest):
    global transcription_task
    try:
        if not request.url.strip():
            raise HTTPException(status_code=400, detail="URL不能为空")

        # 开始下载
        task_id = download_service.start_download(request.url, request.filename)

        # 等待下载完成
        max_wait_time = 300  # 最大等待5分钟
        wait_interval = 2    # 每2秒检查一次
        waited_time = 0

        while waited_time < max_wait_time:
            progress = download_service.get_download_progress(task_id)
            if not progress:
                raise HTTPException(status_code=404, detail="下载任务不存在")

            if progress['status'] == 'completed':
                # 下载完成，获取文件路径并开始转录
                file_path = download_service.get_downloaded_file_path(task_id)
                if not file_path:
                    raise HTTPException(status_code=500, detail="无法获取下载的文件路径")

                # 开始转录
                transcription_task = asyncio.create_task(transcribe_audio(file_path))
                try:
                    transcription = await transcription_task
                    transcription_task = None

                    return {
                        "task_id": task_id,
                        "file_path": file_path,
                        "filename": progress['filename'],
                        "transcription": transcription,
                        "message": "下载和转录完成"
                    }
                except asyncio.CancelledError:
                    if not transcription_task.cancelled():
                        transcription_task.cancel()
                    transcription_task = None
                    return JSONResponse(
                        status_code=499,
                        content={"status": "interrupted", "detail": "转录被中断"}
                    )

            elif progress['status'] == 'failed':
                raise HTTPException(status_code=500, detail=f"下载失败: {progress.get('error_message', '未知错误')}")

            elif progress['status'] == 'cancelled':
                raise HTTPException(status_code=400, detail="下载被取消")

            # 等待一段时间后再检查
            await asyncio.sleep(wait_interval)
            waited_time += wait_interval

        # 超时
        download_service.cancel_download(task_id)
        raise HTTPException(status_code=408, detail="下载超时")

    except HTTPException:
        raise
    except Exception as e:
        if transcription_task and not transcription_task.cancelled():
            transcription_task.cancel()
        transcription_task = None
        raise HTTPException(status_code=500, detail=f"下载和转录失败: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)