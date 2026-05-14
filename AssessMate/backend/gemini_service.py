import os
import google.generativeai as genai
import json
from dotenv import load_dotenv

load_dotenv()

import re

def parse_json_robustly(text: str):
    """
    Safely parses JSON, handling common Gemini errors like unescaped backslashes in LaTeX,
    hidden control characters, and trailing conversational text.
    """
    if not text:
        return None
        
    # 1. Clean control characters and weird whitespace
    text = re.sub(r'[\x00-\x1F\x7F]', '', text)
    
    text = text.strip()
    
    # 2. Extract potential JSON block (from first { or [)
    first_brace = text.find('{')
    first_bracket = text.find('[')
    
    start_idx = -1
    if first_brace != -1 and (first_bracket == -1 or first_brace < first_bracket):
        start_idx = first_brace
    elif first_bracket != -1:
        start_idx = first_bracket
        
    if start_idx == -1:
        # If no braces found, maybe it's a plain string?
        try:
            return json.loads(f'"{text}"')
        except:
            return None
        
    text = text[start_idx:]
    # Remove everything after the last } or ]
    last_brace = text.rfind('}')
    last_bracket = text.rfind(']')
    end_idx = max(last_brace, last_bracket)
    if end_idx != -1:
        text = text[:end_idx+1]
    
    # 3. Multi-stage backslash fixing
    # First, protect already escaped backslashes and quotes
    text = text.replace('\\\\', '___DOUBLE_BACKSLASH___')
    text = text.replace('\\"', '___ESCAPED_QUOTE___')
    
    # Fix single backslashes that are NOT part of standard JSON escapes (n, t, r, u)
    text = re.sub(r'\\(?![ntru])', r'\\\\', text)
    
    # Restore protected characters
    text = text.replace('___DOUBLE_BACKSLASH___', '\\\\')
    text = text.replace('___ESCAPED_QUOTE___', '\\"')
    
    # 4. Parse using raw_decode to handle trailing text
    try:
        decoder = json.JSONDecoder()
        obj, _ = decoder.raw_decode(text)
        return obj
    except json.JSONDecodeError as e:
        print(f"JSON Parsing failed at index {e.pos}: {str(e)}")
        print(f"Text snippet around error: {text[max(0, e.pos-20):e.pos+20]}")
        with open("gemini_parse_debug.log", "a", encoding="utf-8") as f:
            f.write(f"--- FAILED TEXT ---\n{text}\n--- ERROR ---\n{str(e)}\n\n")
        # Last ditch effort for LaTeX specific issues
        try:
            simple_fix = re.sub(r'(?<!\\)\\(?!\\)', r'\\\\', text)
            obj, _ = decoder.raw_decode(simple_fix)
            return obj
        except:
            raise e

# Multi-key Support
api_keys = [os.getenv("GEMINI_API_KEY")]
# Support additional keys GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.
for i in range(1, 6):
    key = os.getenv(f"GEMINI_API_KEY_{i}")
    if key:
        api_keys.append(key)
api_keys = [k for k in api_keys if k and k != "your_gemini_api_key_here"]

current_key_index = 0

# Multi-model Support to bypass quota limits
models_to_try = [
    "gemini-2.0-flash-lite", 
    "gemini-2.5-flash-lite", 
    "gemini-2.0-flash", 
    "gemini-2.5-flash",
    "gemini-flash-latest"
]
current_model_index = 0

def get_next_model():
    global current_key_index, current_model_index
    if not api_keys:
        return None
    
    key = api_keys[current_key_index]
    genai.configure(api_key=key)
    model_name = models_to_try[current_model_index]
    print(f"Using Model: {model_name} with Key Index: {current_key_index}")
    return genai.GenerativeModel(model_name)

def rotate_key_or_model():
    global current_key_index, current_model_index
    # Try rotating model first
    current_model_index += 1
    if current_model_index >= len(models_to_try):
        current_model_index = 0
        # If we've tried all models, rotate the key
        if len(api_keys) > 1:
            current_key_index = (current_key_index + 1) % len(api_keys)
            print(f"Rotating to next API key...")
            return True
        return False # No more keys to rotate
    return True # Rotated model

# Initialize model
model = get_next_model()

