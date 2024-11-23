from pydantic import BaseModel
from typing import List, Optional

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    context: str

class TranscriptionSegment(BaseModel):
    start: float
    end: float
    text: str 