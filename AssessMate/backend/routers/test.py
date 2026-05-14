from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from rag import search_knowledge
from gemini_service import generate_assessment, evaluate_answer, batch_evaluate_answers
import random
import string
import datetime

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
    
    if request.preview_only:
        return {"assessment": assessment_data}
    
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
            q_max_score = q.get("max_score")
            if not q_max_score:
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
                q_max_score = q.get("max_score")
                if not q_max_score:
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

def generate_test_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

@router.post("/teacher/save")
def save_teacher_test(request: schemas.TeacherTestCreate, email: str = "teacher@example.com", db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create shareable tests")

    # Ensure unique test code
    while True:
        code = generate_test_code()
        existing = db.query(models.TeacherTest).filter(models.TeacherTest.test_code == code).first()
        if not existing:
            break

    new_test = models.TeacherTest(
        teacher_id=user.id,
        test_code=code,
        subject=request.subject,
        chapter=request.chapter,
        board=request.board,
        class_level=request.class_level,
        stream=request.stream,
        test_data=request.test_data,
        allow_reattempts=1 if request.allow_reattempts else 0,
        due_date=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=request.duration_hours) if request.duration_hours else None
    )
    db.add(new_test)
    db.commit()
    db.refresh(new_test)

    return {"test_code": code, "message": "Test created successfully"}

@router.post("/join")
def join_test(request: schemas.JoinTestRequest, email: str = "student@example.com", db: Session = Depends(get_db)):
    teacher_test = db.query(models.TeacherTest).filter(models.TeacherTest.test_code == request.test_code).first()
    if not teacher_test:
        raise HTTPException(status_code=404, detail="Invalid test code")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user_id = user.id

    # ACCESS CONTROL: Check if student matches the test's target audience
    if user.board != teacher_test.board or user.class_level != teacher_test.class_level:
        raise HTTPException(status_code=403, detail="Access Denied.")
    
    if teacher_test.stream and user.stream != teacher_test.stream:
         raise HTTPException(status_code=403, detail="Access Denied.")

    if not teacher_test.is_active or teacher_test.is_deleted:
        raise HTTPException(status_code=403, detail="Access Denied. This test is currently unavailable.")

    if teacher_test.due_date and datetime.datetime.now(datetime.timezone.utc) > teacher_test.due_date.replace(tzinfo=datetime.timezone.utc):
        raise HTTPException(status_code=403, detail="Access Denied. This test has expired.")

    # Check if student already has a completed attempt for this teacher test
    existing_attempt = db.query(models.TestHistory).filter(
        models.TestHistory.user_id == user_id,
        models.TestHistory.teacher_test_id == teacher_test.id,
        models.TestHistory.total_score.isnot(None)
    ).first()

    if existing_attempt and not teacher_test.allow_reattempts:
        raise HTTPException(status_code=403, detail="You have already completed this test. Re-attempts are not allowed for this assessment.")

    new_test = models.TestHistory(
        user_id=user_id,
        subject=teacher_test.subject,
        chapter=teacher_test.chapter,
        mode="Custom",
        test_data=teacher_test.test_data,
        teacher_test_id=teacher_test.id
    )
    db.add(new_test)
    db.commit()
    db.refresh(new_test)

    return {"test_id": new_test.id, "subject": new_test.subject, "chapter": new_test.chapter}