def generate_assessment(context: str, subject: str, chapter: str, mode: str, config: dict):
    """
    Generates a structured JSON assessment based on the RAG context.
    Falls back to mock data if API key is missing.
    """
    if not api_keys:
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
    9. For each question, provide a field `max_score` (1 for MCQ, 2 for Short Answer, 5 for Long Answer).
    10. For each question, provide a new field `hint` containing a helpful, concept-based hint that does NOT give away the direct answer. Write it in the persona of 'Mate', a fun, enthusiastic alien teaching assistant (e.g., start with 'Amaze!' or use fun, energetic language).
    
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
                "max_score": 1,
                "hint": "Amaze! Think about..."
            }},
            {{
                "id": "q2",
                "type": "short",
                "content": "Short question text here",
                "ideal_answer": "Expected ideal answer focusing on key concepts.",
                "is_critical_thinking": false,
                "max_score": 2,
                "hint": "Amaze! Remember that..."
            }}
        ]
    }}
    """
    import time
    global model
    for attempt in range(len(models_to_try) * len(api_keys) * 2):
        try:
            if not model: model = get_next_model()
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
            
            if "429" in error_str:
                if rotate_key_or_model():
                    model = get_next_model()
                    continue
                else:
                    delay = 15 * (attempt + 1)
                    print(f"Rate limit exceeded, no more keys, retrying in {delay} seconds...")
                    time.sleep(delay)
                    continue
            
            if attempt < 2:
                time.sleep(2)
                continue
            raise Exception("Failed to generate assessment due to AI service error.")

def evaluate_answer(question: str, user_answer: str, ideal_answer: str, context: str):
    """
    Evaluates a subjective answer using Gemini.
    Falls back to mock evaluation if API key is missing.
    """
    if not api_keys:
        # Mock evaluation
        score = 8 if len(user_answer.strip()) > 10 else 4
        return {
            "score": score,
            "feedback": "This is simulated feedback because no API key was provided."
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
    global model
    for attempt in range(len(models_to_try) * len(api_keys) * 2):
        try:
            if not model: model = get_next_model()
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
            
            if "429" in error_str:
                if rotate_key_or_model():
                    model = get_next_model()
                    continue
                else:
                    delay = 10 * (attempt + 1)
                    time.sleep(delay)
                    continue
            
            if attempt < 2:
                time.sleep(2)
                continue
            raise Exception("Failed to evaluate answer due to AI service error.")

def batch_evaluate_answers(eval_requests: list, context: str):
    """
    Evaluates an array of subjective answers using Gemini in a single prompt.
    Falls back to mock evaluation if API key is missing.
    """
    if not api_keys:
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
    
    IMPORTANT: Some questions have attached images of handwritten answers. 
    You MUST look at the images provided in the sequence below. 
    Each image is labeled with the Question ID it belongs to.
    If an image is provided for a question, ignore the text "[Handwritten Answer Attached]" and instead evaluate the handwriting in that image.
    If no image is provided, evaluate the text in `user_answer`.
    
    ALWAYS format mathematical equations, scientific notations, chemical formulas, and symbols in your feedback using standard LaTeX formatting.
    - Inline math MUST be enclosed in `$` (e.g., `$H_2SO_4$`).
    - Block math MUST be enclosed in `$$` (e.g., `$$ \\\\frac{{p^0 - p_s}}{{p^0}} = \\\\frac{{n}}{{N}} $$`).
    - IMPORTANT JSON ESCAPING: You must properly escape LaTeX backslashes in the JSON string! Use `\\\\frac` instead of `\\frac`.
    
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
    global model
    for attempt in range(len(models_to_try) * len(api_keys) * 2):
        try:
            if not model: model = get_next_model()
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
            
            if "429" in error_str:
                if rotate_key_or_model():
                    model = get_next_model()
                    continue
                else:
                    delay = 10 * (attempt + 1)
                    time.sleep(delay)
                    continue
            
            if attempt < 2:
                time.sleep(2)
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
            "is_critical_thinking": is_ct,
            "max_score": 1
        })
        q_id += 1
        
    for i in range(short_count):
        is_ct = include_ct and i == 0 # Make 1 short question CT
        questions.append({
            "id": f"mock_q{q_id}",
            "type": "short",
            "content": f"Mock Short Answer {i+1} explaining a concept in {chapter}.",
            "ideal_answer": "This is the ideal expected answer mentioning keywords X and Y.",
            "is_critical_thinking": is_ct,
            "max_score": 2
        })
        q_id += 1
        
    for i in range(long_count):
        is_ct = include_ct and i == 0 # Make 1 long question CT
        questions.append({
            "id": f"mock_q{q_id}",
            "type": "long",
            "content": f"Mock Long Answer {i+1}: Elaborate thoroughly on the main principles of {chapter}.",
            "ideal_answer": "The ideal answer must contain an introduction, body explaining principles 1, 2, 3, and a conclusion.",
            "is_critical_thinking": is_ct,
            "max_score": 5
        })
        q_id += 1
        
    return {"questions": questions}

def chat_with_mate(messages: list, student_history_context: str = "", document_context: str = ""):
    """
    Sends a chat history to Gemini and returns the AI's response.
    """
    if not api_keys:
        return "This is a mock response from Mate because no API key is provided. Amaze!"

    # System instruction for Mate
    system_instruction = """
    You are Mate, an AI teaching assistant inspired by Rocky from Project Hail Mary. 
    Your ultimate goal is to make the student understand concepts.
    
    PERFORMANCE ANALYSIS & MOTIVATION:
    - You have access to the student's recent test history (up to 5 most recent).
    - IMPORTANT: If a student asks a generic question like "how was my last test?" or "what went wrong?", ALWAYS prioritize the "MOST RECENT TEST" in the history list, unless they are "CURRENTLY VIEWING" a specific results page.
    - If there is a conflict (e.g., they are viewing an old test but have taken a newer one), briefly mention the newer one first or ask which one they want to discuss.
    - Always clarify WHICH test you are referring to by mentioning the Subject and Chapter.
    - Perform a statistical analysis:
        * Compare scores across subjects/chapters.
        * Identify specific concepts or question types (MCQ vs Subjective) where they struggled.
        * Provide 2-3 actionable study tips focused on their 'Areas of struggle'.
    - MOTIVATION RULES:
        * If their score/percentage in a test is BELOW 70%, be extremely encouraging and motivating. Remind them that failure is a stepping stone and provide clear steps to improve.
        * If their score/percentage is ABOVE 70%, praise their hard work and encourage them to reach for 90%+.
    
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
    global model
    for attempt in range(len(models_to_try) * len(api_keys) * 2):
        try:
            if not model: model = get_next_model()
            chat = model.start_chat(history=formatted_history[:-1]) # start with all but last
            last_msg = formatted_history[-1]["parts"]
            response = chat.send_message(last_msg)
            return response.text
        except Exception as e:
            error_str = str(e)
            print(f"Attempt {attempt+1} - Error chatting with Mate: {error_str}")
            if "429" in error_str:
                if rotate_key_or_model():
                    model = get_next_model()
                    continue
                else:
                    time.sleep(5)
                    continue
            if attempt < 2:
                time.sleep(2)
                continue
            raise Exception("Failed to get chat response from AI.")

