import sqlite3

def migrate():
    conn = sqlite3.connect('backend/assessmate.db')
    cursor = conn.cursor()

    try:
        cursor.execute("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'student'")
        print("Added role to users")
    except sqlite3.OperationalError:
        print("role already exists or users doesn't exist")

    try:
        cursor.execute("ALTER TABLE test_history ADD COLUMN teacher_test_id INTEGER")
        print("Added teacher_test_id to test_history")
    except sqlite3.OperationalError:
        print("teacher_test_id already exists or test_history doesn't exist")

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS teacher_tests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            teacher_id INTEGER,
            test_code VARCHAR UNIQUE,
            subject VARCHAR,
            chapter VARCHAR,
            test_data JSON,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(teacher_id) REFERENCES users(id)
        )
    ''')
    print("Created teacher_tests table")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
