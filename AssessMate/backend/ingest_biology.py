import os
import sys
from rag import process_and_store_document

def ingest_biology():
    resources_dir = os.path.join(os.path.dirname(__file__), "..", "Resources", "CBSE", "Class-XII", "PCM&B", "XII-Biology")
    resources_dir = os.path.abspath(resources_dir)
    
    if not os.path.exists(resources_dir):
        print(f"Biology directory not found at {resources_dir}")
        sys.exit(1)

    count = 0
    
    for root, dirs, files in os.walk(resources_dir):
        for file in files:
            if file.lower().endswith(".pdf"):
                file_path = os.path.join(root, file)
                board = "CBSE"
                class_level = "XII"
                subject = "Biology"
                chapter = file[:-4]
                
                print(f"Ingesting: Board={board}, Class={class_level}, Subject={subject}, Chapter={chapter}")
                success = process_and_store_document(file_path, class_level, subject, chapter, board)
                if success:
                    count += 1
                else:
                    print(f"Failed to ingest: {file_path}")
                    
    print(f"Successfully ingested {count} documents.")

if __name__ == "__main__":
    ingest_biology()
