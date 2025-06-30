import asyncio
import os
import threading
import time
import uuid
from typing import Dict, Optional, Callable, Any
from dataclasses import dataclass, asdict
from enum import Enum
import yt_dlp
from pathlib import Path
import tempfile
import shutil
from config import DOWNLOAD_CONFIG


class DownloadStatus(Enum):
    PENDING = "pending"
    DOWNLOADING = "downloading"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class DownloadProgress:
    task_id: str
    url: str
    status: DownloadStatus
    progress: float = 0.0
    speed: str = "0 B/s"
    eta: str = "Unknown"
    file_size: str = "Unknown"
    downloaded_bytes: int = 0
    total_bytes: int = 0
    filename: str = ""
    error_message: str = ""
    created_at: float = 0.0
    completed_at: Optional[float] = None


class VideoDownloadService:
    def __init__(self, download_dir: Optional[str] = None):
        self.download_dir = Path(download_dir or DOWNLOAD_CONFIG["download_dir"])
        self.download_dir.mkdir(exist_ok=True)
        self.downloads: Dict[str, DownloadProgress] = {}
        self.active_downloads: Dict[str, threading.Thread] = {}
        self.cancelled_downloads: set = set()
        self.config = DOWNLOAD_CONFIG
        
    def _get_ydl_opts(self, output_path: str, progress_callback: Callable) -> dict:
        """获取yt-dlp配置选项"""
        opts = {
            'outtmpl': output_path,
            'progress_hooks': [progress_callback],
            'socket_timeout': self.config["socket_timeout"],
            'retries': self.config["retries"],
            'fragment_retries': self.config["fragment_retries"],
            'http_chunk_size': self.config["http_chunk_size"],
        }

        # 合并基础配置
        opts.update(self.config["ytdl_opts"])

        return opts
    
    def _progress_hook(self, task_id: str, d: dict):
        """yt-dlp进度回调函数"""
        if task_id in self.cancelled_downloads:
            raise yt_dlp.DownloadError("Download cancelled by user")
            
        if task_id not in self.downloads:
            return
            
        download = self.downloads[task_id]
        
        if d['status'] == 'downloading':
            download.status = DownloadStatus.DOWNLOADING
            
            # 更新进度信息
            if 'total_bytes' in d and d['total_bytes']:
                download.total_bytes = d['total_bytes']
                download.file_size = self._format_bytes(d['total_bytes'])
                
            if 'downloaded_bytes' in d:
                download.downloaded_bytes = d['downloaded_bytes']
                if download.total_bytes > 0:
                    download.progress = (d['downloaded_bytes'] / download.total_bytes) * 100
                    
            if 'speed' in d and d['speed']:
                download.speed = self._format_bytes(d['speed']) + "/s"
                
            if 'eta' in d and d['eta']:
                download.eta = self._format_time(d['eta'])
                
            if 'filename' in d:
                download.filename = os.path.basename(d['filename'])
                
        elif d['status'] == 'finished':
            download.status = DownloadStatus.COMPLETED
            download.progress = 100.0
            download.completed_at = time.time()
            if 'filename' in d:
                download.filename = os.path.basename(d['filename'])
    
    def _format_bytes(self, bytes_value: int) -> str:
        """格式化字节数"""
        if bytes_value == 0:
            return "0 B"

        units = ['B', 'KB', 'MB', 'GB', 'TB']
        i = 0
        size = float(bytes_value)
        while size >= 1024 and i < len(units) - 1:
            size /= 1024
            i += 1

        return f"{size:.1f} {units[i]}"
    
    def _format_time(self, seconds: int) -> str:
        """格式化时间"""
        if seconds is None:
            return "Unknown"
        
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        seconds = seconds % 60
        
        if hours > 0:
            return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        else:
            return f"{minutes:02d}:{seconds:02d}"
    
    def _download_worker(self, task_id: str, url: str, output_path: str):
        """优化的下载工作线程"""
        try:
            progress_callback = lambda d: self._progress_hook(task_id, d)
            ydl_opts = self._get_ydl_opts(output_path, progress_callback)

            # 添加更多错误处理和性能优化
            ydl_opts.update({
                'concurrent_fragment_downloads': 4,  # 并发片段下载
                'buffersize': 16384,  # 缓冲区大小
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            })

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                # 检查是否被取消
                if task_id in self.cancelled_downloads:
                    self.downloads[task_id].status = DownloadStatus.CANCELLED
                    return

                # 预先提取信息以验证URL
                try:
                    info = ydl.extract_info(url, download=False)
                    if not info:
                        raise yt_dlp.DownloadError("无法提取视频信息")

                    # 更新文件名
                    if 'title' in info:
                        safe_title = "".join(c for c in info['title'] if c.isalnum() or c in (' ', '-', '_', '.')).rstrip()
                        self.downloads[task_id].filename = f"{safe_title[:50]}.{info.get('ext', 'mp4')}"

                except Exception as e:
                    raise yt_dlp.DownloadError(f"URL验证失败: {str(e)}")

                # 开始下载
                self.downloads[task_id].status = DownloadStatus.DOWNLOADING
                ydl.download([url])

                # 检查下载是否成功完成
                if task_id not in self.cancelled_downloads:
                    self.downloads[task_id].status = DownloadStatus.COMPLETED
                    self.downloads[task_id].completed_at = time.time()

        except yt_dlp.DownloadError as e:
            if task_id in self.cancelled_downloads:
                self.downloads[task_id].status = DownloadStatus.CANCELLED
            else:
                self.downloads[task_id].status = DownloadStatus.FAILED
                self.downloads[task_id].error_message = str(e)
        except Exception as e:
            self.downloads[task_id].status = DownloadStatus.FAILED
            self.downloads[task_id].error_message = f"意外错误: {str(e)}"
        finally:
            # 清理活动下载记录
            if task_id in self.active_downloads:
                del self.active_downloads[task_id]
            if task_id in self.cancelled_downloads:
                self.cancelled_downloads.remove(task_id)
    
    def start_download(self, url: str, custom_filename: Optional[str] = None) -> str:
        """优化的开始下载视频"""
        # 检查并发下载限制
        active_count = len([t for t in self.active_downloads.values() if t.is_alive()])
        if active_count >= self.config["max_concurrent_downloads"]:
            raise Exception(f"已达到最大并发下载数限制 ({self.config['max_concurrent_downloads']})")

        # 验证URL格式
        if not url.strip():
            raise Exception("URL不能为空")

        # 检查URL是否为支持的平台
        supported = any(platform in url.lower() for platform in self.config["supported_platforms"])
        if not supported and not url.startswith(('http://', 'https://')):
            raise Exception("不支持的URL格式或平台")

        task_id = str(uuid.uuid4())

        # 生成输出文件路径
        if custom_filename:
            # 确保文件名安全
            safe_filename = "".join(c for c in custom_filename if c.isalnum() or c in (' ', '-', '_', '.')).rstrip()
            output_path = str(self.download_dir / f"{safe_filename}.%(ext)s")
        else:
            output_path = str(self.download_dir / f"downloaded_video_{task_id}.%(ext)s")

        # 创建下载进度对象
        download_progress = DownloadProgress(
            task_id=task_id,
            url=url,
            status=DownloadStatus.PENDING,
            created_at=time.time()
        )

        self.downloads[task_id] = download_progress

        # 启动下载线程
        download_thread = threading.Thread(
            target=self._download_worker,
            args=(task_id, url, output_path),
            daemon=True,
            name=f"download-{task_id[:8]}"
        )

        self.active_downloads[task_id] = download_thread
        download_thread.start()

        return task_id
    
    def get_download_progress(self, task_id: str) -> Optional[Dict[str, Any]]:
        """获取下载进度"""
        if task_id not in self.downloads:
            return None
        
        download = self.downloads[task_id]
        return asdict(download)
    
    def cancel_download(self, task_id: str) -> bool:
        """取消下载"""
        if task_id not in self.downloads:
            return False
        
        # 标记为取消
        self.cancelled_downloads.add(task_id)
        self.downloads[task_id].status = DownloadStatus.CANCELLED
        
        # 等待线程结束
        if task_id in self.active_downloads:
            thread = self.active_downloads[task_id]
            if thread.is_alive():
                # 给线程一些时间来响应取消
                thread.join(timeout=5.0)
        
        return True
    
    def get_all_downloads(self) -> Dict[str, Dict[str, Any]]:
        """获取所有下载任务"""
        return {task_id: asdict(download) for task_id, download in self.downloads.items()}
    
    def cleanup_completed_downloads(self, max_age_hours: int = 24):
        """清理完成的下载记录"""
        current_time = time.time()
        to_remove = []
        
        for task_id, download in self.downloads.items():
            if download.status in [DownloadStatus.COMPLETED, DownloadStatus.FAILED, DownloadStatus.CANCELLED]:
                if download.completed_at and (current_time - download.completed_at) > (max_age_hours * 3600):
                    to_remove.append(task_id)
        
        for task_id in to_remove:
            del self.downloads[task_id]
    
    def get_downloaded_file_path(self, task_id: str) -> Optional[str]:
        """获取下载完成的文件路径"""
        if task_id not in self.downloads:
            return None
        
        download = self.downloads[task_id]
        if download.status != DownloadStatus.COMPLETED or not download.filename:
            return None
        
        file_path = self.download_dir / download.filename
        if file_path.exists():
            return str(file_path)
        
        return None


# 全局下载服务实例
download_service = VideoDownloadService()
