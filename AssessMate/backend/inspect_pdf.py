import pymupdf
import re

pdf_path = r"..\Resources\UG\Computer-Organization-and-Architecture\COMPUTER ORGANIZATION AND ARCHITECTURE.pdf"

try:
    doc = pymupdf.open(pdf_path)
    
    print(f"Total pages: {doc.page_count}")
    
    for i in range(doc.page_count):
        page = doc.load_page(i)
        text = page.get_text()
        
        # Look for UNIT I, UNIT-I, UNIT 1, UNIT -1, etc.
        if re.search(r'(?i)\bUNIT\s*[-:=]?\s*(I{1,3}|IV|V|1|2|3|4|5)\b', text):
            # Print the lines around it
            lines = text.split('\n')
            for j, line in enumerate(lines):
                if re.search(r'(?i)\bUNIT\s*[-:=]?\s*(I{1,3}|IV|V|1|2|3|4|5)\b', line):
                    print(f"Page {i+1}: {line.strip()}")
                    if j+1 < len(lines):
                        print(f"  Next line: {lines[j+1].strip()}")
                    
except Exception as e:
    print(f"Error: {e}")
