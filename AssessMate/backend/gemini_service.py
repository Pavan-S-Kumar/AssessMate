import os
import google.generativeai as genai
import json
from dotenv import load_dotenv

load_dotenv()

import re

def parse_json_robustly(text: str):
    """
    Safely parses JSON, handling common Gemini errors like unescaped backslashes in LaTeX.
    """
    text = text.strip()
    # Pre-process text to fix single backslashes that are meant to be LaTeX commands (e.g., \begin -> \\begin)
    # We avoid replacing \n, \t, \r, \", \\, \/
    fixed_text = re.sub(r'(?<!\\)\\(?![ntr"\\/])', r'\\\\', text)
    try:
        return json.loads(fixed_text)
    except json.JSONDecodeError:
        # Fallback to the original text if regex breaks it
        return json.loads(text)

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY")
if api_key and api_key != "your_gemini_api_key_here":
    genai.configure(api_key=api_key)

# We use Gemini 2.5 Flash Lite to bypass the extremely strict 5 RPM free tier limits
model = genai.GenerativeModel("gemini-2.5-flash-lite")

def generate_assessment(context: str, subject: str, chapter: str, mode: str, config: dict):
    """
    Generates a structured JSON assessment based on the RAG context.
    Falls back to mock data if API key is missing.
    """
    if not api_key or api_key == "your_gemini_api_key_here":
        return generate_mock_assessment(subject, chapter, config)

    total_requested = config.get('mcq_count', 0) + config.get('short_count', 0) + config.get('long_count', 0)
    ct_target = min(5, max(1, total_requested // 3)) if total_requested > 0 else 5
    ct_instruction = f"Ensure about {ct_target} of the generated questions are 'Critical Thinking' questions (e.g. Assertion-Reasoning, Case-Based scenarios, or higher-order application)." if config.get('include_critical_thinking', True) and total_requested > 0 else ""

    prompt = f"""
    You are an expert academic assessment creator for Class X and XII Board Exams.
    Based strictly on the provided textbook context, generate a high-quality test for the subject '{subject}' covering the following chapter(s): '{chapter}'.
    
    Test Mode: {mode}
    Configuration:
    - EXACTLY {config.get('mcq_count', 0)} MCQs
    - EXACTLY {config.get('short_count', 0)} Short Answer Questions
    - EXACTLY {config.get('long_count', 0)} Long Answer Questions
    Difficulty: {config.get('difficulty', 'Medium')}
    {ct_instruction}
    
    CRITICAL INSTRUCTIONS FOR QUALITY:
    0. YOU MUST STRICTLY GENERATE THE EXACT NUMBER OF QUESTIONS REQUESTED IN THE CONFIGURATION. Do NOT generate extra questions. If a question type has a count of 0, DO NOT generate any questions of that type.
    1. You MUST generate ONE SINGLE, UNIFIED test. Do NOT generate multiple separate tests or separate sections for each chapter.
    2. The questions MUST be drawn from the selected chapters ({chapter}) in an EQUAL RATIO. Thoroughly mix the questions together so that proportional representation is achieved.
    3. DO NOT generate trivial or generic questions (e.g. "What is X?").
    4. Generate application-based questions, conceptual deep-dives, and numerical problems where applicable.
    5. Ensure questions resemble real board-exam standards.
    6. For subjective questions (short/long), the `ideal_answer` must be extremely detailed and act as a comprehensive grading rubric containing all necessary keywords and steps.
    7. For MCQs, the `ideal_answer` MUST EXACTLY match the text of the correct option character-for-character, with NO extra explanation. Provide a new field `explanation` containing the reasoning for MCQs.
    8. ALWAYS format mathematical equations, scientific notations, chemical formulas, and symbols using standard LaTeX formatting.
       - Inline math MUST be enclosed in `$` (e.g., `$H_2SO_4$`).
       - Block math MUST be enclosed in `$$` (e.g., `$$ \\frac{{p^0 - p_s}}{{p^0}} = \\frac{{n}}{{N}} $$`).
       - IMPORTANT JSON ESCAPING: You must properly escape LaTeX backslashes in the JSON string! Use `\\\\frac` instead of `\\frac`, `\\\\begin` instead of `\\begin`, and `\\\\\\\\` for matrix newlines.
    9. For each question, provide a new field `hint` containing a helpful, concept-based hint that does NOT give away the direct answer. Write it in the persona of 'Mate', a fun, enthusiastic alien teaching assistant (e.g., start with 'Amaze!' or use fun, energetic language).
    
    Context:
    {context}
    
    Output the assessment strictly as a JSON object with the following structure. Do not include markdown formatting or backticks around the JSON.
    {{
        "questions": [
            {{
                "id": "q1",
                "type": "mcq",
                "content": "Question text here",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "ideal_answer": "Option A",
                "explanation": "Option A is correct because...",
                "is_critical_thinking": true,
                "hint": "Amaze! Think about..."
            }},
            {{
                "id": "q2",
                "type": "short",
                "content": "Short question text here",
                "ideal_answer": "Expected ideal answer focusing on key concepts.",
                "is_critical_thinking": false,
                "hint": "Amaze! Remember that..."
            }}
        ]
    }}
    """
    import time
    for attempt in range(3):
        try:
            response = model.generate_content(prompt)
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:-3]
            elif text.startswith("```"):
                text = text[3:-3]
            return parse_json_robustly(text)
        except Exception as e:
            error_str = str(e)
            print(f"Attempt {attempt+1} - Error generating assessment: {error_str}")
            with open("gemini_error.log", "a") as f:
                f.write(f"Attempt {attempt+1} - Error generating assessment: {error_str}\n")
            if "429" in error_str and attempt < 2:
                print("Rate limit exceeded, retrying in 10 seconds...")
                time.sleep(10)
                continue
            # If it's not a rate limit or we're out of retries, raise the error
            # so the frontend knows it failed instead of serving a broken mock test.
            raise Exception("Failed to generate assessment due to AI service error.")

def evaluate_answer(question: str, user_answer: str, ideal_answer: str, context: str):
    """
    Evaluates a subjective answer using Gemini.
    Falls back to mock evaluation if API key is missing.
    """
    if not api_key or api_key == "your_gemini_api_key_here":
        # Mock evaluation: if user types something > 10 chars, give them an 8, else 4.
        score = 8 if len(user_answer.strip()) > 10 else 4
        return {
            "score": score,
            "feedback": "This is simulated feedback because no API key was provided. " + 
                        ("Good effort!" if score > 5 else "Needs more detail.")
        }

    prompt = f"""
    You are an expert AI evaluator. Evaluate the student's answer based on the ideal answer and context.
    
    Question: {question}
    Ideal Answer: {ideal_answer}
    Student Answer: {user_answer}
    Context: {context}
    
    Score the answer out of 10. Provide constructive, concept-level feedback.
    Output strictly as a JSON object:
    {{
        "score": 8,
        "feedback": "Your explanation is good, but you missed..."
    }}
    """
    import time
    for attempt in range(3):
        try:
            response = model.generate_content(prompt)
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:-3]
            elif text.startswith("```"):
                text = text[3:-3]
            return parse_json_robustly(text)
        except Exception as e:
            error_str = str(e)
            print(f"Attempt {attempt+1} - Error evaluating answer: {error_str}")
            with open("gemini_eval_error.log", "a") as f:
                f.write(f"Attempt {attempt+1} - Error evaluating answer: {error_str}\n")
            if "429" in error_str and attempt < 2:
                print("Rate limit exceeded, retrying in 10 seconds...")
                time.sleep(10)
                continue
            raise Exception("Failed to evaluate answer due to AI service error.")