@router.get("/teacher/tests/{email}")
def get_teacher_tests(email: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or user.role != "teacher":
        raise HTTPException(status_code=403, detail="Unauthorized")

    tests = db.query(models.TeacherTest).filter(
        models.TeacherTest.teacher_id == user.id,
        models.TeacherTest.is_deleted == 0
    ).order_by(models.TeacherTest.created_at.desc()).all()
    
    return [
        {
            "id": t.id,
            "test_code": t.test_code,
            "subject": t.subject,
            "chapter": t.chapter,
            "board": t.board,
            "class_level": t.class_level,
            "stream": t.stream,
            "is_active": bool(t.is_active),
            "allow_reattempts": bool(t.allow_reattempts),
            "due_date": t.due_date.replace(tzinfo=datetime.timezone.utc).isoformat() if t.due_date else None,
            "created_at": t.created_at.replace(tzinfo=datetime.timezone.utc).isoformat() if t.created_at else None,
            "question_count": len(t.test_data.get("questions", []))
        } for t in tests
    ]

@router.get("/teacher/test/{test_code}/results")
def get_teacher_test_results(test_code: str, email: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or user.role != "teacher":
        raise HTTPException(status_code=403, detail="Unauthorized")

    teacher_test = db.query(models.TeacherTest).filter(models.TeacherTest.test_code == test_code).first()
    if not teacher_test or teacher_test.teacher_id != user.id:
        raise HTTPException(status_code=404, detail="Test not found or unauthorized")

    histories = db.query(models.TestHistory).filter(models.TestHistory.teacher_test_id == teacher_test.id).all()
    
    results = []
    for h in histories:
        student = db.query(models.User).filter(models.User.id == h.user_id).first()
        results.append({
            "history_id": h.id,
            "student_username": student.username if student else "Unknown",
            "student_email": student.email if student else "Unknown",
            "timestamp": h.timestamp.strftime("%Y-%m-%d %I:%M %p"),
            "total_score": h.total_score,
            "results_data": h.results_data
        })

    return {
        "test_info": {
            "test_code": teacher_test.test_code,
            "subject": teacher_test.subject,
            "chapter": teacher_test.chapter,
            "test_data": teacher_test.test_data
        },
        "submissions": results
    }

@router.get("/performance/{email}")
def get_performance(email: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        user = db.query(models.User).filter(models.User.id == 1).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Only show tests that have been evaluated (total_score is not null)
    tests = db.query(models.TestHistory).filter(
        models.TestHistory.user_id == user.id,
        models.TestHistory.total_score.isnot(None)
    ).order_by(models.TestHistory.timestamp.desc()).all()
    
    data = []
    for idx, t in enumerate(tests):
        questions = t.test_data.get("questions", []) if t.test_data else []
        max_possible_score = 0
        for q in questions:
            q_max = q.get("max_score")
            if q_max:
                max_possible_score += q_max
            elif q.get("type") == "long":
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

        teacher_name = None
        if t.teacher_test and t.teacher_test.teacher:
            teacher_name = t.teacher_test.teacher.username

        data.append({
            "test_id": t.id,
            "subject": t.subject,
            "chapter": t.chapter,
            "teacher_name": teacher_name,
            "test": f"Test {idx+1}",
            "date": t.timestamp.strftime("%Y-%m-%d %I:%M %p"),
            "score": round(score_percent),
            "critical_thinking": round(t.critical_thinking_score or 0),
            "efficiency": round(t.efficiency_score or 0),
            "acceptance_rate": round(t.acceptance_rate or 0),
            "difficulty": diff_val
        })
        
    return data
    
@router.get("/teacher/analytics/{email}")
def get_teacher_analytics(email: str, db: Session = Depends(get_db)):
    teacher = db.query(models.User).filter(models.User.email == email).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
        
    teacher_tests = db.query(models.TeacherTest).filter(
        models.TeacherTest.teacher_id == teacher.id,
        models.TeacherTest.is_deleted == 0
    ).all()
    
    test_stats = []
    subject_leaderboards = {} # {subject: {user_id: {total_percent: 0, count: 0, username: ""}}}
    
    for t_test in teacher_tests:
        # Calculate max possible score for this test
        questions = t_test.test_data.get("questions", []) if t_test.test_data else []
        max_possible = 0
        for q in questions:
            q_max = q.get("max_score")
            if q_max: max_possible += q_max
            elif q.get("type") == "long": max_possible += 5
            elif q.get("type") == "short": max_possible += 2
            else: max_possible += 1
            
        histories = db.query(models.TestHistory).filter(
            models.TestHistory.teacher_test_id == t_test.id,
            models.TestHistory.total_score.isnot(None)
        ).all()
        
        if not histories:
            continue
            
        max_score = -1 # Start with -1 to capture even 0 scores
        top_student = "N/A"
        sum_percent = 0
        
        for h in histories:
            if h.total_score > max_score:
                max_score = h.total_score
                student = db.query(models.User).filter(models.User.id == h.user_id).first()
                top_student = student.username if student else "Unknown"
            
            percent = (h.total_score / max_possible * 100) if max_possible > 0 else 0
            sum_percent += percent
            
            # Leaderboard data collection
            subj = t_test.subject
            if subj not in subject_leaderboards:
                subject_leaderboards[subj] = {}
            
            if h.user_id not in subject_leaderboards[subj]:
                user = db.query(models.User).filter(models.User.id == h.user_id).first()
                subject_leaderboards[subj][h.user_id] = {
                    "total_percent": 0,
                    "count": 0,
                    "username": user.username if user else "Unknown"
                }
            
            subject_leaderboards[subj][h.user_id]["total_percent"] += percent
            subject_leaderboards[subj][h.user_id]["count"] += 1
            
        avg_percent = sum_percent / len(histories)
        
        test_stats.append({
            "test_id": t_test.id,
            "test_code": t_test.test_code,
            "title": f"{t_test.subject} - {t_test.chapter[:20]}...",
            "highest_score": round(max_score, 1) if max_score >= 0 else 0,
            "top_student": top_student,
            "difficulty": round(100 - avg_percent, 1), # High difficulty if low avg score
            "avg_score_percent": round(avg_percent, 1)
        })
        
    # Process leaderboards
    final_leaderboards = []
    for subj, students in subject_leaderboards.items():
        leaderboard_entries = []
        for u_id, data in students.items():
            leaderboard_entries.append({
                "username": data["username"],
                "avg_score": round(data["total_percent"] / data["count"], 1)
            })
        
        # Sort by avg_score desc
        leaderboard_entries.sort(key=lambda x: x["avg_score"], reverse=True)
        
        final_leaderboards.append({
            "subject": subj,
            "top_scorers": leaderboard_entries
        })
        
    return {
        "test_stats": test_stats,
        "leaderboards": final_leaderboards
    }

@router.patch("/teacher/test/{test_code}/toggle-active")
def toggle_test_active(test_code: str, email: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or user.role != "teacher":
        raise HTTPException(status_code=403, detail="Unauthorized")

    test = db.query(models.TeacherTest).filter(models.TeacherTest.test_code == test_code).first()
    if not test or test.teacher_id != user.id:
        raise HTTPException(status_code=404, detail="Test not found")

    if not test.is_active:
        # Reactivating the test
        test.is_active = 1
        # If it was expired, clearing the due_date makes it active again
        if test.due_date and datetime.datetime.utcnow() > test.due_date:
            test.due_date = None
    else:
        # Deactivating the test
        test.is_active = 0
        
    db.commit()
    return {"message": "Test status updated", "is_active": bool(test.is_active), "due_date": test.due_date}

@router.delete("/teacher/test/{test_code}")
def delete_teacher_test(test_code: str, email: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or user.role != "teacher":
        raise HTTPException(status_code=403, detail="Unauthorized")

    test = db.query(models.TeacherTest).filter(models.TeacherTest.test_code == test_code).first()
    if not test or test.teacher_id != user.id:
        raise HTTPException(status_code=404, detail="Test not found")

    test.is_deleted = 1
    # Also invalidate it just in case
    test.is_active = 0
    db.commit()
    return {"message": "Test deleted from dashboard successfully"}

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
