"""
结构化日志系统

提供统一的结构化日志记录功能，支持多种输出格式和日志级别
"""

import logging
import json
import time
import traceback
from typing import Dict, Any, Optional, Union
from datetime import datetime
from pathlib import Path
from enum import Enum
# 移除不必要的导入


class LogLevel(Enum):
    """日志级别枚举"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class LogCategory(Enum):
    """日志分类枚举"""
    SYSTEM = "system"
    API = "api"
    TRANSCRIPTION = "transcription"
    DOWNLOAD = "download"
    CACHE = "cache"
    PERFORMANCE = "performance"
    SECURITY = "security"
    USER = "user"


class StructuredLogger:
    """结构化日志记录器"""
    
    def __init__(self, name: str = "videochat"):
        self.name = name
        self.logger = logging.getLogger(name)
        self._setup_logger()
        self._request_id = None
        self._user_id = None
    
    def _setup_logger(self):
        """设置日志记录器"""
        from config import LOG_LEVEL

        # 设置日志级别
        log_level = getattr(logging, LOG_LEVEL, logging.INFO)
        self.logger.setLevel(log_level)
        
        # 清除现有处理器
        self.logger.handlers.clear()
        
        # 控制台处理器
        console_handler = logging.StreamHandler()
        console_handler.setLevel(log_level)
        console_formatter = StructuredFormatter(include_colors=True)
        console_handler.setFormatter(console_formatter)
        self.logger.addHandler(console_handler)
        
        # 文件处理器（如果配置了日志文件）
        from config import LOG_FILE_PATH, LOG_TO_FILE
        if LOG_TO_FILE:
            log_path = Path(LOG_FILE_PATH)
            log_path.parent.mkdir(parents=True, exist_ok=True)

            file_handler = logging.FileHandler(log_path, encoding='utf-8')
            file_handler.setLevel(log_level)
            file_formatter = StructuredFormatter(include_colors=False)
            file_handler.setFormatter(file_formatter)
            self.logger.addHandler(file_handler)
        
        # 防止重复日志
        self.logger.propagate = False
    
    def set_context(self, request_id: str = None, user_id: str = None):
        """设置日志上下文"""
        self._request_id = request_id
        self._user_id = user_id
    
    def _create_log_record(
        self,
        level: LogLevel,
        message: str,
        category: LogCategory = LogCategory.SYSTEM,
        extra_data: Optional[Dict[str, Any]] = None,
        exception: Optional[Exception] = None
    ) -> Dict[str, Any]:
        """创建日志记录"""
        record = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": level.value,
            "category": category.value,
            "message": message,
            "logger": self.name
        }
        
        # 添加上下文信息
        if self._request_id:
            record["request_id"] = self._request_id
        
        if self._user_id:
            record["user_id"] = self._user_id
        
        # 添加额外数据
        if extra_data:
            record["data"] = extra_data
        
        # 添加异常信息
        if exception:
            record["exception"] = {
                "type": type(exception).__name__,
                "message": str(exception),
                "traceback": traceback.format_exc()
            }
        
        return record
    
    def debug(
        self,
        message: str,
        category: LogCategory = LogCategory.SYSTEM,
        extra_data: Optional[Dict[str, Any]] = None
    ):
        """记录调试日志"""
        record = self._create_log_record(LogLevel.DEBUG, message, category, extra_data)
        self.logger.debug(json.dumps(record, ensure_ascii=False))
    
    def info(
        self,
        message: str,
        category: LogCategory = LogCategory.SYSTEM,
        extra_data: Optional[Dict[str, Any]] = None
    ):
        """记录信息日志"""
        record = self._create_log_record(LogLevel.INFO, message, category, extra_data)
        self.logger.info(json.dumps(record, ensure_ascii=False))
    
    def warning(
        self,
        message: str,
        category: LogCategory = LogCategory.SYSTEM,
        extra_data: Optional[Dict[str, Any]] = None
    ):
        """记录警告日志"""
        record = self._create_log_record(LogLevel.WARNING, message, category, extra_data)
        self.logger.warning(json.dumps(record, ensure_ascii=False))
    
    def error(
        self,
        message: str,
        category: LogCategory = LogCategory.SYSTEM,
        extra_data: Optional[Dict[str, Any]] = None,
        exception: Optional[Exception] = None
    ):
        """记录错误日志"""
        record = self._create_log_record(LogLevel.ERROR, message, category, extra_data, exception)
        self.logger.error(json.dumps(record, ensure_ascii=False))
    
    def critical(
        self,
        message: str,
        category: LogCategory = LogCategory.SYSTEM,
        extra_data: Optional[Dict[str, Any]] = None,
        exception: Optional[Exception] = None
    ):
        """记录严重错误日志"""
        record = self._create_log_record(LogLevel.CRITICAL, message, category, extra_data, exception)
        self.logger.critical(json.dumps(record, ensure_ascii=False))
    
    def log_api_request(
        self,
        method: str,
        path: str,
        status_code: int,
        duration_ms: float,
        user_agent: str = None,
        ip_address: str = None
    ):
        """记录API请求日志"""
        extra_data = {
            "method": method,
            "path": path,
            "status_code": status_code,
            "duration_ms": duration_ms,
            "user_agent": user_agent,
            "ip_address": ip_address
        }
        
        level = LogLevel.INFO
        if status_code >= 500:
            level = LogLevel.ERROR
        elif status_code >= 400:
            level = LogLevel.WARNING
        
        message = f"{method} {path} - {status_code} ({duration_ms:.2f}ms)"
        record = self._create_log_record(level, message, LogCategory.API, extra_data)
        
        if level == LogLevel.ERROR:
            self.logger.error(json.dumps(record, ensure_ascii=False))
        elif level == LogLevel.WARNING:
            self.logger.warning(json.dumps(record, ensure_ascii=False))
        else:
            self.logger.info(json.dumps(record, ensure_ascii=False))
    
    def log_performance_metric(
        self,
        metric_name: str,
        value: Union[int, float],
        unit: str = None,
        tags: Optional[Dict[str, str]] = None
    ):
        """记录性能指标"""
        extra_data = {
            "metric_name": metric_name,
            "value": value,
            "unit": unit,
            "tags": tags or {}
        }
        
        message = f"Performance metric: {metric_name} = {value}"
        if unit:
            message += f" {unit}"
        
        record = self._create_log_record(LogLevel.INFO, message, LogCategory.PERFORMANCE, extra_data)
        self.logger.info(json.dumps(record, ensure_ascii=False))


class StructuredFormatter(logging.Formatter):
    """结构化日志格式化器"""
    
    def __init__(self, include_colors: bool = False):
        super().__init__()
        self.include_colors = include_colors
        
        # 颜色代码
        self.colors = {
            'DEBUG': '\033[36m',    # 青色
            'INFO': '\033[32m',     # 绿色
            'WARNING': '\033[33m',  # 黄色
            'ERROR': '\033[31m',    # 红色
            'CRITICAL': '\033[35m', # 紫色
            'RESET': '\033[0m'      # 重置
        }
    
    def format(self, record):
        """格式化日志记录"""
        try:
            # 尝试解析JSON格式的消息
            log_data = json.loads(record.getMessage())
            
            if self.include_colors:
                return self._format_colored(log_data)
            else:
                return json.dumps(log_data, ensure_ascii=False, separators=(',', ':'))
        
        except (json.JSONDecodeError, KeyError):
            # 如果不是JSON格式，使用默认格式
            return super().format(record)
    
    def _format_colored(self, log_data: Dict[str, Any]) -> str:
        """格式化彩色日志"""
        level = log_data.get('level', 'INFO')
        color = self.colors.get(level, '')
        reset = self.colors['RESET']
        
        # 基本信息
        timestamp = log_data.get('timestamp', '')
        category = log_data.get('category', 'system')
        message = log_data.get('message', '')
        
        # 构建彩色输出
        formatted = f"{color}[{level}]{reset} {timestamp} [{category}] {message}"
        
        # 添加请求ID
        if 'request_id' in log_data:
            formatted += f" (req: {log_data['request_id'][:8]})"
        
        # 添加额外数据
        if 'data' in log_data:
            formatted += f" | {json.dumps(log_data['data'], ensure_ascii=False)}"
        
        # 添加异常信息
        if 'exception' in log_data:
            formatted += f"\n{color}Exception:{reset} {log_data['exception']['message']}"
        
        return formatted


# 全局日志记录器实例
logger = StructuredLogger()


# 便捷函数
def log_debug(message: str, category: LogCategory = LogCategory.SYSTEM, **kwargs):
    """记录调试日志"""
    logger.debug(message, category, kwargs if kwargs else None)


def log_info(message: str, category: LogCategory = LogCategory.SYSTEM, **kwargs):
    """记录信息日志"""
    logger.info(message, category, kwargs if kwargs else None)


def log_warning(message: str, category: LogCategory = LogCategory.SYSTEM, **kwargs):
    """记录警告日志"""
    logger.warning(message, category, kwargs if kwargs else None)


def log_error(message: str, category: LogCategory = LogCategory.SYSTEM, exception: Exception = None, **kwargs):
    """记录错误日志"""
    logger.error(message, category, kwargs if kwargs else None, exception)


def log_critical(message: str, category: LogCategory = LogCategory.SYSTEM, exception: Exception = None, **kwargs):
    """记录严重错误日志"""
    logger.critical(message, category, kwargs if kwargs else None, exception)
