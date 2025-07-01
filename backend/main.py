import sys
import os
import logging
# 添加当前目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from middleware.error_handler import ErrorHandlerMiddleware

# 导入所有路由模块
from routers import (
    system_router, file_router, ai_router, ai_extended_router,
    download_router, export_router
)

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
    {
        "name": "系统",
        "description": "系统监控和健康检查相关接口",
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

# 注册所有路由
app.include_router(system_router)
app.include_router(file_router)
app.include_router(ai_router)
app.include_router(ai_extended_router)
app.include_router(download_router)
app.include_router(export_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)