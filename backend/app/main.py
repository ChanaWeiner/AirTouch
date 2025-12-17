# app/main.py
import ssl
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


from app.api import gemini_router

ssl._create_default_https_context = ssl._create_unverified_context

# מבטל אימות בספריית requests
os.environ['CURL_CA_BUNDLE'] = ""
os.environ['PYTHONHTTPSVERIFY'] = '0'
app = FastAPI(title="AirTouch API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(gemini_router.router)
# app.include_router(testings.router)
@app.get("/")
def read_root():
    return {"message": "AirTouch Server is Running! (Clean Architecture)"}


# בסוף קובץ app/main.py
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)