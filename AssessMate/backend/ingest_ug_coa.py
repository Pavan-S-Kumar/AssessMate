import os
import re
import pymupdf
from rag import get_collection

PDF_PATH = r"..\Resources\UG\Computer-Organization-and-Architecture\COMPUTER ORGANIZATION AND ARCHITECTURE.pdf"

COURSE_NAME = "Computer Organization and Architecture"
SOURCE_NAME = "COMPUTER ORGANIZATION AND ARCHITECTURE.pdf"

def chunk_text(text, max_words=400):
    """Simple semantic chunking that tries to break at double newlines (paragraphs)."""
    paragraphs = text.split('\n\n')
    chunks = []
    current_chunk = []
    current_length = 0
    
    for p in paragraphs:
        p = p.strip()
        if not p:
            continue
            
        words = len(p.split())
        
        if current_length + words > max_words and current_chunk:
            chunks.append("\n\n".join(current_chunk))
            current_chunk = [p]
            current_length = words
        else:
            current_chunk.append(p)
            current_length += words
            
    if current_chunk:
        chunks.append("\n\n".join(current_chunk))
        
    return chunks

def ingest_pdf():
    print(f"Opening PDF: {PDF_PATH}")
    if not os.path.exists(PDF_PATH):
        print("PDF not found!")
        return
        
    doc = pymupdf.open(PDF_PATH)
    total_pages = doc.page_count
    
    # State tracking
    current_unit = "Introduction"
    current_topic = "General"
    current_subtopic = ""
    
    collection = get_collection("assessmate_knowledge")
    
    documents = []
    metadatas = []
    ids = []
    
    total_chunks = 0
    
    for i in range(total_pages):
        page = doc.load_page(i)
        text = page.get_text()
        
        # Check for Unit boundaries
        unit_match = re.search(r'(?i)\bUNIT\s*[-:=]?\s*(I{1,3}|IV|V|1|2|3|4|5)\b', text)
        if unit_match:
            lines = text.split('\n')
            for j, line in enumerate(lines):
                if re.search(r'(?i)\bUNIT\s*[-:=]?\s*(I{1,3}|IV|V|1|2|3|4|5)\b', line):
                    # Usually the next line is the topic of the unit
                    current_unit = f"Unit {unit_match.group(1).upper()}"
                    if j+1 < len(lines) and len(lines[j+1].strip()) > 3:
                        current_topic = lines[j+1].strip()
                    break
        
        # We can try to extract subtopics if lines are bold or standalone and short,
        # but a simple proxy is to keep chunking and attach the unit/topic.
        # Let's chunk the page text. We use page text directly to ensure page numbers match.
        chunks = chunk_text(text)
        
        for chunk_idx, chunk_text_content in enumerate(chunks):
            if len(chunk_text_content.strip()) < 20: # Ignore very short chunks
                continue
                
            documents.append(chunk_text_content)
            
            # Subtopic extraction heuristic: if the chunk starts with a short line
            lines = chunk_text_content.split('\n')
            if len(lines) > 0 and 5 < len(lines[0].strip()) < 60:
                current_subtopic = lines[0].strip()
            
            # Format unit name e.g., 'Unit 1' -> 'Unit I' if it was a number
            unit_normalized = current_unit
            unit_map = {"1": "I", "2": "II", "3": "III", "4": "IV", "5": "V"}
            parts = current_unit.split(" ")
            if len(parts) == 2 and parts[1] in unit_map:
                unit_normalized = f"Unit {unit_map[parts[1]]}"
                
            metadatas.append({
                "source": SOURCE_NAME,
                "course": COURSE_NAME,
                "unit": unit_normalized,
                "topic": current_topic,
                "subtopic": current_subtopic,
                "page": i + 1,  # 1-indexed
                "content_type": "text",
                # The existing system uses class/subject/board, let's map these too for hybrid compatibility
                "class": "UG",
                "subject": "COA", 
                "board": "University"
            })
            
            # Create a deterministic ID
            # e.g., COA-U3-0042-01
            unit_suffix = unit_normalized.replace(' ', '')
            chunk_id = f"COA-{unit_suffix}-P{i+1:04d}-{chunk_idx:02d}"
            ids.append(chunk_id)
            
            total_chunks += 1
            
        # Batch upload every 50 pages to avoid memory/request size issues
        if len(documents) >= 100:
            print(f"Upserting batch of {len(documents)} chunks (up to page {i+1})...")
            collection.upsert(
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
            documents = []
            metadatas = []
            ids = []
            
    # Upload remainder
    if documents:
        print(f"Upserting final batch of {len(documents)} chunks...")
        collection.upsert(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
        
    print(f"Successfully processed {total_pages} pages and {total_chunks} chunks.")
    
if __name__ == "__main__":
    ingest_pdf()
