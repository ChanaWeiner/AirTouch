# app/services/gemini_service.py
from fastapi import HTTPException
from google import genai
from google.genai.errors import APIError

from ..core.config import client

async def get_gemini_answer(full_transcript: str, user_question: str) -> str:
    """
    שולח את הבקשה ל-Gemini API ומחזיר את התשובה.
    """
    if not client:
        raise HTTPException(status_code=500, detail="Gemini service unavailable. API key missing or initialization failed.")

    prompt = (
        f"You are a professional fact-checker, proofreader, and study assistant. "
        f"The provided content is a raw automatic transcript which may contain recognition errors, especially with names, jargon, or song lyrics. "
        f"Your task is a two-part process:\n\n"

        f"**TASK 1: TEXT CLEANING AND FACT-CHECKING (Use Search Tool as needed):**\n"
        f"1. **Correction:** Review the provided TRANSCRIPT and correct all spelling, grammar, and context errors. Fix severe recognition errors to match the expected, correct phrasing.\n"
        f"2. **Fact Check/Verification (Use Search Tool):** If the transcript contains technical terms, proper names, dates, or known works (like song lyrics), you MUST use the Google Search Tool to verify the accuracy and spelling of those elements.\n"
        f"3. **Language:** Translate any foreign language segments (identified by [LANGUAGE_CODE] if present) into Hebrew, and use Hebrew for the final cleaned text.\n\n"

        f"**TASK 2: ANSWER USER QUESTION:**\n"
        f"Based *only* on the clean, corrected, and verified text from TASK 1, answer the user's question clearly and completely.\n"

        f"--- RAW TRANSCRIPT ---\n"
        f"{full_transcript}\n\n"
        f"--- USER QUESTION ---\n"
        f"{user_question}"
    )

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[prompt],
            config=genai.types.GenerateContentConfig(
                tools=[{"googleSearch": {}}]
            )
        )
        if response.text:
            return response.text
        else:
            return "Gemini did not return a valid answer."
    except APIError as e:
        # טיפול בשגיאות API ספציפיות (כמו 503 Overloaded)
        print(f"Gemini API Error: {e}")
        raise HTTPException(status_code=503, detail="Gemini service is currently overloaded. Please try again.")
    except Exception as e:
        print(f"Internal Service Error: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred.")