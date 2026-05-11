from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import os
from dotenv import load_dotenv

from routers import auth, test, admin, chat

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

@app.get("/")
def read_root():
    return {"message": "Welcome to AssessMate API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
