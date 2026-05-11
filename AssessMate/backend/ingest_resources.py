import os
import sys
from rag import process_and_store_document

def ingest_all():
    resources_dir = os.path.join(os.path.dirname(__file__), "..", "Resources")
    resources_dir = os.path.abspath(resources_dir)
    
    if not os.path.exists(resources_dir):
        print(f"Resources directory not found at {resources_dir}")
        sys.exit(1)

    count = 0
    
    for root, dirs, files in os.walk(resources_dir):
        for file in files:
            if file.lower().endswith(".pdf"):
                file_path = os.path.join(root, file)
                
                # Extract relative path to determine Board and Class
                rel_path = os.path.relpath(file_path, resources_dir)
                parts = rel_path.split(os.sep)
                
                if len(parts) < 3:
                    print(f"Skipping malformed path: {rel_path}")
                    continue
                
                board = parts[0]
                class_folder = parts[1]
                class_level = class_folder.replace("Class-", "")
                
                filename = file[:-4] # Remove .pdf
                name_parts = filename.split("-")
                
                if board == "CBSE":
                    # Expected format: X-01-Mat or XII-01-Chem
                    if len(name_parts) >= 3:
                        chapter = name_parts[1]
                        subject = "-".join(name_parts[2:])
                    else:
                        if filename.startswith("lebo"):
                            subject = "Biology"
                        elif filename.startswith("lecs"):
                            subject = "Computer Science"
                        elif filename.startswith("lebs"):
                            subject = "Business Studies"
                        elif filename.startswith("leec"):
                            subject = "Economics"
                        elif filename.startswith("lehs"):
                            subject = "History"
                        else:
                            subject = filename
                        chapter = filename
                elif board == "State Board":
                    # Expected format: X-English or XII-Physics-Vol1
                    chapter = "Full Book"
                    if len(name_parts) >= 2:
                        subject = "-".join(name_parts[1:])
                    else:
                        subject = filename
                else:
                    chapter = "Unknown"
                    subject = "Unknown"
                
                print(f"Ingesting: Board={board}, Class={class_level}, Subject={subject}, Chapter={chapter}")
                success = process_and_store_document(file_path, class_level, subject, chapter, board)
                if success:
                    count += 1
                else:
                    print(f"Failed to ingest: {file_path}")
                    
    print(f"Successfully ingested {count} documents.")

if __name__ == "__main__":
    ingest_all()
