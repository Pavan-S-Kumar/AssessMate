import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "assessmate.db")

def migrate():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE test_history ADD COLUMN critical_thinking_score FLOAT;")
        print("Added critical_thinking_score")
    except sqlite3.OperationalError:
        print("Column critical_thinking_score already exists")
        
    try:
        cursor.execute("ALTER TABLE test_history ADD COLUMN efficiency_score FLOAT;")
        print("Added efficiency_score")
    except sqlite3.OperationalError:
        print("Column efficiency_score already exists")
        
    try:
        cursor.execute("ALTER TABLE test_history ADD COLUMN acceptance_rate FLOAT;")
        print("Added acceptance_rate")
    except sqlite3.OperationalError:
        print("Column acceptance_rate already exists")

    try:
        cursor.execute("ALTER TABLE users ADD COLUMN board VARCHAR;")
        print("Added board")
    except sqlite3.OperationalError:
        print("Column board already exists")

    try:
        cursor.execute("ALTER TABLE users ADD COLUMN stream VARCHAR;")
        print("Added stream")
    except sqlite3.OperationalError:
        print("Column stream already exists")
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
