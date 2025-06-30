"""
统一错误处理中间件

提供全局的异常捕获和错误响应格式化
"""

import logging
import traceback
from typing import Callable
from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from utils.response import error_response


# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VideoProcessingError(Exception):
    """视频处理相关错误"""
    def __init__(self, message: str, details: str = None):
        self.message = message
        self.details = details
        super().__init__(self.message)


class TranscriptionError(Exception):
    """转录相关错误"""
    def __init__(self, message: str, file_path: str = None):
        self.message = message
        self.file_path = file_path
        super().__init__(self.message)


class AIServiceError(Exception):
    """AI服务相关错误"""
    def __init__(self, message: str, service_type: str = None):
        self.message = message
        self.service_type = service_type
        super().__init__(self.message)


class ValidationError(Exception):
    """验证相关错误"""
    def __init__(self, message: str, details: dict = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """统一错误处理中间件"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            response = await call_next(request)
            return response
            
        except HTTPException as e:
            # FastAPI的HTTP异常
            logger.warning(f"HTTP异常: {e.status_code} - {e.detail}")
            return JSONResponse(
                status_code=e.status_code,
                content=error_response(
                    message=e.detail,
                    data={"status_code": e.status_code}
                ).dict()
            )
            
        except VideoProcessingError as e:
            # 视频处理错误
            logger.error(f"视频处理错误: {e.message}")
            return JSONResponse(
                status_code=422,
                content=error_response(
                    message=f"视频处理失败: {e.message}",
                    data={"details": e.details}
                ).dict()
            )
            
        except TranscriptionError as e:
            # 转录错误
            logger.error(f"转录错误: {e.message}")
            return JSONResponse(
                status_code=422,
                content=error_response(
                    message=f"转录失败: {e.message}",
                    data={"file_path": e.file_path}
                ).dict()
            )
            
        except AIServiceError as e:
            # AI服务错误
            logger.error(f"AI服务错误: {e.message}")
            return JSONResponse(
                status_code=503,
                content=error_response(
                    message=f"AI服务暂时不可用: {e.message}",
                    data={"service_type": e.service_type}
                ).dict()
            )
            
        except FileNotFoundError as e:
            # 文件不存在错误
            logger.error(f"文件不存在: {str(e)}")
            return JSONResponse(
                status_code=404,
                content=error_response(
                    message="请求的文件不存在",
                    data={"file_path": str(e)}
                ).dict()
            )
            
        except PermissionError as e:
            # 权限错误
            logger.error(f"权限错误: {str(e)}")
            return JSONResponse(
                status_code=403,
                content=error_response(
                    message="没有足够的权限访问该资源"
                ).dict()
            )
            
        except Exception as e:
            # 未预期的错误
            logger.error(f"未预期的错误: {str(e)}")
            logger.error(f"错误堆栈: {traceback.format_exc()}")
            
            return JSONResponse(
                status_code=500,
                content=error_response(
                    message="服务器内部错误，请稍后重试",
                    data={"error_type": type(e).__name__} if logger.level <= logging.DEBUG else None
                ).dict()
            )
