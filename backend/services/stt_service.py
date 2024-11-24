from faster_whisper import WhisperModel
import asyncio
from typing import Optional
from backend.config import STT_CONFIG

model = WhisperModel(STT_CONFIG["whisper_model"])

# 全局变量来跟踪转录状态
should_stop = False

async def transcribe_audio(file_path: str) -> list:
    global should_stop
    should_stop = False
    
    try:
        # 使用 segments_chunk 来获取分段的转录结果
        segments_generator = model.transcribe(file_path, beam_size=1)
        
        transcription = []
        segments, info = segments_generator
        
        # 将 segments 转换为列表，这样我们可以在迭代过程中检查停止标志
        for segment in segments:
            if should_stop:
                raise asyncio.CancelledError("Transcription cancelled")
                
            transcription.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text
            })
            
            # 每处理一个片段后让出控制权
            await asyncio.sleep(0)
            
        return transcription
        
    except asyncio.CancelledError:
        should_stop = True
        raise
    finally:
        should_stop = False

def stop_transcription():
    global should_stop
    should_stop = True 