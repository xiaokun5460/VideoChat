"""
分片上传系统

支持大文件分片上传、断点续传、进度反馈等功能
"""

import asyncio
import hashlib
import json
import logging
import os
import tempfile
import time
from dataclasses import dataclass
from typing import Dict, List, Optional, AsyncGenerator, BinaryIO
from pathlib import Path

from utils.progress_manager import progress_manager, TaskType, TaskStatus


@dataclass
class ChunkInfo:
    """分片信息"""
    chunk_id: int
    chunk_hash: str
    chunk_size: int
    start_byte: int
    end_byte: int
    uploaded: bool = False
    upload_time: Optional[float] = None


@dataclass
class UploadSession:
    """上传会话"""
    session_id: str
    task_id: str
    file_name: str
    file_size: int
    total_chunks: int
    chunk_size: int
    file_hash: str
    chunks: List[ChunkInfo]
    temp_dir: str
    created_at: float
    last_activity: float
    completed: bool = False


class ChunkedUploadManager:
    """分片上传管理器"""
    
    def __init__(self, chunk_size: int = 2 * 1024 * 1024, max_sessions: int = 100):
        """
        初始化分片上传管理器
        
        Args:
            chunk_size: 分片大小（默认2MB）
            max_sessions: 最大会话数
        """
        self.chunk_size = chunk_size
        self.max_sessions = max_sessions
        self.sessions: Dict[str, UploadSession] = {}
        self.temp_base_dir = tempfile.gettempdir()
        self.session_timeout = 3600  # 1小时超时
        
    async def create_upload_session(
        self,
        file_name: str,
        file_size: int,
        file_hash: str,
        chunk_size: Optional[int] = None
    ) -> str:
        """
        创建上传会话
        
        Args:
            file_name: 文件名
            file_size: 文件大小
            file_hash: 文件哈希值
            chunk_size: 分片大小（可选）
        
        Returns:
            会话ID
        """
        # 清理过期会话
        await self._cleanup_expired_sessions()
        
        # 检查会话数量限制
        if len(self.sessions) >= self.max_sessions:
            raise Exception("上传会话数量已达上限")
        
        # 使用指定的分片大小或默认值
        actual_chunk_size = chunk_size or self.chunk_size
        
        # 计算分片信息
        total_chunks = (file_size + actual_chunk_size - 1) // actual_chunk_size
        chunks = []
        
        for i in range(total_chunks):
            start_byte = i * actual_chunk_size
            end_byte = min(start_byte + actual_chunk_size - 1, file_size - 1)
            chunk_size_actual = end_byte - start_byte + 1
            
            chunk_info = ChunkInfo(
                chunk_id=i,
                chunk_hash="",  # 将在上传时计算
                chunk_size=chunk_size_actual,
                start_byte=start_byte,
                end_byte=end_byte
            )
            chunks.append(chunk_info)
        
        # 创建临时目录
        session_id = hashlib.md5(f"{file_name}_{file_size}_{time.time()}".encode()).hexdigest()
        temp_dir = os.path.join(self.temp_base_dir, f"upload_{session_id}")
        os.makedirs(temp_dir, exist_ok=True)
        
        # 创建进度任务
        task_id = progress_manager.create_task(
            task_type=TaskType.UPLOAD,
            file_name=file_name,
            file_size=file_size,
            total_steps=total_chunks,
            metadata={
                'session_id': session_id,
                'chunk_size': actual_chunk_size,
                'file_hash': file_hash
            }
        )
        
        # 创建上传会话
        session = UploadSession(
            session_id=session_id,
            task_id=task_id,
            file_name=file_name,
            file_size=file_size,
            total_chunks=total_chunks,
            chunk_size=actual_chunk_size,
            file_hash=file_hash,
            chunks=chunks,
            temp_dir=temp_dir,
            created_at=time.time(),
            last_activity=time.time()
        )
        
        self.sessions[session_id] = session
        
        # 更新进度
        progress_manager.update_progress(
            task_id=task_id,
            status=TaskStatus.INITIALIZING,
            current_step="准备分片上传",
            progress=0.0
        )
        
        logging.info(f"📦 创建分片上传会话: {session_id} - {file_name} ({file_size} bytes, {total_chunks} chunks)")
        return session_id
    
    async def upload_chunk(
        self,
        session_id: str,
        chunk_id: int,
        chunk_data: bytes
    ) -> bool:
        """
        上传分片
        
        Args:
            session_id: 会话ID
            chunk_id: 分片ID
            chunk_data: 分片数据
        
        Returns:
            是否上传成功
        """
        if session_id not in self.sessions:
            raise Exception(f"上传会话不存在: {session_id}")
        
        session = self.sessions[session_id]
        session.last_activity = time.time()
        
        if chunk_id >= len(session.chunks):
            raise Exception(f"无效的分片ID: {chunk_id}")
        
        chunk_info = session.chunks[chunk_id]
        
        # 验证分片大小
        if len(chunk_data) != chunk_info.chunk_size:
            raise Exception(f"分片大小不匹配: 期望 {chunk_info.chunk_size}, 实际 {len(chunk_data)}")
        
        # 计算分片哈希
        chunk_hash = hashlib.md5(chunk_data).hexdigest()
        chunk_info.chunk_hash = chunk_hash
        
        # 保存分片到临时文件
        chunk_file_path = os.path.join(session.temp_dir, f"chunk_{chunk_id:06d}")
        with open(chunk_file_path, 'wb') as f:
            f.write(chunk_data)
        
        # 标记分片已上传
        chunk_info.uploaded = True
        chunk_info.upload_time = time.time()
        
        # 计算上传进度
        uploaded_chunks = sum(1 for chunk in session.chunks if chunk.uploaded)
        progress = (uploaded_chunks / session.total_chunks) * 100
        
        # 计算上传速度
        uploaded_size = sum(chunk.chunk_size for chunk in session.chunks if chunk.uploaded)
        elapsed_time = time.time() - session.created_at
        speed = f"{uploaded_size / elapsed_time / 1024 / 1024:.2f} MB/s" if elapsed_time > 0 else "0 MB/s"
        
        # 估算剩余时间
        if uploaded_chunks > 0 and uploaded_chunks < session.total_chunks:
            avg_time_per_chunk = elapsed_time / uploaded_chunks
            remaining_chunks = session.total_chunks - uploaded_chunks
            eta_seconds = avg_time_per_chunk * remaining_chunks
            eta = f"{eta_seconds:.0f}s"
        else:
            eta = "Unknown"
        
        # 更新进度
        progress_manager.update_progress(
            task_id=session.task_id,
            status=TaskStatus.PROCESSING,
            progress=progress,
            current_step=f"上传分片 {uploaded_chunks}/{session.total_chunks}",
            current_step_index=uploaded_chunks,
            processed_size=uploaded_size,
            speed=speed,
            eta=eta
        )
        
        logging.info(f"📤 分片上传完成: {session_id} chunk {chunk_id} ({progress:.1f}%)")
        
        # 检查是否所有分片都已上传
        if uploaded_chunks == session.total_chunks:
            await self._merge_chunks(session_id)
        
        return True
    
    async def _merge_chunks(self, session_id: str) -> str:
        """
        合并分片
        
        Args:
            session_id: 会话ID
        
        Returns:
            合并后的文件路径
        """
        session = self.sessions[session_id]
        
        # 更新进度
        progress_manager.update_progress(
            task_id=session.task_id,
            status=TaskStatus.PROCESSING,
            current_step="合并分片文件",
            progress=95.0
        )
        
        # 创建最终文件路径
        final_file_path = os.path.join("uploads", session.file_name)
        os.makedirs(os.path.dirname(final_file_path), exist_ok=True)
        
        # 合并分片
        with open(final_file_path, 'wb') as final_file:
            for chunk_info in session.chunks:
                chunk_file_path = os.path.join(session.temp_dir, f"chunk_{chunk_info.chunk_id:06d}")
                
                if not os.path.exists(chunk_file_path):
                    raise Exception(f"分片文件不存在: {chunk_info.chunk_id}")
                
                with open(chunk_file_path, 'rb') as chunk_file:
                    final_file.write(chunk_file.read())
        
        # 验证文件完整性
        with open(final_file_path, 'rb') as f:
            file_hash = hashlib.md5(f.read()).hexdigest()
        
        if file_hash != session.file_hash:
            raise Exception(f"文件哈希验证失败: 期望 {session.file_hash}, 实际 {file_hash}")
        
        # 清理临时文件
        await self._cleanup_session_files(session_id)
        
        # 标记会话完成
        session.completed = True
        
        # 完成进度任务
        progress_manager.complete_task(
            task_id=session.task_id,
            success=True,
            result_metadata={
                'file_path': final_file_path,
                'file_hash': file_hash,
                'upload_duration': time.time() - session.created_at
            }
        )
        
        logging.info(f"✅ 分片合并完成: {session_id} -> {final_file_path}")
        return final_file_path
    
    async def get_upload_status(self, session_id: str) -> Dict:
        """
        获取上传状态
        
        Args:
            session_id: 会话ID
        
        Returns:
            上传状态信息
        """
        if session_id not in self.sessions:
            raise Exception(f"上传会话不存在: {session_id}")
        
        session = self.sessions[session_id]
        uploaded_chunks = [chunk for chunk in session.chunks if chunk.uploaded]
        missing_chunks = [chunk.chunk_id for chunk in session.chunks if not chunk.uploaded]
        
        # 获取进度任务信息
        task_info = progress_manager.get_task_dict(session.task_id)
        
        return {
            'session_id': session_id,
            'task_id': session.task_id,
            'file_name': session.file_name,
            'file_size': session.file_size,
            'total_chunks': session.total_chunks,
            'uploaded_chunks': len(uploaded_chunks),
            'missing_chunks': missing_chunks,
            'progress': len(uploaded_chunks) / session.total_chunks * 100,
            'completed': session.completed,
            'task_info': task_info
        }
    
    async def cancel_upload(self, session_id: str) -> bool:
        """
        取消上传
        
        Args:
            session_id: 会话ID
        
        Returns:
            是否取消成功
        """
        if session_id not in self.sessions:
            return False
        
        session = self.sessions[session_id]
        
        # 取消进度任务
        progress_manager.cancel_task(session.task_id)
        
        # 清理临时文件
        await self._cleanup_session_files(session_id)
        
        # 删除会话
        del self.sessions[session_id]
        
        logging.info(f"⏹️ 取消分片上传: {session_id}")
        return True
    
    async def _cleanup_session_files(self, session_id: str):
        """清理会话临时文件"""
        if session_id not in self.sessions:
            return
        
        session = self.sessions[session_id]
        temp_dir = session.temp_dir
        
        if os.path.exists(temp_dir):
            import shutil
            shutil.rmtree(temp_dir)
            logging.info(f"🧹 清理临时文件: {temp_dir}")
    
    async def _cleanup_expired_sessions(self):
        """清理过期会话"""
        current_time = time.time()
        expired_sessions = []
        
        for session_id, session in self.sessions.items():
            if current_time - session.last_activity > self.session_timeout:
                expired_sessions.append(session_id)
        
        for session_id in expired_sessions:
            await self.cancel_upload(session_id)
        
        if expired_sessions:
            logging.info(f"🧹 清理了 {len(expired_sessions)} 个过期上传会话")
    
    def get_stats(self) -> Dict:
        """获取统计信息"""
        active_sessions = len(self.sessions)
        completed_sessions = sum(1 for session in self.sessions.values() if session.completed)
        
        return {
            'active_sessions': active_sessions,
            'completed_sessions': completed_sessions,
            'max_sessions': self.max_sessions,
            'default_chunk_size': self.chunk_size,
            'session_timeout': self.session_timeout
        }


# 全局分片上传管理器实例
chunked_upload_manager = ChunkedUploadManager()