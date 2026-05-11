from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from rag import search_knowledge
from gemini_service import generate_assessment, evaluate_answer, batch_evaluate_answers

router = APIRouter(prefix="/tests", tags=["tests"])

@router.post("/generate")
def generate_test(request: schemas.TestGenerateRequest, email: str = "student@example.com", db: Session = Depends(get_db)):
    # 1. Retrieve user by email
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        # Fallback to id 1 if not found for robust prototyping
        user = db.query(models.User).filter(models.User.id == 1).first()
    
    user_id = user.id if user else 1
    class_level = user.class_level if user else "X"
    
    # 2. Extract chapters
    chapters = [c.strip() for c in request.chapter.split(",") if c.strip()]
    
    # 3. Search RAG for context
    all_context_chunks = []
    for chap in chapters:
        query = " ".join(request.subtopics) if request.subtopics else f"All subtopics of {chap}"
        chunks = search_knowledge(
            query=query, 
            class_level=class_level, 
            subject=request.subject, 
            chapter=chap,
            n_results=3
        )
        all_context_chunks.extend(chunks)
        
    context = "\n\n".join(all_context_chunks) if all_context_chunks else "Standard knowledge for this topic."
    
    # 4. Generate Assessment via Gemini
    config = {
        "mcq_count": request.mcq_count,
        "short_count": request.short_count,
        "long_count": request.long_count,
        "difficulty": request.difficulty,
        "include_critical_thinking": request.include_critical_thinking
    }
    
    assessment_data = generate_assessment(
        context=context,
        subject=request.subject,
        chapter=request.chapter,
        mode=request.mode,
        config=config
    )
    
    # Inject config so we can retrieve difficulty later
    if "config" not in assessment_data:
        assessment_data["config"] = config
    
    # 5. Store in DB
    new_test = models.TestHistory(
        user_id=user_id,
        subject=request.subject,
        chapter=request.chapter,
        mode=request.mode,
        test_data=assessment_data
    )
    db.add(new_test)
    db.commit()
    db.refresh(new_test)
    
    return {"test_id": new_test.id, "assessment": assessment_data}

