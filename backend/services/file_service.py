"""
文件管理服务

处理文件上传、存储、管理等功能
"""

import os
import hashlib
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any
from fastapi import UploadFile

from .base import CRUDService
from core.models import FileInfo, FileStatus, PaginationParams
from core.config import settings, validate_file_type, validate_file_size, create_upload_dir
from core.exceptions import (
    file_not_found, file_too_large, invalid_file_type,
    FileException, ErrorCodes
)
from dao.file_dao import FileDAO
from database.models import FileRecord
from database.connection import get_db_session


class FileService(CRUDService):
    """文件管理服务"""
    
    def __init__(self):
        super().__init__()
        create_upload_dir()  # 确保上传目录存在
        # 移除内存存储，使用数据库存储
        # 创建file_id到文件路径的映射（临时解决方案）
        self._file_id_to_path = {}

    def _file_record_to_dict(self, file_record: FileRecord, file_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """将FileRecord转换为字典格式"""
        if not file_record:
            return None

        return {
            "id": file_id or str(file_record.id),
            "name": file_record.file_name,
            "size": file_record.file_size,
            "type": file_record.mime_type or "application/octet-stream",
            "hash": file_record.file_hash,
            "status": FileStatus.UPLOADED.value,
            "upload_time": file_record.created_at.isoformat(),
            "url": f"/uploads/{os.path.basename(file_record.file_path)}",
            "description": "",  # 暂时为空，后续可以扩展
            "tags": []  # 暂时为空，后续可以扩展
        }
    
    async def upload_file(self, file: UploadFile, description: Optional[str] = None, tags: Optional[List[str]] = None) -> FileInfo:
        """
        上传文件
        
        Args:
            file: 上传的文件
            description: 文件描述
            tags: 文件标签
            
        Returns:
            FileInfo: 文件信息
            
        Raises:
            FileException: 文件相关异常
        """
        return await self.async_safe_execute(
            "文件上传",
            self._upload_file_impl,
            file, description, tags
        )
    
    async def _upload_file_impl(self, file: UploadFile, description: str, tags: List[str]) -> FileInfo:
        """文件上传实现"""
        # 验证文件名
        if not file.filename:
            raise FileException("文件名不能为空", ErrorCodes.INVALID_REQUEST)
        
        # 验证文件类型
        if not validate_file_type(file.filename):
            raise invalid_file_type(settings.allowed_file_types)
        
        # 验证文件大小
        if file.size and not validate_file_size(file.size):
            max_size_mb = settings.max_file_size // (1024 * 1024)
            raise file_too_large(f"{max_size_mb}MB")
        
        # 生成文件ID和路径
        file_id = str(uuid.uuid4())
        file_ext = os.path.splitext(file.filename)[1]
        safe_filename = f"{file_id}{file_ext}"
        file_path = os.path.join(settings.upload_dir, safe_filename)
        
        # 保存文件
        try:
            content = await file.read()
            with open(file_path, "wb") as f:
                f.write(content)
            
            # 计算文件哈希
            file_hash = hashlib.md5(content).hexdigest()
            
            # 保存到数据库
            file_record = FileDAO.create_file_record(
                file_path=file_path,
                file_name=file.filename,
                file_size=len(content),
                file_hash=file_hash,
                mime_type=file.content_type or "application/octet-stream"
            )

            # 保存file_id到文件路径的映射
            self._file_id_to_path[file_id] = file_path

            # 创建FileInfo对象用于返回（避免使用数据库对象的属性）
            file_info = FileInfo(
                id=file_id,
                name=file.filename,
                size=len(content),
                type=file.content_type or "application/octet-stream",
                hash=file_hash,
                status=FileStatus.UPLOADED,
                upload_time=datetime.now().isoformat(),  # 使用当前时间而不是数据库对象
                url=f"/uploads/{safe_filename}",
                description=description,
                tags=tags or []
            )
            
            self.log_info(f"文件上传成功: {file.filename}", file_id=file_id, size=len(content))
            return file_info
            
        except Exception as e:
            # 清理已保存的文件
            if os.path.exists(file_path):
                os.remove(file_path)
            raise FileException(f"文件保存失败: {str(e)}", ErrorCodes.UPLOAD_FAILED)
    
    async def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """创建文件记录（用于CRUD接口）"""
        # 这个方法主要用于直接创建文件记录，而不是上传
        file_id = str(uuid.uuid4())
        # 创建数据库记录
        file_record = FileDAO.create_file_record(
            file_path=data.get("url", ""),
            file_name=data.get("name", ""),
            file_size=data.get("size", 0),
            file_hash=data.get("hash", ""),
            mime_type=data.get("type", "application/octet-stream")
        )

        # 转换为字典格式返回
        return self._file_record_to_dict(file_record, file_id)
    
    async def get_by_id(self, file_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取文件信息"""
        # 通过映射获取文件路径
        file_path = self._file_id_to_path.get(file_id)
        if not file_path:
            return None

        # 从数据库获取文件记录
        file_record = FileDAO.get_file_by_path(file_path)
        if not file_record:
            return None

        return self._file_record_to_dict(file_record, file_id)
    
    async def get_list(
        self, 
        page: int = 1, 
        page_size: int = 20, 
        filters: Optional[Dict[str, Any]] = None
    ) -> tuple[List[Dict[str, Any]], int]:
        """获取文件列表"""
        with get_db_session() as session:
            # 构建查询
            query = session.query(FileRecord)

            # 应用筛选
            if filters:
                if filters.get("file_type"):
                    query = query.filter(FileRecord.mime_type.like(f"{filters['file_type']}%"))
                if filters.get("search"):
                    search_term = filters["search"]
                    query = query.filter(FileRecord.file_name.like(f"%{search_term}%"))

            # 获取总数
            total = query.count()

            # 分页
            offset = (page - 1) * page_size
            file_records = query.offset(offset).limit(page_size).all()

            # 转换为字典格式
            result_files = []
            for record in file_records:
                # 尝试从映射中找到file_id
                file_id = None
                for fid, path in self._file_id_to_path.items():
                    if path == record.file_path:
                        file_id = fid
                        break

                if not file_id:
                    file_id = str(record.id)  # 使用数据库ID作为fallback

                file_dict = self._file_record_to_dict(record, file_id)
                if file_dict:
                    result_files.append(file_dict)

            return result_files, total
    
    async def update(self, file_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """更新文件信息"""
        # 获取文件路径
        file_path = self._file_id_to_path.get(file_id)
        if not file_path:
            raise file_not_found(file_id)

        # 从数据库获取文件记录
        file_record = FileDAO.get_file_by_path(file_path)
        if not file_record:
            raise file_not_found(file_id)

        # 注意：当前FileRecord模型不支持description和tags字段
        # 这里只是返回当前的文件信息，实际更新需要扩展数据库模型
        return self._file_record_to_dict(file_record, file_id)
    
    async def delete(self, file_id: str) -> bool:
        """删除文件"""
        # 获取文件路径
        file_path = self._file_id_to_path.get(file_id)
        if not file_path:
            return False

        # 删除物理文件
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                self.log_info(f"物理文件删除成功: {file_path}")
            except Exception as e:
                self.log_error(f"物理文件删除失败: {file_path}", exception=e)

        # 从数据库删除记录
        with get_db_session() as session:
            file_record = session.query(FileRecord).filter(
                FileRecord.file_path == file_path
            ).first()
            if file_record:
                session.delete(file_record)
                session.commit()

        # 删除映射
        if file_id in self._file_id_to_path:
            del self._file_id_to_path[file_id]

        self.log_info(f"文件记录删除成功: {file_id}")
        return True
    
    async def get_file_path(self, file_id: str) -> Optional[str]:
        """获取文件的物理路径"""
        file_data = await self.get_by_id(file_id)
        if not file_data or not file_data.get("url"):
            return None
        
        filename = os.path.basename(file_data["url"])
        file_path = os.path.join(settings.upload_dir, filename)
        
        if os.path.exists(file_path):
            return file_path
        return None
    
    async def update_file_status(self, file_id: str, status: FileStatus) -> bool:
        """更新文件状态"""
        file_path = self._file_id_to_path.get(file_id)
        if not file_path:
            return False

        # 注意：当前FileRecord模型不支持status字段
        # 这里只是记录日志，实际更新需要扩展数据库模型
        self.log_info(f"文件状态更新: {file_id} -> {status}")
        return True
    
    async def get_files_by_status(self, status: FileStatus) -> List[Dict[str, Any]]:
        """根据状态获取文件列表"""
        # 注意：当前FileRecord模型不支持status字段
        # 这里返回空列表，实际实现需要扩展数据库模型
        return []
    
    async def get_file_stats(self) -> Dict[str, Any]:
        """获取文件统计信息"""
        # 使用FileDAO获取统计信息
        return FileDAO.get_file_statistics()
