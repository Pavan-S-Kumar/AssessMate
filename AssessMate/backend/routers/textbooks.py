from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import os
from typing import List

router = APIRouter(prefix="/textbooks", tags=["textbooks"])

RESOURCES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "Resources")

@router.get("/{email}")
def get_student_textbooks(email: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Class X or XII - handle both int and str from DB
    c_level = str(user.class_level).lower()
    board_str = user.board or "CBSE" # Default to CBSE if None
    if board_str == "State Syllabus":
        board_str = "State Board"
        
    class_str = "Class-X" if "10" in c_level or "x" in c_level and "xii" not in c_level else "Class-XII"
    stream_str = user.stream or "Default"

    # Build path to search
    # Path format: Resources/[Board]/[Class]/[Stream (only for XII)]
    
    base_path = os.path.join(RESOURCES_DIR, board_str, class_str)
    print(f"DEBUG: Searching textbooks in {base_path} for user {email}")
    
    if not os.path.exists(base_path):
        print(f"DEBUG: Path not found: {base_path}")
        return []

    textbooks = []

    # If Class XII, look into the stream directory
    search_paths = []
    if "12" in c_level or "xii" in c_level:
        if stream_str:
            stream_path = os.path.join(base_path, stream_str)
            if os.path.exists(stream_path):
                search_paths.append(stream_path)
            else:
                # Try a partial match if exact match fails
                found = False
                for d in os.listdir(base_path):
                    if stream_str.lower() in d.lower():
                        search_paths.append(os.path.join(base_path, d))
                        found = True
                        break
                if not found:
                    search_paths.append(base_path) # Fallback to base
        else:
            search_paths.append(base_path)
    else:
        # Class X - all files in base_path
        search_paths.append(base_path)

    for path in search_paths:
        for root, dirs, files in os.walk(path):
            for file in files:
                if file.lower().endswith(".pdf"):
                    # Relative path for the static server
                    rel_path = os.path.relpath(os.path.join(root, file), RESOURCES_DIR)
                    # Normalize slashes for URL
                    rel_path = rel_path.replace("\\", "/")
                    
                    subject = get_subject_from_filename(file)
                    display_name = format_display_name(file, subject)
                    
                    textbooks.append({
                        "id": file,
                        "name": display_name,
                        "url": f"http://127.0.0.1:8000/resources/{rel_path}",
                        "subject": subject
                    })
    
    # Sort by name
    textbooks.sort(key=lambda x: x["name"])
    
    return textbooks

def get_subject_from_filename(filename: str):
    fn = filename.lower()
    if "chem" in fn: return "Chemistry"
    if "phys" in fn: return "Physics"
    if "mat" in fn: return "Mathematics"
    if "bio" in fn or "lebo" in fn or "botany" in fn or "zoology" in fn: return "Biology"
    # Specific patterns for Computer Science to avoid overlap with Econo-mi-CS
    if "lecs" in fn or "computer_science" in fn or "comp_sci" in fn: return "Computer Science"
    if "sci" in fn: return "Science"
    if "acc" in fn: return "Accountancy"
    if "bus" in fn or "bst" in fn or "comm" in fn: return "Business Studies"
    if "eco" in fn or "macro" in fn or "micro" in fn or "soceco" in fn: return "Economics"
    if "stat" in fn: return "Statistics"
    if "audit" in fn: return "Auditing"
    if "eng" in fn: return "English"
    if "hin" in fn: return "Hindi"
    if "soc" in fn or "his" in fn or "civ" in fn or "geo" in fn or "pol" in fn: return "Social Science"
    return "General"

def format_display_name(filename: str, subject: str):
    fn = filename.lower().replace(".pdf", "")
    
    # Handle Class XII pattern: XII-Subject
    if fn.startswith("xii-"):
        parts = fn.split("-")
        if len(parts) >= 2:
            # Check if it has a chapter number: XII-01-Subject
            if len(parts) >= 3 and parts[1].isdigit():
                chapter = parts[1]
                chapter_display = "Preface" if chapter == "00" else f"Chapter {chapter}"
                
                # Special category labels
                cat = ""
                if "bus1" in fn: cat = "Business Studies Vol 1"
                elif "bus2" in fn: cat = "Business Studies Vol 2"
                elif "macro" in fn: cat = "MacroEconomics"
                elif "micro" in fn: cat = "MicroEconomics"
                elif "accountancy" in fn: cat = "Accountancy"
                elif "his1" in fn: cat = "History Vol 1"
                elif "his2" in fn: cat = "History Vol 2"
                elif "his3" in fn: cat = "History Vol 3"
                
                return f"XII {chapter_display} - {cat if cat else subject}"
            else:
                # XII-Subject (e.g. XII-Accountancy)
                subject_name = "-".join(parts[1:]).title()
                return f"XII - {subject_name}"

    # Handle Class X pattern: X-Subject
    if fn.startswith("x-"):
        parts = fn.split("-")
        if len(parts) >= 2:
            if len(parts) >= 3 and parts[1].isdigit():
                chapter = parts[1]
                
                # Special category labels
                cat = ""
                if "sochis" in fn: cat = "History"
                elif "socgeo" in fn: cat = "Geography"
                elif "socciv" in fn: cat = "Civics"
                elif "soceco" in fn: cat = "Economics"
                elif "eng1" in fn: cat = "First Flight"
                elif "eng2" in fn: cat = "Footprints"
                
                chapter_display = "Preface" if chapter == "00" else f"Chapter {chapter}"
                suffix = f" ({cat})" if cat else ""
                return f"X {chapter_display} - {subject}{suffix}"
            else:
                # X-Subject
                subject_name = "-".join(parts[1:]).title()
                return f"X - {subject_name}"

    # Handle NCERT style naming: lebo101, lecs101, etc.
    if fn.startswith("lebo") or fn.startswith("lecs"):
        prefix = "lebo" if fn.startswith("lebo") else "lecs"
        chapter_part = fn.replace(prefix, "")
        
        if chapter_part == "1ps":
            return f"XII Preface - {subject}"
        
        try:
            # 101 -> 01, 110 -> 10
            num = int(chapter_part)
            if num >= 100:
                display_num = str(num - 100).zfill(2)
                return f"XII {display_num} - {subject}"
        except ValueError:
            pass
            
        return f"XII {chapter_part.upper()} - {subject}"

    # Default formatting
    return fn.replace("-", " ").title()
