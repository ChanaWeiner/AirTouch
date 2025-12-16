import os
from dotenv import load_dotenv
from google import genai
from typing import Optional

load_dotenv()

ca_bundle_path = os.getenv("REQUESTS_CA_BUNDLE")
if ca_bundle_path:
    # אם הנתיב נמצא בקובץ .env, אנחנו מכניסים אותו ל-os.environ
    # זה מבטיח שכל הספריות שמשתמשות ב-requests יראו אותו.
    os.environ['REQUESTS_CA_BUNDLE'] = ca_bundle_path
    print(f"Set REQUESTS_CA_BUNDLE to: {ca_bundle_path}") # וידוא

class Settings:
    """מחזיק את משתני הסביבה והגדרות הבסיס."""
    API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")


settings = Settings()

client = None
if settings.API_KEY:
    try:
        client = genai.Client(api_key=settings.API_KEY)
    except Exception as e:
        print(f"Configuration Error: Failed to initialize Gemini client: {e}")