from app.api import websocket
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.gemini_router import router as gemini_router
from app.api.websocket import router as websocket_router
app = FastAPI(title="AirTouch API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Range", "Accept-Ranges"]
)

app.include_router(gemini_router)
# app.include_router(websocket_router)
@app.get("/")
def read_root():
    return {"message": "AirTouch Server is Running!"}


# בסוף קובץ app/main.py
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)