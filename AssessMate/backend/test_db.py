import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import User

db = SessionLocal()
try:
    new_user = User(username="test2", email="test2@test.com", hashed_password="pw", class_level="X")
    db.add(new_user)
    db.commit()
    print("User created successfully.")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
