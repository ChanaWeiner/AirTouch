# app/services/gemini_service.py
from fastapi import HTTPException
from google import genai
from google.genai.errors import APIError
from ..core.config import client
import time

# רשימת מודלים לפי עדיפות
MODELS = [
    "models/gemini-2.5-flash",  # הכי חזק, אבל עלול להיות עמוס
    "models/gemini-2.0-flash",  # fallback יציב יותר
    "models/gemini-2.5-pro",    # fallback נוסף אם צריך
    "gemini-flash-latest"
]

async def get_gemini_answer(full_transcript: str, user_question: str) -> str:
    """
    שולח את הבקשה ל-Gemini API ומחזיר את התשובה.
    כולל מנגנון fallback בין מודלים במקרה של overload או שגיאות.
    """
    if not client:
        raise HTTPException(status_code=500, detail="Gemini service unavailable. API key missing or initialization failed.")

    prompt = (
        f"You are an intelligent AI Research Agent. "
        f"Your goal is to answer the user's question with maximum accuracy and depth.\n\n"

        f"**Knowledge Sources:**\n"
        f"1. **Primary Source (Context):** Use the provided VIDEO TRANSCRIPT to understand the specific topic being discussed.\n"
        f"2. **Internal Knowledge:** Use your vast pre-trained knowledge to explain concepts, fill in gaps, and provide background information.\n"
        f"3. **Real-time Search:** Use the Google Search Tool to verify names, find current data, or expand on topics mentioned in the video.\n\n"

        f"**Instructions:**\n"
        f"- Combine all sources to provide a comprehensive answer in the language of the user's question.\n"
        f"- If the transcript is the main focus, prioritize it, but feel free to add 'Extra Insights' from your own knowledge or the web.\n"
        f"- Be precise, professional, and helpful.\n\n"

        f"--- DATA ---\n"
        f"TRANSCRIPT: {full_transcript}\n"
        f"USER QUESTION: {user_question}"
    )

    for model in MODELS:
        try:
            response = client.models.generate_content(
                model=model,
                contents=[prompt],
            )
            if response.text:
                return response.text
        except APIError as e:
            # טיפול בשגיאות API ספציפיות (503 Overloaded)
            print(f"{model} failed with APIError: {e}")
            if "503" in str(e):
                print("Waiting 2 seconds before trying next model...")
                time.sleep(2)  # אפשר לשחק עם זמן ההמתנה
        except Exception as e:
            print(f"{model} failed with internal error: {e}")

    # אם אף מודל לא ענה
    raise HTTPException(status_code=503, detail="All Gemini models are currently unavailable. Please try again later.")
