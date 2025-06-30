"""
缓存数据访问对象

处理缓存条目的数据库操作
"""

import json
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Any, Optional, List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc
from database.models import CacheEntry
from database.connection import get_db_session


class CacheDAO:
    """缓存数据访问对象"""
    
    @staticmethod
    def _generate_content_hash(content: str) -> str:
        """生成内容哈希"""
        return hashlib.sha256(content.encode()).hexdigest()
    
    @staticmethod
    def set_cache(
        cache_key: str,
        content: Any,
        cache_type: str,
        ttl_seconds: int = 3600
    ) -> bool:
        """设置缓存"""
        try:
            # 序列化内容
            content_str = json.dumps(content, ensure_ascii=False)
            content_hash = CacheDAO._generate_content_hash(content_str)
            expires_at = datetime.now() + timedelta(seconds=ttl_seconds)
            
            with get_db_session() as session:
                # 检查是否已存在
                existing = session.query(CacheEntry).filter(
                    CacheEntry.cache_key == cache_key
                ).first()
                
                if existing:
                    # 更新现有缓存
                    existing.content = content_str
                    existing.content_hash = content_hash
                    existing.cache_type = cache_type
                    existing.size_bytes = len(content_str.encode())
                    existing.expires_at = expires_at
                    existing.last_accessed = datetime.now()
                else:
                    # 创建新缓存
                    cache_entry = CacheEntry(
                        cache_key=cache_key,
                        cache_type=cache_type,
                        content=content_str,
                        content_hash=content_hash,
                        size_bytes=len(content_str.encode()),
                        expires_at=expires_at
                    )
                    session.add(cache_entry)
                
                session.commit()
                return True
                
        except Exception as e:
            logging.info(f"❌ 缓存设置失败: {e}")
            return False
    
    @staticmethod
    def get_cache(cache_key: str) -> Optional[Any]:
        """获取缓存"""
        try:
            with get_db_session() as session:
                cache_entry = session.query(CacheEntry).filter(
                    and_(
                        CacheEntry.cache_key == cache_key,
                        CacheEntry.expires_at > datetime.now()
                    )
                ).first()
                
                if cache_entry:
                    # 更新访问时间和命中次数
                    cache_entry.last_accessed = datetime.now()
                    cache_entry.hit_count += 1
                    session.commit()
                    
                    # 反序列化内容
                    return json.loads(cache_entry.content)
                
                return None
                
        except Exception as e:
            logging.info(f"❌ 缓存获取失败: {e}")
            return None
    
    @staticmethod
    def delete_cache(cache_key: str) -> bool:
        """删除缓存"""
        try:
            with get_db_session() as session:
                deleted_count = session.query(CacheEntry).filter(
                    CacheEntry.cache_key == cache_key
                ).delete()
                session.commit()
                return deleted_count > 0
                
        except Exception as e:
            logging.info(f"❌ 缓存删除失败: {e}")
            return False
    
    @staticmethod
    def clear_expired_cache() -> int:
        """清理过期缓存"""
        try:
            with get_db_session() as session:
                deleted_count = session.query(CacheEntry).filter(
                    CacheEntry.expires_at <= datetime.now()
                ).delete()
                session.commit()
                return deleted_count
                
        except Exception as e:
            logging.info(f"❌ 清理过期缓存失败: {e}")
            return 0
    
    @staticmethod
    def clear_cache_by_type(cache_type: str) -> int:
        """按类型清理缓存"""
        try:
            with get_db_session() as session:
                deleted_count = session.query(CacheEntry).filter(
                    CacheEntry.cache_type == cache_type
                ).delete()
                session.commit()
                return deleted_count
                
        except Exception as e:
            logging.info(f"❌ 按类型清理缓存失败: {e}")
            return 0
    
    @staticmethod
    def get_cache_statistics() -> Dict[str, Any]:
        """获取缓存统计信息"""
        try:
            with get_db_session() as session:
                # 总缓存条目数
                total_entries = session.query(func.count(CacheEntry.id)).scalar()
                
                # 按类型统计
                type_stats = session.query(
                    CacheEntry.cache_type,
                    func.count(CacheEntry.id),
                    func.sum(CacheEntry.size_bytes)
                ).group_by(CacheEntry.cache_type).all()
                
                # 总大小
                total_size = session.query(
                    func.sum(CacheEntry.size_bytes)
                ).scalar() or 0
                
                # 命中率统计
                total_hits = session.query(
                    func.sum(CacheEntry.hit_count)
                ).scalar() or 0
                
                # 过期条目数
                expired_count = session.query(func.count(CacheEntry.id)).filter(
                    CacheEntry.expires_at <= datetime.now()
                ).scalar()
                
                # 最热门的缓存
                hot_cache = session.query(CacheEntry).order_by(
                    desc(CacheEntry.hit_count)
                ).limit(10).all()
                
                return {
                    "total_entries": total_entries,
                    "total_size_bytes": total_size,
                    "total_hits": total_hits,
                    "expired_count": expired_count,
                    "type_distribution": [
                        {
                            "type": t[0],
                            "count": t[1],
                            "size_bytes": t[2] or 0
                        } for t in type_stats
                    ],
                    "hot_cache_keys": [
                        {
                            "key": entry.cache_key,
                            "type": entry.cache_type,
                            "hits": entry.hit_count,
                            "size": entry.size_bytes
                        } for entry in hot_cache
                    ]
                }
                
        except Exception as e:
            logging.info(f"❌ 获取缓存统计失败: {e}")
            return {}
    
    @staticmethod
    def optimize_cache(max_size_mb: int = 100) -> Dict[str, int]:
        """优化缓存（删除最少使用的缓存）"""
        max_size_bytes = max_size_mb * 1024 * 1024
        
        try:
            with get_db_session() as session:
                # 获取当前总大小
                current_size = session.query(
                    func.sum(CacheEntry.size_bytes)
                ).scalar() or 0
                
                if current_size <= max_size_bytes:
                    return {"deleted": 0, "current_size": current_size}
                
                # 按最少使用排序，删除直到达到目标大小
                entries_to_delete = session.query(CacheEntry).order_by(
                    CacheEntry.hit_count.asc(),
                    CacheEntry.last_accessed.asc()
                ).all()
                
                deleted_count = 0
                freed_bytes = 0
                
                for entry in entries_to_delete:
                    if current_size - freed_bytes <= max_size_bytes:
                        break
                    
                    freed_bytes += entry.size_bytes or 0
                    session.delete(entry)
                    deleted_count += 1
                
                session.commit()
                
                return {
                    "deleted": deleted_count,
                    "freed_bytes": freed_bytes,
                    "current_size": current_size - freed_bytes
                }
                
        except Exception as e:
            logging.info(f"❌ 缓存优化失败: {e}")
            return {"deleted": 0, "current_size": 0}
