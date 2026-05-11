from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    class_level = Column(String)
    board = Column(String, default="CBSE")
    stream = Column(String, nullable=True)

    tests = relationship("TestHistory", back_populates="user")

class TestHistory(Base):
    __tablename__ = "test_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    subject = Column(String)
    chapter = Column(String)
    mode = Column(String) # MCQ, Balanced, Custom
    total_score = Column(Float, nullable=True)
    critical_thinking_score = Column(Float, nullable=True)
    efficiency_score = Column(Float, nullable=True)
    acceptance_rate = Column(Float, nullable=True)
    test_data = Column(JSON) # Store generated questions
    results_data = Column(JSON, nullable=True) # Store evaluation results

    user = relationship("User", back_populates="tests")

class MateChatHistory(Base):
    __tablename__ = "mate_chat_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    messages = Column(JSON) # Array of {role: str, content: str}
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User")
