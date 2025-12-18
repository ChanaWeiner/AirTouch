import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

class Settings:
    # קורא מחרוזת מופרדת בפסיקים
    raw_keys = os.getenv("GEMINI_API_KEYS", "")
    API_KEYS = [k.strip() for k in raw_keys.split(",") if k.strip()]

settings = Settings()

# יצירת רשימת קליינטים
clients = []
for key in settings.API_KEYS:
    try:
        clients.append(genai.Client(api_key=key))
    except Exception as e:
        print(f"❌ Failed to init client for key {key[:5]}...: {e}")

print(f"✅ Loaded {len(clients)} Gemini API keys.")