"""
文件数据访问对象

处理文件记录的数据库操作
"""

import hashlib
import os
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
from database.models import FileRecord
from database.connection import get_db_session


class FileDAO:
    """文件数据访问对象"""
    
    @staticmethod
    def calculate_file_hash(file_path: str) -> str:
        """计算文件MD5哈希"""
        hash_md5 = hashlib.md5()
        try:
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_md5.update(chunk)
            return hash_md5.hexdigest()
        except Exception as e:
            logging.error(f"❌ 计算文件哈希失败: {e}")
            return ""
    
    @staticmethod
    def create_file_record(
        file_path: str,
        file_name: str,
        file_size: int,
        file_hash: str = None,
        mime_type: str = None,
        duration: float = None,
        format_info: Dict = None
    ) -> FileRecord:
        """创建文件记录"""
        if file_hash is None:
            file_hash = FileDAO.calculate_file_hash(file_path)
        
        with get_db_session() as session:
            # 检查是否已存在相同文件
            existing = session.query(FileRecord).filter(
                FileRecord.file_hash == file_hash
            ).first()
            
            if existing:
                # 更新访问时间
                existing.last_accessed = datetime.now()
                session.commit()
                return existing
            
            # 创建新记录
            file_record = FileRecord(
                file_path=file_path,
                file_name=file_name,
                file_size=file_size,
                file_hash=file_hash,
                mime_type=mime_type,
                duration=duration,
                format_info=format_info or {}
            )
            session.add(file_record)
            session.commit()
            session.refresh(file_record)
            return file_record
    
    @staticmethod
    def get_file_by_path(file_path: str) -> Optional[FileRecord]:
        """根据路径获取文件记录"""
        with get_db_session() as session:
            return session.query(FileRecord).filter(
                FileRecord.file_path == file_path
            ).first()
    
    @staticmethod
    def get_file_by_hash(file_hash: str) -> Optional[FileRecord]:
        """根据哈希获取文件记录"""
        with get_db_session() as session:
            return session.query(FileRecord).filter(
                FileRecord.file_hash == file_hash
            ).first()
    
    @staticmethod
    def update_file_processed(file_path: str, is_processed: bool = True) -> bool:
        """更新文件处理状态"""
        with get_db_session() as session:
            file_record = session.query(FileRecord).filter(
                FileRecord.file_path == file_path
            ).first()
            
            if file_record:
                file_record.is_processed = is_processed
                file_record.last_accessed = datetime.now()
                session.commit()
                return True
            return False
    
    @staticmethod
    def get_unprocessed_files(limit: int = 100) -> List[FileRecord]:
        """获取未处理的文件"""
        with get_db_session() as session:
            return session.query(FileRecord).filter(
                FileRecord.is_processed == False
            ).order_by(FileRecord.created_at).limit(limit).all()
    
    @staticmethod
    def cleanup_orphaned_records() -> int:
        """清理孤立的文件记录（文件已不存在）"""
        with get_db_session() as session:
            all_records = session.query(FileRecord).all()
            deleted_count = 0
            
            for record in all_records:
                if not os.path.exists(record.file_path):
                    session.delete(record)
                    deleted_count += 1
            
            session.commit()
            return deleted_count
    
    @staticmethod
    def get_file_statistics() -> Dict[str, Any]:
        """获取文件统计信息"""
        with get_db_session() as session:
            # 总文件数
            total_files = session.query(func.count(FileRecord.id)).scalar()
            
            # 总大小
            total_size = session.query(func.sum(FileRecord.file_size)).scalar() or 0
            
            # 已处理文件数
            processed_files = session.query(func.count(FileRecord.id)).filter(
                FileRecord.is_processed == True
            ).scalar()
            
            # 按MIME类型统计
            mime_stats = session.query(
                FileRecord.mime_type,
                func.count(FileRecord.id),
                func.sum(FileRecord.file_size)
            ).group_by(FileRecord.mime_type).all()
            
            # 最近上传的文件
            recent_files = session.query(FileRecord).order_by(
                desc(FileRecord.created_at)
            ).limit(10).all()
            
            return {
                "total_files": total_files,
                "total_size_bytes": total_size,
                "processed_files": processed_files,
                "processing_rate": (processed_files / total_files * 100) if total_files > 0 else 0,
                "mime_distribution": [
                    {
                        "mime_type": stat[0] or "unknown",
                        "count": stat[1],
                        "size_bytes": stat[2] or 0
                    } for stat in mime_stats
                ],
                "recent_files": [
                    {
                        "name": f.file_name,
                        "size": f.file_size,
                        "created_at": f.created_at.isoformat(),
                        "processed": f.is_processed
                    } for f in recent_files
                ]
            }
