"""
转录数据访问对象

处理转录任务和结果的数据库操作
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from database.models import TranscriptionTask, TranscriptionResult
from database.connection import get_db_session


class TranscriptionDAO:
    """转录数据访问对象"""
    
    @staticmethod
    def create_task(
        task_id: str,
        file_path: str,
        file_name: str,
        file_size: Optional[int] = None,
        file_hash: Optional[str] = None,
        model_name: Optional[str] = None,
        language: Optional[str] = None,
        beam_size: Optional[int] = None
    ) -> TranscriptionTask:
        """创建转录任务"""
        with get_db_session() as session:
            task = TranscriptionTask(
                task_id=task_id,
                file_path=file_path,
                file_name=file_name,
                file_size=file_size,
                file_hash=file_hash,
                model_name=model_name,
                language=language,
                beam_size=beam_size,
                status="pending"
            )
            session.add(task)
            session.commit()
            session.refresh(task)
            # 将对象从会话中分离，避免会话关闭后的访问问题
            session.expunge(task)
            return task
    
    @staticmethod
    def get_task_by_id(task_id: str) -> Optional[TranscriptionTask]:
        """根据任务ID获取任务"""
        with get_db_session() as session:
            task = session.query(TranscriptionTask).filter(
                TranscriptionTask.task_id == task_id
            ).first()
            if task:
                # 确保对象与会话分离，避免lazy loading问题
                session.expunge(task)
            return task
    
    @staticmethod
    def update_task_status(
        task_id: str,
        status: str,
        progress: Optional[float] = None,
        error_message: Optional[str] = None
    ) -> bool:
        """更新任务状态"""
        with get_db_session() as session:
            task = session.query(TranscriptionTask).filter(
                TranscriptionTask.task_id == task_id
            ).first()
            
            if not task:
                return False
            
            task.status = status
            if progress is not None:
                task.progress = progress
            if error_message is not None:
                task.error_message = error_message
            
            # 更新时间戳
            if status == "running" and not task.started_at:
                task.started_at = datetime.now()
            elif status in ["completed", "cancelled", "error"]:
                task.completed_at = datetime.now()
            
            session.commit()
            return True
    
    @staticmethod
    def save_transcription_result(
        task_id: str,
        segments: List[Dict],
        full_text: Optional[str] = None,
        confidence_score: Optional[float] = None,
        duration: Optional[float] = None,
        processing_time: Optional[float] = None
    ) -> TranscriptionResult:
        """保存转录结果"""
        with get_db_session() as session:
            # 生成完整文本（如果未提供）
            if full_text is None:
                full_text = " ".join([seg.get("text", "") for seg in segments])
            
            result = TranscriptionResult(
                task_id=task_id,
                segments=segments,
                full_text=full_text,
                confidence_score=confidence_score,
                duration=duration,
                processing_time=processing_time
            )
            session.add(result)
            session.commit()
            session.refresh(result)
            # 将对象从会话中分离，避免会话关闭后的访问问题
            session.expunge(result)
            return result
    
    @staticmethod
    def get_task_result(task_id: str) -> Optional[TranscriptionResult]:
        """获取任务结果"""
        with get_db_session() as session:
            result = session.query(TranscriptionResult).filter(
                TranscriptionResult.task_id == task_id
            ).first()
            if result:
                session.expunge(result)
            return result
    
    @staticmethod
    def get_tasks_by_status(
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[TranscriptionTask]:
        """根据状态获取任务列表"""
        with get_db_session() as session:
            query = session.query(TranscriptionTask)
            
            if status:
                query = query.filter(TranscriptionTask.status == status)

            tasks = query.order_by(desc(TranscriptionTask.created_at))\
                       .limit(limit)\
                       .offset(offset)\
                       .all()

            # 将所有对象从会话中分离
            for task in tasks:
                session.expunge(task)

            return tasks
    
    @staticmethod
    def get_tasks_by_file_hash(file_hash: str) -> List[TranscriptionTask]:
        """根据文件哈希获取任务（用于去重）"""
        with get_db_session() as session:
            tasks = session.query(TranscriptionTask).filter(
                and_(
                    TranscriptionTask.file_hash == file_hash,
                    TranscriptionTask.status == "completed"
                )
            ).all()

            # 将所有对象从会话中分离
            for task in tasks:
                session.expunge(task)

            return tasks
    
    @staticmethod
    def cleanup_old_tasks(days: int = 30) -> int:
        """清理旧任务"""
        cutoff_date = datetime.now() - timedelta(days=days)
        
        with get_db_session() as session:
            # 删除旧的已完成或失败任务
            deleted_count = session.query(TranscriptionTask).filter(
                and_(
                    TranscriptionTask.created_at < cutoff_date,
                    TranscriptionTask.status.in_(["completed", "cancelled", "error"])
                )
            ).delete(synchronize_session=False)
            
            session.commit()
            return deleted_count
    
    @staticmethod
    def get_task_statistics() -> Dict[str, Any]:
        """获取任务统计信息"""
        with get_db_session() as session:
            # 总任务数
            total_tasks = session.query(func.count(TranscriptionTask.id)).scalar()
            
            # 按状态统计
            status_stats = session.query(
                TranscriptionTask.status,
                func.count(TranscriptionTask.id)
            ).group_by(TranscriptionTask.status).all()
            
            # 今日任务数
            today = datetime.now().date()
            today_tasks = session.query(func.count(TranscriptionTask.id)).filter(
                func.date(TranscriptionTask.created_at) == today
            ).scalar()
            
            # 平均处理时间
            avg_processing_time = session.query(
                func.avg(TranscriptionResult.processing_time)
            ).scalar()
            
            return {
                "total_tasks": total_tasks,
                "status_distribution": dict(status_stats),
                "today_tasks": today_tasks,
                "avg_processing_time": float(avg_processing_time) if avg_processing_time else 0.0
            }
