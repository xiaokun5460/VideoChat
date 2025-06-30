"""
数据库模型定义

定义VideoChat应用的所有数据库表结构
"""

from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, 
    Float, JSON, ForeignKey, Index, UniqueConstraint
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()


class TranscriptionTask(Base):
    """转录任务表"""
    __tablename__ = "transcription_tasks"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(String(36), unique=True, nullable=False, index=True)  # UUID
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer)  # 文件大小（字节）
    file_hash = Column(String(64), index=True)  # 文件MD5哈希
    
    # 任务状态
    status = Column(String(20), nullable=False, default="pending")  # pending, running, completed, cancelled, error
    progress = Column(Float, default=0.0)  # 进度百分比
    error_message = Column(Text)
    
    # 转录配置
    model_name = Column(String(50))  # 使用的模型名称
    language = Column(String(10))   # 语言代码
    beam_size = Column(Integer)     # 集束搜索大小
    
    # 时间戳
    created_at = Column(DateTime, default=func.now(), nullable=False)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # 关系
    results = relationship("TranscriptionResult", back_populates="task", cascade="all, delete-orphan")
    
    # 索引
    __table_args__ = (
        Index('idx_task_status_created', 'status', 'created_at'),
        Index('idx_file_hash_status', 'file_hash', 'status'),
    )


class TranscriptionResult(Base):
    """转录结果表"""
    __tablename__ = "transcription_results"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(String(36), ForeignKey('transcription_tasks.task_id'), nullable=False)
    
    # 转录内容
    segments = Column(JSON, nullable=False)  # 转录片段列表
    full_text = Column(Text)  # 完整转录文本
    summary = Column(Text)    # AI生成的摘要
    keywords = Column(JSON)   # 关键词列表
    
    # 质量指标
    confidence_score = Column(Float)  # 置信度分数
    duration = Column(Float)          # 音频时长（秒）
    processing_time = Column(Float)   # 处理时间（秒）
    
    # 时间戳
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    # 关系
    task = relationship("TranscriptionTask", back_populates="results")
    
    # 索引
    __table_args__ = (
        Index('idx_task_created', 'task_id', 'created_at'),
    )


class FileRecord(Base):
    """文件记录表"""
    __tablename__ = "file_records"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    file_path = Column(String(500), nullable=False, unique=True)
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)
    file_hash = Column(String(64), nullable=False, index=True)
    mime_type = Column(String(100))
    
    # 文件元数据
    duration = Column(Float)  # 音视频时长
    format_info = Column(JSON)  # 格式信息
    
    # 处理状态
    is_processed = Column(Boolean, default=False)
    last_accessed = Column(DateTime, default=func.now())
    
    # 时间戳
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # 索引
    __table_args__ = (
        Index('idx_hash_processed', 'file_hash', 'is_processed'),
        Index('idx_accessed', 'last_accessed'),
    )


class CacheEntry(Base):
    """缓存条目表"""
    __tablename__ = "cache_entries"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    cache_key = Column(String(255), nullable=False, unique=True, index=True)
    cache_type = Column(String(50), nullable=False)  # transcription, ai_summary, ai_chat等
    
    # 缓存内容
    content = Column(Text, nullable=False)  # JSON格式的缓存内容
    content_hash = Column(String(64), nullable=False)  # 内容哈希
    
    # 缓存元数据
    size_bytes = Column(Integer)  # 缓存大小
    hit_count = Column(Integer, default=0)  # 命中次数
    
    # 过期时间
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    last_accessed = Column(DateTime, default=func.now())
    
    # 索引
    __table_args__ = (
        Index('idx_type_expires', 'cache_type', 'expires_at'),
        Index('idx_expires_accessed', 'expires_at', 'last_accessed'),
    )


class SystemConfig(Base):
    """系统配置表"""
    __tablename__ = "system_configs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    config_key = Column(String(100), nullable=False, unique=True)
    config_value = Column(Text, nullable=False)
    config_type = Column(String(20), default="string")  # string, json, number, boolean
    description = Column(String(500))
    
    # 配置元数据
    is_system = Column(Boolean, default=False)  # 是否为系统配置
    is_encrypted = Column(Boolean, default=False)  # 是否加密存储
    
    # 时间戳
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # 索引
    __table_args__ = (
        Index('idx_key_system', 'config_key', 'is_system'),
    )
