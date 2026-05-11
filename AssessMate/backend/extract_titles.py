import os
import PyPDF2

resources_dir = r"c:\Users\PAVAN S KUMAR\Documents\clg\DT\final project - Sem 2\AssessMate\Resources"
output_file = "chapter_titles.txt"

with open(output_file, "w", encoding="utf-8") as out:
    for file in sorted(os.listdir(resources_dir)):
        if file.endswith(".pdf"):
            path = os.path.join(resources_dir, file)
            try:
                with open(path, "rb") as f:
                    reader = PyPDF2.PdfReader(f)
                    first_page = reader.pages[0].extract_text()
                    out.write(f"--- {file} ---\n")
                    lines = [l.strip() for l in first_page.split('\n') if l.strip()]
                    out.write(str(lines[:10]) + "\n\n")
            except Exception as e:
                out.write(f"Error reading {file}: {e}\n\n")

