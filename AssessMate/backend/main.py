from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import engine, Base
import os
from dotenv import load_dotenv

from routers import auth, test, admin, chat, textbooks

load_dotenv()

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AssessMate API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(test.router)
app.include_router(admin.router)
app.include_router(chat.router)
app.include_router(textbooks.router)

# Mount static files for textbooks
RESOURCES_DIR = os.path.join(os.path.dirname(__file__), "..", "Resources")
app.mount("/resources", StaticFiles(directory=RESOURCES_DIR), name="resources")

@app.get("/")
def read_root():
    return {"message": "Welcome to AssessMate API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