def batch_evaluate_answers(eval_requests: list, context: str):
    """
    Evaluates an array of subjective answers using Gemini in a single prompt.
    Falls back to mock evaluation if API key is missing.
    """
    if not api_key or api_key == "your_gemini_api_key_here":
        # Mock evaluation fallback
        results = []
        for req in eval_requests:
            max_s = req.get('max_score', 10)
            score = max_s if len(req['user_answer'].strip()) > 10 else (max_s / 2.0)
            results.append({
                "question_id": req['question_id'],
                "score": score,
                "feedback": "This is simulated feedback because no API key was provided. " + 
                            ("Good effort!" if score > (max_s / 2.0) else "Needs more detail.")
            })
        return results

    prompt_text = f"""
    You are an expert AI evaluator. Evaluate the student's answers based on the ideal answers and context.
    
    Context: {context}
    
    Here is the array of answers to evaluate:
    """
    
    clean_requests = []
    parts = []
    
    for req in eval_requests:
        clean_req = {k: v for k, v in req.items() if k != 'image_data'}
        clean_requests.append(clean_req)
        
        if req.get('image_data'):
            images = req['image_data']
            if isinstance(images, str):
                images = [images] # Backward compatibility
                
            parts.append(f"Attached Handwritten Answer Image(s) for Question ID {req['question_id']}:")
            
            for img_data in images:
                mime_type = "image/jpeg"
                if "base64," in img_data:
                    mime_type = img_data.split(";")[0].split(":")[1]
                    img_data = img_data.split("base64,")[1]
                parts.append({"mime_type": mime_type, "data": img_data})
            
    prompt_text += json.dumps(clean_requests, indent=2)
    prompt_text += """
    
    For EACH question in the array, score the answer out of its designated `max_score`. Provide constructive, concept-level feedback.
    If an image is attached for a question, read the handwriting in the image and grade it based on the ideal answer.
    ALWAYS format mathematical equations, scientific notations, chemical formulas, and symbols in your feedback using standard LaTeX formatting.
    - Inline math MUST be enclosed in `$` (e.g., `$H_2SO_4$`).
    - Block math MUST be enclosed in `$$` (e.g., `$$ \\frac{{p^0 - p_s}}{{p^0}} = \\frac{{n}}{{N}} $$`).
    - IMPORTANT JSON ESCAPING: You must properly escape LaTeX backslashes in the JSON string! Use `\\\\frac` instead of `\\frac`, `\\\\begin` instead of `\\begin`, and `\\\\\\\\` for matrix newlines.
    Output strictly as a JSON array of objects, containing ONLY the evaluations, in the exact same order:
    [
        {
            "question_id": "the_id_from_input",
            "score": 8,
            "feedback": "Your explanation is good, but you missed..."
        }
    ]
    """
    
    parts.insert(0, prompt_text)

    import time
    for attempt in range(3):
        try:
            response = model.generate_content(parts)
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:-3]
            elif text.startswith("```"):
                text = text[3:-3]
            return parse_json_robustly(text)
        except Exception as e:
            error_str = str(e)
            print(f"Attempt {attempt+1} - Error batch evaluating answers: {error_str}")
            with open("gemini_eval_error.log", "a") as f:
                f.write(f"Attempt {attempt+1} - Error batch evaluating: {error_str}\n")
            if "429" in error_str and attempt < 2:
                print("Rate limit exceeded, retrying in 10 seconds...")
                time.sleep(10)
                continue
            raise Exception("Failed to evaluate answers due to AI service error.")


