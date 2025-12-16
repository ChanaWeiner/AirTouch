# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import gemini_router

app = FastAPI(title="AirTouch API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(gemini_router.router)

@app.get("/")
def read_root():
    return {"message": "AirTouch Server is Running! (Clean Architecture)"}