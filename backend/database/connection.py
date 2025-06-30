"""
数据库连接管理

提供SQLite数据库的连接、初始化和管理功能
"""

import os
import logging
from typing import Optional
from sqlalchemy import create_engine, Engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from config import AI_CONFIG, STT_CONFIG, DOWNLOAD_CONFIG


class DatabaseManager:
    """数据库管理器 - 单例模式"""
    
    _instance: Optional['DatabaseManager'] = None
    _engine: Optional[Engine] = None
    _session_factory: Optional[sessionmaker] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if hasattr(self, '_initialized'):
            return
        self._initialized = True
    
    def init_database(self, database_url: Optional[str] = None) -> Engine:
        """初始化数据库连接"""
        if self._engine is not None:
            return self._engine
        
        if database_url is None:
            # 使用项目根目录下的data文件夹
            db_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
            os.makedirs(db_dir, exist_ok=True)
            db_path = os.path.join(db_dir, "videochat.db")
            database_url = f"sqlite:///{db_path}"
        
        # 创建引擎
        self._engine = create_engine(
            database_url,
            poolclass=StaticPool,
            connect_args={
                "check_same_thread": False,  # SQLite特定配置
                "timeout": 20  # 连接超时
            },
            echo=False  # 开发环境显示SQL
        )
        
        # 创建会话工厂
        self._session_factory = sessionmaker(
            bind=self._engine,
            autocommit=False,
            autoflush=False
        )
        
        # 创建所有表
        from .models import Base
        Base.metadata.create_all(self._engine)
        
        logging.info(f"✅ 数据库初始化完成: {database_url}")
        return self._engine
    
    def get_session(self) -> Session:
        """获取数据库会话"""
        if self._session_factory is None:
            self.init_database()
        return self._session_factory()
    
    def close(self):
        """关闭数据库连接"""
        if self._engine:
            self._engine.dispose()
            self._engine = None
            self._session_factory = None
            logging.info("✅ 数据库连接已关闭")


# 全局数据库管理器实例
_db_manager = DatabaseManager()


def init_database(database_url: Optional[str] = None) -> Engine:
    """初始化数据库"""
    return _db_manager.init_database(database_url)


def get_database() -> Session:
    """获取数据库会话"""
    return _db_manager.get_session()


def close_database():
    """关闭数据库连接"""
    _db_manager.close()


# 数据库会话上下文管理器
class DatabaseSession:
    """数据库会话上下文管理器"""
    
    def __init__(self):
        self.session: Optional[Session] = None
    
    def __enter__(self) -> Session:
        self.session = get_database()
        return self.session
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            if exc_type is not None:
                self.session.rollback()
            else:
                self.session.commit()
            self.session.close()


def get_db_session():
    """获取数据库会话上下文管理器"""
    return DatabaseSession()
