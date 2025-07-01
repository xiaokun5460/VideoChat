"""
文件导出相关API路由

提供处理结果导出功能，支持多种格式的文件导出和下载
"""

from typing import List
from fastapi import APIRouter, HTTPException, Path, Body
from utils.api_helpers import generate_timestamp_filename, create_temp_file_response, handle_api_exception
# from models import ExportRequest  # 暂时注释掉，因为这个模型可能不存在

# 创建路由器
router = APIRouter(prefix="/api", tags=["文件导出"])


def generate_vtt(transcription):
    """生成VTT字幕格式"""
    vtt_content = "WEBVTT\n\n"
    for segment in transcription:
        start = format_timestamp(segment['start'])
        end = format_timestamp(segment['end'])
        vtt_content += f"{start} --> {end}\n{segment['text']}\n\n"
    return vtt_content


def generate_srt(transcription):
    """生成SRT字幕格式"""
    srt_content = ""
    for i, segment in enumerate(transcription, 1):
        start = format_timestamp(segment['start'], srt=True)
        end = format_timestamp(segment['end'], srt=True)
        srt_content += f"{i}\n{start} --> {end}\n{segment['text']}\n\n"
    return srt_content


def generate_txt(transcription):
    """生成纯文本格式"""
    return "\n".join(segment['text'] for segment in transcription)


def format_timestamp(seconds, srt=False):
    """格式化时间戳"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    msecs = int((seconds - int(seconds)) * 1000)
    
    if srt:
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{msecs:03d}"
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{msecs:03d}"


@router.post(
    "/export/summary",
    summary="导出总结文件",
    description="导出总结为Markdown文件"
)
@handle_api_exception("导出总结")
async def export_summary(
    summary: str = Body(..., description="总结内容")
):
    # 生成文件名
    timestamp, filename = generate_timestamp_filename("summary", "md")

    # 创建临时文件响应
    return await create_temp_file_response(summary, filename, "text/markdown")


@router.post(
    "/export/{format}",
    summary="导出转录文件",
    description="导出转录为VTT/SRT/TXT格式"
)
@handle_api_exception("导出转录内容")
async def export_transcription(
    format: str = Path(..., description="导出格式", regex="^(vtt|srt|txt)$"),
    transcription: List[dict] = Body(..., description="转录数据列表")
):
    if not transcription:
        raise HTTPException(status_code=400, detail="No transcription data provided")

    # 生成内容和MIME类型
    if format == "vtt":
        content = generate_vtt(transcription)
        mime_type = "text/vtt"
    elif format == "srt":
        content = generate_srt(transcription)
        mime_type = "application/x-subrip"
    elif format == "txt":
        content = generate_txt(transcription)
        mime_type = "text/plain"
    else:
        raise HTTPException(status_code=400, detail="Unsupported format")

    # 生成文件名
    timestamp, filename = generate_timestamp_filename("transcription", format)

    # 创建临时文件响应
    return await create_temp_file_response(content, filename, mime_type)