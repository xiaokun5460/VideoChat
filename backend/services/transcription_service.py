"""
转录服务

处理音频转录相关功能
"""

import os
import uuid
import asyncio
import time
from datetime import datetime
from typing import Dict, List, Optional, Any

from .base import BaseService
from core.models import TranscriptionResult, TranscriptionSegment
from core.exceptions import transcription_failed, file_not_found, TranscriptionException, ErrorCodes
from utils.model_manager import model_manager
from utils.simple_cache import cache_transcription_simple, simple_cache_manager



class TranscriptionService(BaseService):
    """转录服务"""
    
    def __init__(self):
        super().__init__()
        self._transcriptions_db = {}  # 临时内存存储
        self._model_loaded = False
    
    async def create_transcription_task(
        self, 
        file_id: str, 
        file_path: str,
        language: str = "auto"
    ) -> str:
        """
        创建转录任务
        
        Args:
            file_id: 文件ID
            file_path: 文件路径
            language: 语言代码
            
        Returns:
            str: 转录任务ID
        """
        return await self.async_safe_execute(
            "创建转录任务",
            self._create_transcription_task_impl,
            file_id, file_path, language
        )
    
    async def _create_transcription_task_impl(
        self, 
        file_id: str, 
        file_path: str,
        language: str
    ) -> str:
        """转录任务创建实现"""
        # 验证文件存在
        if not os.path.exists(file_path):
            raise file_not_found(file_path)
        
        # 生成转录ID
        transcription_id = str(uuid.uuid4())
        
        # 创建转录记录
        transcription_data = {
            "id": transcription_id,
            "file_id": file_id,
            "task_id": None,  # 将由TaskService设置
            "segments": [],
            "language": language,
            "duration": 0.0,
            "status": "processing",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "file_path": file_path
        }
        
        self._transcriptions_db[transcription_id] = transcription_data
        
        # 启动异步转录处理
        asyncio.create_task(self._process_transcription(transcription_id, file_path, language))
        
        self.log_info(f"转录任务创建成功", transcription_id=transcription_id, file_id=file_id)
        return transcription_id
    
    async def _process_transcription(self, transcription_id: str, file_path: str, language: str):
        """处理转录"""
        try:
            # 加载模型（如果未加载）
            if not self._model_loaded:
                await self._load_transcription_model()
            
            # 执行转录
            segments = await self._transcribe_audio(file_path, language)
            
            # 计算总时长
            duration = max(seg["end"] for seg in segments) if segments else 0.0
            
            # 更新转录结果
            self._transcriptions_db[transcription_id].update({
                "segments": segments,
                "duration": duration,
                "status": "completed",
                "updated_at": datetime.now().isoformat()
            })
            
            self.log_info(f"转录完成", transcription_id=transcription_id, segments_count=len(segments))
            
        except Exception as e:
            # 转录失败
            self._transcriptions_db[transcription_id].update({
                "status": "failed",
                "error_message": str(e),
                "updated_at": datetime.now().isoformat()
            })
            self.log_error(f"转录失败", transcription_id=transcription_id, exception=e)
    
    async def _load_transcription_model(self):
        """加载转录模型"""
        self.log_info("开始加载转录模型")
        
        # 模拟模型加载时间
        await asyncio.sleep(2)
        
        self._model_loaded = True
        self.log_info("转录模型加载完成")
    
    @cache_transcription_simple(ttl_seconds=7200)  # 缓存2小时
    async def _transcribe_audio(self, file_path: str, language: str) -> List[Dict[str, Any]]:
        """转录音频文件"""
        self.log_info(f"开始转录音频文件: {file_path}")

        # 检查文件是否存在
        if not os.path.exists(file_path):
            raise file_not_found(f"音频文件不存在: {file_path}")

        # 检查系统资源（简化版）
        try:
            import psutil
            memory_usage = psutil.virtual_memory().percent / 100.0
            if memory_usage > 0.9:  # 内存使用超过90%
                self.log_error(f"系统内存不足: {memory_usage:.1%}")
                raise TranscriptionException("系统资源不足，请稍后重试", ErrorCodes.TRANSCRIPTION_FAILED)
        except Exception:
            # 如果资源检查失败，继续执行
            pass

        try:
            start_time = time.time()

            # 获取Whisper模型
            model = await model_manager.get_model()
            self.log_info("✅ Whisper模型获取成功")

            # 执行真实转录
            segments_generator = model.transcribe(
                file_path,
                beam_size=5,
                language=language if language != "auto" else None,
                vad_filter=True
            )

            transcription = []
            segments, _ = segments_generator  # info未使用，用_忽略

            for i, segment in enumerate(segments):
                transcription.append({
                    "id": f"seg_{i}",
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text.strip(),
                    "speaker": f"Speaker {(i % 2) + 1}",  # 简单的说话人分配
                    "confidence": getattr(segment, 'avg_logprob', 0.85)  # 使用实际置信度或默认值
                })

                # 让出控制权，允许其他任务执行
                await asyncio.sleep(0)

            # 释放模型引用
            await model_manager.release_model()

            processing_time = time.time() - start_time
            self.log_info(f"音频转录完成: {len(transcription)}个片段, 耗时: {processing_time:.2f}秒")

            return transcription

        except Exception as e:
            # 确保释放模型引用
            await model_manager.release_model()
            self.log_error(f"音频转录失败: {str(e)}")
            raise TranscriptionException(f"转录处理失败: {str(e)}", ErrorCodes.TRANSCRIPTION_FAILED)
    
    async def get_transcription_by_id(self, transcription_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取转录结果"""
        return self._transcriptions_db.get(transcription_id)
    
    async def get_transcription_by_file_id(self, file_id: str) -> Optional[Dict[str, Any]]:
        """根据文件ID获取转录结果"""
        for transcription in self._transcriptions_db.values():
            if transcription["file_id"] == file_id:
                return transcription
        return None
    
    async def get_transcription_by_task_id(self, task_id: str) -> Optional[Dict[str, Any]]:
        """根据任务ID获取转录结果"""
        for transcription in self._transcriptions_db.values():
            if transcription.get("task_id") == task_id:
                return transcription
        return None
    
    async def get_transcription_list(
        self, 
        page: int = 1, 
        page_size: int = 20,
        status: Optional[str] = None,
        file_id: Optional[str] = None
    ) -> tuple[List[Dict[str, Any]], int]:
        """获取转录结果列表"""
        all_transcriptions = list(self._transcriptions_db.values())
        
        # 应用筛选
        if status:
            all_transcriptions = [t for t in all_transcriptions if t["status"] == status]
        if file_id:
            all_transcriptions = [t for t in all_transcriptions if t["file_id"] == file_id]
        
        # 按创建时间倒序排序
        all_transcriptions.sort(key=lambda x: x["created_at"], reverse=True)
        
        # 分页
        total = len(all_transcriptions)
        start = (page - 1) * page_size
        end = start + page_size
        page_transcriptions = all_transcriptions[start:end]
        
        return page_transcriptions, total
    
    async def delete_transcription(self, transcription_id: str) -> bool:
        """删除转录结果"""
        if transcription_id in self._transcriptions_db:
            del self._transcriptions_db[transcription_id]
            self.log_info(f"转录结果删除成功: {transcription_id}")
            return True
        return False
    
    async def export_transcription(
        self, 
        transcription_id: str, 
        format: str = "txt"
    ) -> Dict[str, Any]:
        """导出转录结果"""
        transcription = await self.get_transcription_by_id(transcription_id)
        if not transcription:
            raise TranscriptionException("转录结果不存在", ErrorCodes.NOT_FOUND)
        
        if transcription["status"] != "completed":
            raise TranscriptionException("转录尚未完成", ErrorCodes.TRANSCRIPTION_FAILED)
        
        segments = transcription["segments"]
        
        if format == "txt":
            content = "\n".join(seg["text"] for seg in segments)
        elif format == "srt":
            content = self._generate_srt_content(segments)
        elif format == "vtt":
            content = self._generate_vtt_content(segments)
        elif format == "json":
            import json
            content = json.dumps(segments, ensure_ascii=False, indent=2)
        else:
            raise TranscriptionException(f"不支持的导出格式: {format}", ErrorCodes.INVALID_REQUEST)
        
        return {
            "format": format,
            "content": content,
            "filename": f"transcription_{transcription_id}.{format}"
        }
    
    def _generate_srt_content(self, segments: List[Dict[str, Any]]) -> str:
        """生成SRT格式内容"""
        srt_content = []
        for i, seg in enumerate(segments, 1):
            start_time = self._seconds_to_srt_time(seg["start"])
            end_time = self._seconds_to_srt_time(seg["end"])
            srt_content.append(f"{i}\n{start_time} --> {end_time}\n{seg['text']}\n")
        return "\n".join(srt_content)
    
    def _generate_vtt_content(self, segments: List[Dict[str, Any]]) -> str:
        """生成VTT格式内容"""
        vtt_content = ["WEBVTT\n"]
        for seg in segments:
            start_time = self._seconds_to_vtt_time(seg["start"])
            end_time = self._seconds_to_vtt_time(seg["end"])
            vtt_content.append(f"{start_time} --> {end_time}\n{seg['text']}\n")
        return "\n".join(vtt_content)
    
    def _seconds_to_srt_time(self, seconds: float) -> str:
        """将秒数转换为SRT时间格式"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millisecs = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millisecs:03d}"
    
    def _seconds_to_vtt_time(self, seconds: float) -> str:
        """将秒数转换为VTT时间格式"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = seconds % 60
        return f"{hours:02d}:{minutes:02d}:{secs:06.3f}"
    
    async def get_transcription_stats(self) -> Dict[str, Any]:
        """获取转录统计信息"""
        all_transcriptions = list(self._transcriptions_db.values())
        
        stats = {
            "total_transcriptions": len(all_transcriptions),
            "by_status": {},
            "total_duration": 0.0,
            "total_segments": 0
        }
        
        # 按状态统计
        for transcription in all_transcriptions:
            status = transcription["status"]
            stats["by_status"][status] = stats["by_status"].get(status, 0) + 1
            
            if status == "completed":
                stats["total_duration"] += transcription.get("duration", 0.0)
                stats["total_segments"] += len(transcription.get("segments", []))
        
        return stats

    async def set_task_id(self, transcription_id: str, task_id: str) -> bool:
        """设置转录的任务ID"""
        if transcription_id in self._transcriptions_db:
            self._transcriptions_db[transcription_id]["task_id"] = task_id
            self._transcriptions_db[transcription_id]["updated_at"] = datetime.now().isoformat()
            return True
        return False
    
    async def get_transcription_list(
        self, 
        page: int = 1, 
        page_size: int = 20,
        filters: Optional[Dict[str, Any]] = None
    ) -> tuple[List[TranscriptionResult], int]:
        """获取转录结果列表"""
        all_transcriptions = list(self._transcriptions_db.values())
        
        # 应用筛选
        if filters:
            if filters.get("file_id"):
                all_transcriptions = [t for t in all_transcriptions if t["file_id"] == filters["file_id"]]
            if filters.get("language"):
                all_transcriptions = [t for t in all_transcriptions if t["language"] == filters["language"]]
            if filters.get("status"):
                all_transcriptions = [t for t in all_transcriptions if t["status"] == filters["status"]]
        
        total = len(all_transcriptions)
        
        # 分页
        start = (page - 1) * page_size
        end = start + page_size
        page_transcriptions = all_transcriptions[start:end]
        
        # 转换为TranscriptionResult模型
        result_list = []
        for t_data in page_transcriptions:
            result_list.append(TranscriptionResult(**t_data))
        
        return result_list, total
    
    async def get_transcription(self, transcription_id: str) -> Optional[TranscriptionResult]:
        """获取转录结果"""
        transcription_data = self._transcriptions_db.get(transcription_id)
        if transcription_data:
            return TranscriptionResult(**transcription_data)
        return None
    
    async def export_transcription(self, transcription: TranscriptionResult, format: str) -> tuple[str, str, str]:
        """导出转录结果"""
        segments = transcription.segments
        
        if format == "txt":
            content = "\n".join(seg.text for seg in segments)
            content_type = "text/plain"
        elif format == "srt":
            content = self._generate_srt_content(segments)
            content_type = "text/srt"
        elif format == "vtt":
            content = self._generate_vtt_content(segments)
            content_type = "text/vtt"
        elif format == "json":
            import json
            content = json.dumps([seg.model_dump() for seg in segments], ensure_ascii=False, indent=2)
            content_type = "application/json"
        else:
            raise TranscriptionException(f"不支持的导出格式: {format}", ErrorCodes.INVALID_REQUEST)
        
        filename = f"transcription_{transcription.id}.{format}"
        return content, content_type, filename
    
    async def get_transcription_stats(self) -> Dict[str, Any]:
        """获取转录统计信息"""
        all_transcriptions = list(self._transcriptions_db.values())
        
        stats = {
            "total": len(all_transcriptions),
            "by_language": {},
            "by_status": {},
            "total_duration": 0,
            "avg_duration": 0
        }
        
        # 按语言统计
        languages = {}
        for t in all_transcriptions:
            lang = t.get("language", "unknown")
            languages[lang] = languages.get(lang, 0) + 1
        stats["by_language"] = languages
        
        # 按状态统计
        statuses = {}
        for t in all_transcriptions:
            status = t.get("status", "unknown")
            statuses[status] = statuses.get(status, 0) + 1
        stats["by_status"] = statuses
        
        # 时长统计
        total_duration = sum(t.get("duration", 0) for t in all_transcriptions)
        stats["total_duration"] = total_duration
        if len(all_transcriptions) > 0:
            stats["avg_duration"] = total_duration / len(all_transcriptions)
        
        return stats
    
    async def search_transcriptions(
        self,
        search_filters: Dict[str, Any],
        page: int = 1,
        page_size: int = 20
    ) -> tuple[List[Dict[str, Any]], int]:
        """搜索转录内容"""
        query = search_filters.get("query", "")
        file_id = search_filters.get("file_id")
        
        results = []
        for transcription_id, transcription_data in self._transcriptions_db.items():
            # 文件ID筛选
            if file_id and transcription_data.get("file_id") != file_id:
                continue
            
            # 在转录文本中搜索
            for segment in transcription_data.get("segments", []):
                if query.lower() in segment.get("text", "").lower():
                    results.append({
                        "transcription_id": transcription_id,
                        "segment": segment,
                        "file_id": transcription_data.get("file_id"),
                        "language": transcription_data.get("language")
                    })
        
        total = len(results)
        
        # 分页
        start = (page - 1) * page_size
        end = start + page_size
        page_results = results[start:end]
        
        return page_results, total