@router.post("/evaluate")
def evaluate_test(request: schemas.TestEvaluationRequest, db: Session = Depends(get_db)):
    test = db.query(models.TestHistory).filter(models.TestHistory.id == request.test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
        
    questions = test.test_data.get("questions", [])
    
    results = []
    total_score = 0
    max_possible_score = 0
    
    total_efficiency = 0
    efficiency_count = 0
    
    ct_score = 0
    ct_count = 0
    
    correct_count = 0
    total_questions = len(questions)
    
    batch_eval_payload = []
    subjective_questions_map = {}
    answers_map = {ans.question_id: ans for ans in request.answers}
    
    for ans in request.answers:
        q = next((q for q in questions if q.get("id") == ans.question_id), None)
        if not q:
            continue
            
        time_taken = ans.time_taken_seconds or 0
        if time_taken <= 30:
            eff = 10
        elif time_taken <= 60:
            eff = 9
        else:
            eff = 5
        total_efficiency += eff
        efficiency_count += 1
        
        is_ct = q.get("is_critical_thinking", False)
        if is_ct:
            ct_count += 1
            
        if q["type"] == "mcq":
            max_possible_score += 1
            is_correct = ans.answer.strip().lower() == q["ideal_answer"].strip().lower()
            score = 1 if is_correct else 0
            
            if is_correct:
                correct_count += 1
            
            if is_ct and is_correct:
                ct_score += 1
                
            feedback = "Correct." if is_correct else f"Incorrect. Ideal answer is: {q['ideal_answer']}"
            if "explanation" in q:
                feedback += f" Explanation: {q['explanation']}"
                
            results.append({
                "question_id": ans.question_id,
                "score": score,
                "feedback": feedback,
                "user_answer": ans.answer,
                "image_data": ans.image_data
            })
            total_score += score
        else:
            # Subjective evaluation - prep for batching
            q_max_score = 5 if q["type"] == "long" else 2
            max_possible_score += q_max_score 
            subjective_questions_map[ans.question_id] = q
            batch_eval_payload.append({
                "question_id": ans.question_id,
                "question": q["content"],
                "type": q["type"],
                "max_score": q_max_score,
                "ideal_answer": q["ideal_answer"],
                "user_answer": ans.answer,
                "image_data": ans.image_data
            })
            
    # Process batch evaluations
    if batch_eval_payload:
        batch_results = batch_evaluate_answers(
            eval_requests=batch_eval_payload,
            context="General context for " + test.chapter
        )
        
        for eval_data in batch_results:
            q_id = eval_data.get("question_id")
            subj_score = eval_data.get("score", 0)
            feedback = eval_data.get("feedback", "No feedback available.")
            
            q = subjective_questions_map.get(q_id)
            if q:
                q_max_score = 5 if q["type"] == "long" else 2
                
                # Normalize score if Gemini evaluates out of 10 or mock gives > max_score
                if subj_score > q_max_score:
                    subj_score = (subj_score / 10.0) * q_max_score
                    
                if subj_score >= (q_max_score / 2):
                    correct_count += 1
                if q.get("is_critical_thinking", False) and subj_score >= (q_max_score / 2):
                    ct_score += 1
                
            user_ans = answers_map.get(q_id)
            results.append({
                "question_id": q_id,
                "score": subj_score,
                "feedback": feedback,
                "user_answer": user_ans.answer if user_ans else "",
                "image_data": user_ans.image_data if user_ans else None
            })
            total_score += subj_score
            
    test.total_score = total_score
    test.results_data = {"evaluations": results}
    
    if efficiency_count > 0:
        # Store as percentage out of 10 max per question
        test.efficiency_score = (total_efficiency / (efficiency_count * 10)) * 100
        
    if ct_count > 0:
        test.critical_thinking_score = (ct_score / ct_count) * 100
        
    if total_questions > 0:
        test.acceptance_rate = (correct_count / total_questions) * 100
        
    db.commit()
    
    return {
        "total_score": total_score, 
        "evaluations": results, 
        "efficiency_score": test.efficiency_score,
        "critical_thinking_score": test.critical_thinking_score,
        "acceptance_rate": test.acceptance_rate
    }

@router.get("/performance/{email}")
def get_performance(email: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        user = db.query(models.User).filter(models.User.id == 1).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    tests = db.query(models.TestHistory).filter(models.TestHistory.user_id == user.id).order_by(models.TestHistory.timestamp.desc()).all()
    
    data = []
    for idx, t in enumerate(tests):
        questions = t.test_data.get("questions", []) if t.test_data else []
        max_possible_score = 0
        for q in questions:
            if q.get("type") == "long":
                max_possible_score += 5
            elif q.get("type") == "short":
                max_possible_score += 2
            else:
                max_possible_score += 1
                
        score_percent = ((t.total_score or 0) / max_possible_score * 100) if max_possible_score > 0 else 0
        
        config = t.test_data.get("config", {}) if t.test_data else {}
        difficulty_str = config.get("difficulty", "Medium")
        if difficulty_str.lower() == "easy":
            diff_val = 33
        elif difficulty_str.lower() == "hard":
            diff_val = 100
        else:
            diff_val = 66

        data.append({
            "test_id": t.id,
            "subject": t.subject,
            "chapter": t.chapter,
            "test": f"Test {idx+1}",
            "date": t.timestamp.strftime("%Y-%m-%d %I:%M %p"),
            "score": round(score_percent),
            "critical_thinking": round(t.critical_thinking_score or 0),
            "efficiency": round(t.efficiency_score or 0),
            "acceptance_rate": round(t.acceptance_rate or 0),
            "difficulty": diff_val
        })
        
    return data
    
@router.get("/{test_id}")
def get_test(test_id: int, db: Session = Depends(get_db)):
    test = db.query(models.TestHistory).filter(models.TestHistory.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    return {
        "test_id": test.id, 
        "subject": test.subject, 
        "chapter": test.chapter, 
        "assessment": test.test_data,
        "results_data": test.results_data,
        "total_score": test.total_score,
        "acceptance_rate": test.acceptance_rate
    }
