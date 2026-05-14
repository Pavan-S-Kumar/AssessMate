import sqlite3
import os

db_path = r"c:\Users\PAVAN S KUMAR\Documents\clg\DT\final project - Sem 2\AssessMate\backend\assessmate.db"

def migrate():
    if not os.path.exists(db_path):
        print(f"DB not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("Migrating teacher_tests table...")
    try:
        cursor.execute("ALTER TABLE teacher_tests ADD COLUMN board VARCHAR DEFAULT 'CBSE';")
        print("Added board column.")
    except sqlite3.OperationalError as e:
        print(f"Board column error: {e}")

    try:
        cursor.execute("ALTER TABLE teacher_tests ADD COLUMN class_level VARCHAR DEFAULT 'XII';")
        print("Added class_level column.")
    except sqlite3.OperationalError as e:
        print(f"Class level column error: {e}")

    try:
        cursor.execute("ALTER TABLE teacher_tests ADD COLUMN stream VARCHAR DEFAULT 'PCM&B';")
        print("Added stream column.")
    except sqlite3.OperationalError as e:
        print(f"Stream column error: {e}")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