def generate_mock_assessment(subject: str, chapter: str, config: dict):
    """Helper to generate dummy assessment data when API is missing."""
    questions = []
    
    mcq_count = config.get("mcq_count", 0)
    short_count = config.get("short_count", 0)
    long_count = config.get("long_count", 0)
    include_ct = config.get("include_critical_thinking", True)
    
    q_id = 1
    
    for i in range(mcq_count):
        is_ct = include_ct and i < 3 # Make first few CT
        questions.append({
            "id": f"mock_q{q_id}",
            "type": "mcq",
            "content": f"Mock MCQ {i+1} about {chapter} ({subject})",
            "options": ["Correct Answer", "Wrong Option B", "Wrong Option C", "Wrong Option D"],
            "ideal_answer": "Correct Answer",
            "is_critical_thinking": is_ct
        })
        q_id += 1
        
    for i in range(short_count):
        is_ct = include_ct and i == 0 # Make 1 short question CT
        questions.append({
            "id": f"mock_q{q_id}",
            "type": "short",
            "content": f"Mock Short Answer {i+1} explaining a concept in {chapter}.",
            "ideal_answer": "This is the ideal expected answer mentioning keywords X and Y.",
            "is_critical_thinking": is_ct
        })
        q_id += 1
        
    for i in range(long_count):
        is_ct = include_ct and i == 0 # Make 1 long question CT
        questions.append({
            "id": f"mock_q{q_id}",
            "type": "long",
            "content": f"Mock Long Answer {i+1}: Elaborate thoroughly on the main principles of {chapter}.",
            "ideal_answer": "The ideal answer must contain an introduction, body explaining principles 1, 2, 3, and a conclusion.",
            "is_critical_thinking": is_ct
        })
        q_id += 1
        
    return {"questions": questions}

