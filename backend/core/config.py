"""
应用配置管理

统一的配置管理系统
"""

import os
from typing import List, Optional
from pydantic import BaseModel, Field


class Settings(BaseModel):
    """应用配置"""
    
    # 应用基础配置
    app_name: str = Field(default="VideoChat", description="应用名称")
    app_version: str = Field(default="2.0.0", description="应用版本")
    debug: bool = Field(default=False, description="调试模式")
    
    # 服务器配置
    host: str = Field(default="0.0.0.0", description="服务器地址")
    port: int = Field(default=8000, description="服务器端口")
    
    # 数据库配置
    database_url: str = Field(default="sqlite:///./videochat.db", description="数据库URL")
    
    # 文件存储配置
    upload_dir: str = Field(default="uploads", description="上传目录")
    max_file_size: int = Field(default=500 * 1024 * 1024, description="最大文件大小(字节)")
    allowed_file_types: List[str] = Field(
        default=[".mp3", ".wav", ".m4a", ".mp4", ".avi", ".mov", ".mkv", ".flv"],
        description="允许的文件类型"
    )
    
    # AI服务配置
    openai_api_key: Optional[str] = Field(default=None, description="OpenAI API密钥")
    openai_base_url: Optional[str] = Field(default=None, description="OpenAI API基础URL")
    ai_model_name: str = Field(default="gpt-4", description="AI模型名称")
    
    # 转录配置
    whisper_model: str = Field(default="large-v3", description="Whisper模型")
    use_gpu: bool = Field(default=True, description="是否使用GPU")
    
    # 任务配置
    max_concurrent_tasks: int = Field(default=5, description="最大并发任务数")
    task_timeout: int = Field(default=3600, description="任务超时时间(秒)")
    
    # 缓存配置
    cache_ttl: int = Field(default=3600, description="缓存TTL(秒)")
    cache_max_size: int = Field(default=1000, description="缓存最大条目数")
    
    # 日志配置
    log_level: str = Field(default="INFO", description="日志级别")
    log_file: Optional[str] = Field(default=None, description="日志文件路径")
    
    # 安全配置
    secret_key: str = Field(default="your-secret-key", description="密钥")
    cors_origins: List[str] = Field(default=["*"], description="CORS允许的源")
    
    # 监控配置
    enable_metrics: bool = Field(default=True, description="启用指标收集")
    enable_tracing: bool = Field(default=False, description="启用链路追踪")
    
    class Config:
        """Pydantic配置"""
        env_file = [".env", "backend/.env"]  # 支持多个可能的路径
        env_file_encoding = "utf-8"
        case_sensitive = False


def _load_from_env():
    """从环境变量加载配置"""
    # 尝试加载.env文件，支持多个可能的路径
    possible_env_files = [
        ".env",  # 当前目录
        "backend/.env",  # backend目录
        os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),  # backend目录（相对路径）
    ]
    
    env_file = None
    for file_path in possible_env_files:
        if os.path.exists(file_path):
            env_file = file_path
            break
    
    if env_file:
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()

    config_data = {}

    # 从环境变量读取配置
    config_data["app_name"] = os.getenv("APP_NAME", "VideoChat")
    config_data["app_version"] = os.getenv("APP_VERSION", "2.0.0")
    config_data["debug"] = os.getenv("DEBUG", "false").lower() == "true"

    config_data["host"] = os.getenv("HOST", "0.0.0.0")
    config_data["port"] = int(os.getenv("PORT", "8000"))

    config_data["database_url"] = os.getenv("DATABASE_URL", "sqlite:///./videochat.db")

    config_data["upload_dir"] = os.getenv("UPLOAD_DIR", "uploads")
    config_data["max_file_size"] = int(os.getenv("MAX_FILE_SIZE", str(500 * 1024 * 1024)))

    config_data["openai_api_key"] = os.getenv("AI_API_KEY") or os.getenv("OPENAI_API_KEY")
    config_data["openai_base_url"] = os.getenv("AI_BASE_URL") or os.getenv("OPENAI_BASE_URL")
    config_data["ai_model_name"] = os.getenv("AI_MODEL", "gpt-4")

    config_data["whisper_model"] = os.getenv("WHISPER_MODEL", "large-v3")
    config_data["use_gpu"] = os.getenv("USE_GPU", "true").lower() == "true"

    config_data["max_concurrent_tasks"] = int(os.getenv("MAX_CONCURRENT_TASKS", "5"))
    config_data["task_timeout"] = int(os.getenv("TASK_TIMEOUT", "3600"))

    config_data["cache_ttl"] = int(os.getenv("CACHE_TTL", "3600"))
    config_data["cache_max_size"] = int(os.getenv("CACHE_MAX_SIZE", "1000"))

    config_data["log_level"] = os.getenv("LOG_LEVEL", "INFO")
    config_data["log_file"] = os.getenv("LOG_FILE")

    config_data["secret_key"] = os.getenv("SECRET_KEY", "your-secret-key")
    cors_origins = os.getenv("CORS_ORIGINS", "*")
    config_data["cors_origins"] = [origin.strip() for origin in cors_origins.split(",")]

    config_data["enable_metrics"] = os.getenv("ENABLE_METRICS", "true").lower() == "true"
    config_data["enable_tracing"] = os.getenv("ENABLE_TRACING", "false").lower() == "true"

    # 文件类型列表
    allowed_types = os.getenv("ALLOWED_FILE_TYPES", ".mp3,.wav,.m4a,.mp4,.avi,.mov,.mkv,.flv")
    config_data["allowed_file_types"] = [t.strip() for t in allowed_types.split(",")]

    return config_data


# 全局配置实例
settings = Settings(**_load_from_env())


def get_settings() -> Settings:
    """获取配置实例"""
    return settings


def create_upload_dir():
    """创建上传目录"""
    if not os.path.exists(settings.upload_dir):
        os.makedirs(settings.upload_dir, exist_ok=True)


def validate_file_type(filename: str) -> bool:
    """验证文件类型"""
    file_ext = os.path.splitext(filename)[1].lower()
    return file_ext in settings.allowed_file_types


def validate_file_size(file_size: int) -> bool:
    """验证文件大小"""
    return file_size <= settings.max_file_size
