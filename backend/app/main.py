from app.api import websocket
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AirTouch API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# app.include_router(gemini_router.router)
# app.include_router(testings.router)
app.include_router(websocket.router)
@app.get("/")
def read_root():
    return {"message": "AirTouch Server is Running!"}


# בסוף קובץ app/main.py
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)