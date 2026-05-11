import os
import time
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-2.0-flash")

try:
    for i in range(10):
        response = model.generate_content("Say hello")
        print(f"Request {i+1} succeeded.")
        time.sleep(1)
except Exception as e:
    print(f"Failed on request {i+1}: {e}")
