# app/main.py
# --- חובה: תיקון אגרסיבי ל-urllib3 עבור סינון (Netspark/Nativ) ---
import ssl
import urllib3.util.ssl_

# אנחנו דורסים את הפונקציה שיוצרת את ההקשר של ה-SSL בתוך הספרייה urllib3
def create_weak_urllib3_context(ssl_version=None, cert_reqs=None, options=None, ciphers=None):
    # יצירת קונטקסט בסיסי
    context = ssl.SSLContext(ssl_version or ssl.PROTOCOL_TLS)
    
    # 1. הנמכת רמת האבטחה לרמה 1 (זה הפתרון ל-Key too weak)
    # זה מאפשר שימוש בתעודות עם הצפנה ישנה יותר (כמו של הסינון)
    try:
        context.set_ciphers('DEFAULT@SECLEVEL=1')
    except Exception:
        pass

    # 2. ביטול מוחלט של אימות
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    
    return context

# החלפה בפועל
urllib3.util.ssl_.create_urllib3_context = create_weak_urllib3_context
# --- סוף התיקון ---

# מכאן הקוד הרגיל של השרת
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
    return {"message": "AirTouch Server is Running! (Urllib3 patched for SSL)"}
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