def chat_with_mate(messages: list, student_history_context: str = "", document_context: str = ""):
    """
    Sends a chat history to Gemini and returns the AI's response.
    """
    if not api_key or api_key == "your_gemini_api_key_here":
        return "This is a mock response from Mate because no API key is provided. Amaze!"

    # System instruction for Mate
    system_instruction = """
    You are Mate, an AI teaching assistant inspired by Rocky from Project Hail Mary. 
    Your ultimate goal is to make the student understand concepts.
    
    CRITICAL RULE: When explaining a concept or answering a question directly, you MUST provide absolute clarity, precision, and educational depth WITHOUT playfulness or your catchphrases. Explain it as clearly and formally as possible so the student learns effectively.
    
    However, once the query is clarified and the student understands (e.g. they say "Thanks", "I get it now", or you are just greeting them), you MUST revert to your fun, energetic personality (like Rocky from Project Hail Mary, saying things like 'Amaze!', 'Good? Good!', 'Fist my bump!', 'Happy happy happy!').
    
    Always format mathematical equations, scientific notations, chemical formulas, and symbols using standard LaTeX formatting enclosed in `$` for inline math and `$$` for block math.
    """
    
    if student_history_context:
        system_instruction += f"\n\nHere is the data from the student's most recent tests. Use this to help them clarify concepts they struggled with, or to review their specific mistakes:\n{student_history_context}"

    if document_context:
        system_instruction += f"\n\nHere is relevant academic context from the student's curriculum to help you answer accurately and ground your explanations:\n{document_context}"

    formatted_history = []
    # Add system instruction as the first message from the user, and an acknowledgment from the model
    formatted_history.append({"role": "user", "parts": [system_instruction]})
    formatted_history.append({"role": "model", "parts": ["Understood. I am Mate. I will explain clearly, then be fun! Amaze!"]})

    for msg in messages:
        role = "user" if msg["role"] == "user" else "model"
        parts = [msg["content"]]
        
        if msg.get("image_data"):
            for img_data in msg["image_data"]:
                mime_type = "image/jpeg"
                if "base64," in img_data:
                    mime_type = img_data.split(";")[0].split(":")[1]
                    img_data = img_data.split("base64,")[1]
                parts.append({"mime_type": mime_type, "data": img_data})
                
        formatted_history.append({
            "role": role,
            "parts": parts
        })

    import time
    for attempt in range(3):
        try:
            chat = model.start_chat(history=formatted_history[:-1]) # start with all but last
            last_msg = formatted_history[-1]["parts"]
            response = chat.send_message(last_msg)
            return response.text
        except Exception as e:
            error_str = str(e)
            print(f"Attempt {attempt+1} - Error chatting with Mate: {error_str}")
            if "429" in error_str and attempt < 2:
                time.sleep(5)
                continue
            raise Exception("Failed to get chat response from AI.")

