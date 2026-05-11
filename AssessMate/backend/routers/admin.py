from fastapi import APIRouter, HTTPException
import os
import glob
from rag import process_and_store_document

router = APIRouter(prefix="/admin", tags=["admin"])

@router.post("/ingest")
def ingest_resources():
    resources_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "Resources")
    
    if not os.path.exists(resources_dir):
        raise HTTPException(status_code=404, detail=f"Resources directory not found at {resources_dir}")
        
    pdf_files = glob.glob(os.path.join(resources_dir, "*.pdf"))
    if not pdf_files:
        return {"message": "No PDF files found in Resources directory."}
        
    processed_count = 0
    errors = []
    
    for file_path in pdf_files:
        filename = os.path.basename(file_path)
        # Parse filename to get class, chapter, subject
        # Examples: X-01-Sci.pdf, XII-02-Mat.pdf, 01-Mat.pdf
        name_parts = filename.replace(".pdf", "").split("-")
        
        if len(name_parts) == 3:
            class_level = name_parts[0]
            chapter = name_parts[1]
            subject = name_parts[2]
        elif len(name_parts) == 2:
            class_level = "Unknown"
            chapter = name_parts[0]
            subject = name_parts[1]
        else:
            class_level = "Unknown"
            subject = "Unknown"
            chapter = name_parts[0] if name_parts else "Unknown"
            
        success = process_and_store_document(file_path, class_level, subject, chapter)
        if success:
            processed_count += 1
        else:
            errors.append(filename)
            
    return {
        "message": f"Ingestion complete. Processed {processed_count} files.",
        "errors": errors
    }
