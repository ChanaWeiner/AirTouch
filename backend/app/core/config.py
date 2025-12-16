import os
from dotenv import load_dotenv
from google import genai
from typing import Optional

load_dotenv()


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