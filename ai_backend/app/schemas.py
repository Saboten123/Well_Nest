from pydantic import BaseModel
from typing import List, Optional

class ChatRequest(BaseModel):
    message: str

class Citation(BaseModel):
    source: str
    url: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str
    citations: List[Citation] = []
