from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from gemini_service import chat_with_mate, model
from rag import search_knowledge

router = APIRouter(prefix="/chat", tags=["chat"])

def get_user_by_email(email: str, db: Session):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        user = db.query(models.User).filter(models.User.id == 1).first() # Fallback
    return user

def get_student_test_context(user_id: int, db: Session, current_test_id: int = None) -> str:
    context_str = ""
    
    # 1. Fetch 5 most recent tests
    recent_tests = db.query(models.TestHistory).filter(
        models.TestHistory.user_id == user_id,
        models.TestHistory.total_score.isnot(None) # Only tests that have been completed
    ).order_by(models.TestHistory.timestamp.desc()).limit(5).all()

    if not recent_tests:
        return "No recent test data available yet."

    context_str += "--- STUDENT TEST HISTORY (Last 5 Tests, most recent first) ---\n"
    
    for i, test in enumerate(recent_tests):
        is_current = current_test_id and test.id == current_test_id
        # Index 0 is the absolute most recent test taken
        recency = "MOST RECENT TEST" if i == 0 else f"{i+1}th Most Recent"
        marker = " [CURRENTLY VIEWING THIS PAGE]" if is_current else ""
        
        context_str += f"{recency}: {test.subject} - {test.chapter}{marker}\n"
        context_str += f"- Taken at: {test.timestamp.strftime('%Y-%m-%d %I:%M %p UTC')}\n"
        context_str += f"- Score: {test.total_score} | Acceptance: {test.acceptance_rate}%\n"
        
        evals = test.results_data.get("evaluations", []) if test.results_data else []
        qs = test.test_data.get("questions", []) if test.test_data else []
        
        # Identify failed/struggled topics (score < 60% of max)
        failed_topics = []
        for ev in evals:
            q = next((q for q in qs if q["id"] == ev["question_id"]), None)
            if q:
                q_max = q.get("max_score", 1)
                if ev.get("score", 0) < (q_max * 0.6):
                    failed_topics.append({
                        "question": q["content"],
                        "feedback": ev.get("feedback", ""),
                        "type": q["type"]
                    })
        
        if failed_topics:
            context_str += "- Areas of struggle:\n"
            for f in failed_topics[:2]: # Top 2 per test
                context_str += f"  * Q: {f['question'][:80]}...\n"
                context_str += f"    Feedback: {f['feedback']}\n"
        
        context_str += "\n"
            
    return context_str.strip()

def get_teacher_test_context(user: models.User, db: Session) -> str:
    if user.role == "teacher":
        # Show tests they created
        tests = db.query(models.TeacherTest).filter(models.TeacherTest.teacher_id == user.id, models.TeacherTest.is_deleted == 0).order_by(models.TeacherTest.created_at.desc()).limit(5).all()
        if not tests: return ""
        context = "\n--- YOUR CREATED TESTS (TEACHER VIEW) ---\n"
        for t in tests:
            context += f"- [{t.test_code}] {t.subject}: {t.chapter} ({t.class_level} {t.board})\n"
        return context
    else:
        # Show tests available for their class
        tests = db.query(models.TeacherTest).filter(
            models.TeacherTest.class_level == user.class_level,
            models.TeacherTest.board == user.board,
            models.TeacherTest.is_active == 1,
            models.TeacherTest.is_deleted == 0
        ).limit(5).all()
        if not tests: return ""
        context = "\n--- AVAILABLE CLASS TESTS (STUDENT VIEW) ---\n"
        for t in tests:
            context += f"- {t.subject}: {t.chapter} (Code: {t.test_code})\n"
        return context

