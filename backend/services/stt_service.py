from faster_whisper import WhisperModel

model = WhisperModel("tiny")

async def transcribe_audio(file_path: str):
    segments, info = model.transcribe(file_path)
    
    transcription = []
    for segment in segments:
        transcription.append({
            "start": segment.start,
            "end": segment.end,
            "text": segment.text
        })
    
    return transcription 