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

def get_student_test_context(user_id: int, db: Session) -> str:
    # Fetch the most recent test
    recent_test = db.query(models.TestHistory).filter(models.TestHistory.user_id == user_id).order_by(models.TestHistory.timestamp.desc()).first()
    if not recent_test or not recent_test.results_data:
        return ""
        
    context_str = f"Subject: {recent_test.subject} | Chapter: {recent_test.chapter}\n"
    context_str += f"Total Score: {recent_test.total_score} | Acceptance Rate: {recent_test.acceptance_rate}%\n\n"
    
    qs = recent_test.test_data.get("questions", [])
    evals = recent_test.results_data.get("evaluations", [])
    
    # Extract only questions where the student lost marks
    for ev in evals:
        q = next((q for q in qs if q["id"] == ev["question_id"]), None)
        if q:
            q_max = 1
            if q["type"] == "long": q_max = 5
            elif q["type"] == "short": q_max = 2
            
            if ev["score"] < q_max:
                context_str += f"Question: {q['content']}\n"
                context_str += f"Student's Wrong Answer: {ev.get('user_answer', 'None')}\n"
                context_str += f"AI Evaluator Feedback: {ev.get('feedback', '')}\n\n"
                
    return context_str.strip()

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
    
    # Get student context
    student_context = get_student_test_context(user.id, db)
    
    # Get document context from RAG
    rag_results = []
    if request.message.strip():
        try:
            rag_results = search_knowledge(request.message, class_level=user.class_level)
        except Exception as e:
            print(f"RAG search error: {e}")
            
    document_context = "\n".join(rag_results) if rag_results else ""
    
    # Get Mate's response
    ai_response = chat_with_mate(messages, student_context, document_context)
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
    
    # Get student context
    student_context = get_student_test_context(chat.user_id, db)
    
    # Get document context from RAG
    # We need the user to get their class_level
    user = db.query(models.User).filter(models.User.id == chat.user_id).first()
    class_level = user.class_level if user else ""
    
    rag_results = []
    if request.message.strip():
        try:
            rag_results = search_knowledge(request.message, class_level=class_level)
        except Exception as e:
            print(f"RAG search error: {e}")
            
    document_context = "\n".join(rag_results) if rag_results else ""
    
    # Get Mate's response based on the entire history
    ai_response = chat_with_mate(messages, student_context, document_context)
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
