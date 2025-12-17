import requests
import warnings
from urllib3.exceptions import InsecureRequestWarning # עדכון קל לייבוא בגרסאות חדשות

# --- תחילת המעקף של נתיב ---
warnings.simplefilter('ignore', InsecureRequestWarning)

old_request = requests.Session.request
def new_request(self, method, url, *args, **kwargs):
    kwargs['verify'] = False  # מבטל אימות SSL
    return old_request(self, method, url, *args, **kwargs)

requests.Session.request = new_request

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


from app.api import gemini_router
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