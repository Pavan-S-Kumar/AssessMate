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
    role = Column(String, default="student") # student, teacher
    class_level = Column(String)
    board = Column(String, default="CBSE")
    stream = Column(String, nullable=True)

    tests = relationship("TestHistory", back_populates="user")
    teacher_tests = relationship("TeacherTest", back_populates="teacher")

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
    teacher_test_id = Column(Integer, ForeignKey("teacher_tests.id"), nullable=True)

    user = relationship("User", back_populates="tests")
    teacher_test = relationship("TeacherTest", back_populates="student_tests")

class TeacherTest(Base):
    __tablename__ = "teacher_tests"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id"))
    test_code = Column(String, unique=True, index=True)
    subject = Column(String)
    chapter = Column(String)
    board = Column(String)
    class_level = Column(String)
    stream = Column(String, nullable=True)
    is_active = Column(Integer, default=1) # Added to match existing DB schema
    is_deleted = Column(Integer, default=0) # 0 = No, 1 = Yes (hidden from teacher dashboard)
    due_date = Column(DateTime, nullable=True) # When the test expires
    test_data = Column(JSON) # Store selected questions and ideal answers
    allow_reattempts = Column(Integer, default=0) # 0 = No, 1 = Yes
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    teacher = relationship("User", back_populates="teacher_tests")
    student_tests = relationship("TestHistory", back_populates="teacher_test")

class MateChatHistory(Base):
    __tablename__ = "mate_chat_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    messages = Column(JSON) # Array of {role: str, content: str}
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User")
