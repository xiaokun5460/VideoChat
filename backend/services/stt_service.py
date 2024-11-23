from faster_whisper import WhisperModel
import asyncio
from typing import Optional

model = WhisperModel("tiny")

# 全局变量来跟踪转录状态
should_stop = False

async def transcribe_audio(file_path: str) -> list:
    global should_stop
    should_stop = False
    
    try:
        # 在这里添加检查点
        if should_stop:
            raise asyncio.CancelledError("Transcription cancelled")
            
        segments, info = model.transcribe(file_path)
        
        transcription = []
        for segment in segments:
            transcription.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text
            })
        
        # 在耗时操作的关键位置添加检查
        if should_stop:
            raise asyncio.CancelledError("Transcription cancelled")
            
        return transcription
        
    except asyncio.CancelledError:
        should_stop = True
        raise
    finally:
        should_stop = False

# 添加一个新函数来停止转录
def stop_transcription():
    global should_stop
    should_stop = True 