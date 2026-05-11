from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    class_level: str
    board: str
    stream: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    class_level: str
    board: str
    stream: Optional[str] = None

    class Config:
        orm_mode = True

class TestGenerateRequest(BaseModel):
    subject: str
    chapter: str
    subtopics: List[str]
    mode: str
    mcq_count: int
    short_count: int
    long_count: int
    difficulty: str
    include_critical_thinking: bool = True

class AnswerSubmission(BaseModel):
    question_id: str
    answer: str
    time_taken_seconds: Optional[int] = 0
    image_data: Optional[List[str]] = None

class TestEvaluationRequest(BaseModel):
    test_id: int
    answers: List[AnswerSubmission]

class ChatMessage(BaseModel):
    role: str
    content: str
    image_data: Optional[List[str]] = None

class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None
    image_data: Optional[List[str]] = None
