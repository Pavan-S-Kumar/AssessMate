import os
import json

resources_dir = "Resources"
curriculum = {
    "CBSE": {
        "Class X": {"Default": {}},
        "Class XII": {}
    },
    "State Syllabus": {
        "Class X": {"Default": {}},
        "Class XII": {}
    }
}

def clean_subject(name):
    name = name.replace(".pdf", "")
    if name.endswith("-Vol1"):
        name = name[:-5]
    if name.endswith("-Vol2"):
        name = name[:-5]
    return name

for root, dirs, files in os.walk(resources_dir):
    for file in files:
        if file.endswith(".pdf"):
            rel_path = os.path.relpath(os.path.join(root, file), resources_dir)
            parts = rel_path.split(os.sep)
            
            board = "CBSE" if parts[0] == "CBSE" else "State Syllabus"
            class_folder = parts[1]
            class_level = class_folder.replace("-", " ") # Class X or Class XII
            
            if len(parts) >= 4 and class_level == "Class XII":
                # It has a stream folder, or subject folder
                # e.g. CBSE/Class-XII/Commerce and Economics/XII-01-Accountancy.pdf
                # or CBSE/Class-XII/Commerce and Economics/XII-Business_Studies-Vol1/lebs101.pdf
                stream = parts[2]
                if stream not in curriculum[board][class_level]:
                    curriculum[board][class_level][stream] = {}
                
                # Check if it has a volume folder
                if len(parts) == 5:
                    subj_folder = parts[3]
                    subject = clean_subject(subj_folder)
                    chapter = file.replace(".pdf", "")
                else:
                    # length 4
                    # e.g. XII-01-Accountancy.pdf
                    filename = file.replace(".pdf", "")
                    name_parts = filename.split("-")
                    if len(name_parts) >= 3 and name_parts[0] == "XII":
                        chapter = name_parts[1]
                        subject = "-".join(name_parts[2:])
                    else:
                        subject = filename
                        chapter = "Full Book"
                
                if subject not in curriculum[board][class_level][stream]:
                    curriculum[board][class_level][stream][subject] = []
                if chapter not in curriculum[board][class_level][stream][subject]:
                    curriculum[board][class_level][stream][subject].append(chapter)

            elif class_level == "Class X":
                # e.g. CBSE/Class-X/X-01-Mat.pdf or State Board/Class-X/X-English.pdf
                stream = "Default"
                filename = file.replace(".pdf", "")
                name_parts = filename.split("-")
                if len(name_parts) >= 3 and name_parts[0] == "X":
                    chapter = name_parts[1]
                    subject = "-".join(name_parts[2:])
                else:
                    subject = filename
                    chapter = "Full Book"
                
                if subject not in curriculum[board][class_level][stream]:
                    curriculum[board][class_level][stream][subject] = []
                if chapter not in curriculum[board][class_level][stream][subject]:
                    curriculum[board][class_level][stream][subject].append(chapter)
            elif len(parts) == 3 and class_level == "Class XII":
                 # e.g. State Board/Class-XII/XII-English.pdf
                 stream = "General"
                 if stream not in curriculum[board][class_level]:
                     curriculum[board][class_level][stream] = {}
                 filename = file.replace(".pdf", "")
                 subject = filename
                 chapter = "Full Book"
                 if subject not in curriculum[board][class_level][stream]:
                    curriculum[board][class_level][stream][subject] = []
                 if chapter not in curriculum[board][class_level][stream][subject]:
                    curriculum[board][class_level][stream][subject].append(chapter)

print(json.dumps(curriculum, indent=2))