@router.get("/{email}/history")
def get_chat_history(email: str, db: Session = Depends(get_db)):
    user = get_user_by_email(email, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    chats = db.query(models.MateChatHistory).filter(
        models.MateChatHistory.user_id == user.id
    ).order_by(models.MateChatHistory.updated_at.desc()).all()
    
    return [
        {
            "id": c.id,
            "title": c.title,
            "updated_at": c.updated_at.isoformat()
        } for c in chats
    ]

@router.post("/{email}/new")
def start_new_chat(email: str, request: schemas.ChatRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(email, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Generate a brief title for the chat based on the first message
    try:
        title_resp = model.generate_content(f"Summarize this prompt into a very short title (max 5 words) for a chat history list: '{request.message}'. Return ONLY the title string without quotes.")
        title = title_resp.text.strip().replace('"', '')
    except:
        title = request.message[:30] + "..." if len(request.message) > 30 else request.message
        
    # Build initial message array
    messages = [{"role": "user", "content": request.message, "image_data": request.image_data}]
    
    # Extract test_id from URL context if present (e.g. /results/64)
    current_test_id = None
    if request.context and "/results/" in request.context:
        try:
            current_test_id = int(request.context.split("/results/")[1].split("/")[0])
        except:
            pass

    # Get student context (Recent performance)
    student_context = get_student_test_context(user.id, db, current_test_id)
    
    # Get teacher test context (Created tests or Available class tests)
    teacher_context = get_teacher_test_context(user, db)
    
    # Combine history context for Mate
    history_context = student_context + "\n" + teacher_context
    
    # Get document context from RAG
    rag_results = []
    if request.message.strip():
        try:
            rag_results = search_knowledge(request.message, class_level=user.class_level)
        except Exception as e:
            print(f"RAG search error: {e}")
            
    document_context = "\n".join(rag_results) if rag_results else ""
    
    # Get Mate's response
    ai_response = chat_with_mate(messages, history_context, document_context)
    messages.append({"role": "assistant", "content": ai_response})
    
    # Save to DB
    new_chat = models.MateChatHistory(
        user_id=user.id,
        title=title,
        messages=messages
    )
    db.add(new_chat)
    db.commit()
    db.refresh(new_chat)
    
    return {
        "chat_id": new_chat.id,
        "title": new_chat.title,
        "response": ai_response,
        "messages": messages
    }

@router.get("/{chat_id}")
def get_chat_messages(chat_id: int, db: Session = Depends(get_db)):
    chat = db.query(models.MateChatHistory).filter(models.MateChatHistory.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return {
        "id": chat.id,
        "title": chat.title,
        "messages": chat.messages
    }

@router.post("/{chat_id}/message")
def send_message(chat_id: int, request: schemas.ChatRequest, db: Session = Depends(get_db)):
    chat = db.query(models.MateChatHistory).filter(models.MateChatHistory.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    messages = chat.messages or []
    messages.append({"role": "user", "content": request.message, "image_data": request.image_data})
    
    # Extract test_id from URL context if present
    current_test_id = None
    if request.context and "/results/" in request.context:
        try:
            current_test_id = int(request.context.split("/results/")[1].split("/")[0])
        except:
            pass

    # Get student context
    student_context = get_student_test_context(chat.user_id, db, current_test_id)
    
    # Get teacher context
    user = db.query(models.User).filter(models.User.id == chat.user_id).first()
    teacher_context = get_teacher_test_context(user, db) if user else ""
    
    # Combine history context
    history_context = student_context + "\n" + teacher_context
    
    # Get document context from RAG
    class_level = user.class_level if user else ""
    
    rag_results = []
    if request.message.strip():
        try:
            rag_results = search_knowledge(request.message, class_level=class_level)
        except Exception as e:
            print(f"RAG search error: {e}")
            
    document_context = "\n".join(rag_results) if rag_results else ""
    
    # Get Mate's response based on the entire history
    ai_response = chat_with_mate(messages, history_context, document_context)
    messages.append({"role": "assistant", "content": ai_response})
    
    # Save back to DB
    # Note: SQLAlchemy JSON columns need to be re-assigned or flagged as modified
    from sqlalchemy.orm.attributes import flag_modified
    chat.messages = messages
    flag_modified(chat, "messages")
    db.commit()
    
    return {
        "response": ai_response,
        "messages": messages
    }
