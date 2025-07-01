"""
VideoChat 新架构主应用

基于重构后的Service和API架构的主应用入口
"""

import sys
import os
import logging

# 添加当前目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# 导入核心模块
from core.config import settings, create_upload_dir
from core.exceptions import VideoChateException
from core.response import response_manager

# 导入中间件
from middleware.error_handler import ErrorHandlerMiddleware

# 导入新的API路由
from api import (
    files_router, tasks_router, transcriptions_router,
    ai_router, system_router, progress_router
)

# 配置日志
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# API文档配置
tags_metadata = [
    {
        "name": "文件管理",
        "description": "文件上传、下载、管理功能",
    },
    {
        "name": "任务管理", 
        "description": "异步任务创建、监控、管理功能",
    },
    {
        "name": "转录结果",
        "description": "音频转录结果管理和导出功能",
    },
    {
        "name": "AI服务",
        "description": "AI内容分析、总结、对话功能",
    },
    {
        "name": "系统管理",
        "description": "系统健康检查、监控、配置管理功能",
    },
]

# 创建FastAPI应用
app = FastAPI(
    title=settings.app_name,
    description=f"""
    ## {settings.app_name} - 音视频内容处理API 🎥 ✨

    {settings.app_name} 是一个现代化的音视频内容处理平台，提供完整的文件管理、转录、AI分析功能。

    ### 🚀 核心特性

    #### 📁 文件管理
    - **智能上传**: 支持多种音视频格式，自动类型检测和验证
    - **安全存储**: 文件哈希校验，防重复上传
    - **灵活管理**: 文件标签、描述、状态管理
    - **快速检索**: 支持分页、筛选、搜索功能

    #### ⚡ 异步任务系统
    - **并发处理**: 智能任务调度，支持多任务并发
    - **实时监控**: SSE流式进度推送，实时状态更新
    - **任务控制**: 支持任务取消、重试、清理
    - **类型丰富**: 转录、AI处理、下载、导出等多种任务类型

    #### 🎤 音频转录
    - **高精度转录**: 基于Whisper模型的高质量转录
    - **多语言支持**: 自动语言检测和多语言转录
    - **格式导出**: 支持TXT、SRT、VTT、JSON多种格式
    - **时间轴精确**: 精确到毫秒的时间轴信息

    #### 🤖 AI内容分析
    - **智能总结**: 普通总结和详细分析总结
    - **思维导图**: 自动生成结构化思维导图
    - **智能对话**: 基于内容的AI助手对话
    - **教学评估**: 专业的教学内容质量评估

    #### 🔧 系统管理
    - **健康监控**: 实时系统和服务状态监控
    - **性能统计**: 详细的使用统计和性能指标
    - **配置管理**: 灵活的系统配置和参数调整
    - **自动优化**: 定期清理和性能优化

    ### 📋 API模块

    **文件管理** (`/api/files`)
    - 文件上传、下载、删除
    - 文件信息管理和检索
    - 文件统计和分析

    **任务管理** (`/api/tasks`)
    - 异步任务创建和管理
    - 实时进度跟踪
    - 任务结果获取

    **转录结果** (`/api/transcriptions`)
    - 转录结果查询和管理
    - 多格式导出功能
    - 转录统计分析

    **AI服务** (`/api/ai`)
    - 内容总结和分析
    - 思维导图生成
    - 智能对话助手

    **系统管理** (`/api/system`)
    - 系统健康检查
    - 性能监控和统计
    - 配置信息查询

    ### 🎯 技术特点

    - **现代架构**: 基于FastAPI的高性能异步架构
    - **类型安全**: 完整的Pydantic模型和类型注解
    - **标准化**: 统一的API响应格式和错误处理
    - **可扩展**: 模块化设计，易于扩展新功能
    - **高性能**: 异步处理，支持高并发访问

    """,
    version=settings.app_version,
    openapi_tags=tags_metadata,
    docs_url="/docs",
    redoc_url="/redoc"
)

# 创建上传目录
create_upload_dir()

# 添加静态文件服务
if os.path.exists(settings.upload_dir):
    app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

# 添加错误处理中间件
app.add_middleware(ErrorHandlerMiddleware)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册API路由
app.include_router(files_router)
app.include_router(tasks_router)
app.include_router(transcriptions_router)
app.include_router(ai_router)
app.include_router(system_router)

# 全局异常处理器
@app.exception_handler(VideoChateException)
async def videochat_exception_handler(request, exc: VideoChateException):
    """处理自定义异常"""
    return response_manager.error(
        message=exc.message,
        code=exc.code,
        data=exc.data,
        status_code=exc.status_code
    )

# 根路径
@app.get("/", tags=["根路径"])
async def root():
    """API根路径"""
    return response_manager.success(
        data={
            "name": settings.app_name,
            "version": settings.app_version,
            "description": "音视频内容处理API",
            "documentation": "/docs",
            "health_check": "/api/system/health",
            "modules": {
                "files": "/api/files",
                "tasks": "/api/tasks", 
                "transcriptions": "/api/transcriptions",
                "ai": "/api/ai",
                "system": "/api/system"
            },
            "features": [
                "文件上传和管理",
                "异步任务处理",
                "音频转录",
                "AI内容分析",
                "实时进度跟踪",
                "多格式导出"
            ]
        },
        message=f"{settings.app_name} API 服务正常运行"
    )

# 启动事件
@app.on_event("startup")
async def startup_event():
    """应用启动事件"""
    logging.info(f"{settings.app_name} v{settings.app_version} 启动中...")
    logging.info(f"调试模式: {settings.debug}")
    logging.info(f"上传目录: {settings.upload_dir}")
    logging.info(f"最大文件大小: {settings.max_file_size // (1024 * 1024)}MB")
    logging.info(f"AI服务: {'已配置' if settings.openai_api_key else '未配置'}")
    
    # 初始化数据库
    try:
        from database.connection import init_database
        init_database()
        logging.info("✅ 数据库初始化成功")
    except Exception as e:
        logging.error(f"❌ 数据库初始化失败: {str(e)}")
    
    logging.info("所有服务已就绪")

# 关闭事件
@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭事件"""
    logging.info(f"{settings.app_name} 正在关闭...")
    # 这里可以添加清理逻辑
    logging.info("应用已关闭")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )
