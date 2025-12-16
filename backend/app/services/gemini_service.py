# app/services/gemini_service.py
from fastapi import HTTPException
from google.genai.errors import APIError

from ..core.config import client
from ..models.question import QuestionRequest

async def get_gemini_answer(request: QuestionRequest) -> str:
    """
    שולח את הבקשה ל-Gemini API ומחזיר את התשובה.
    """
    if not client:
        raise HTTPException(status_code=500, detail="Gemini service unavailable. API key missing or initialization failed.")

    prompt = (
        f"You are a helpful study assistant. "
        f"Based on the following transcript, answer the user's question concisely:\n\n"
        f"TRANSCRIPT: {request.full_transcript}\n\n"
        f"QUESTION: {request.user_question}"
    )

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[prompt],
        )
        return response.text
    except APIError as e:
        # טיפול בשגיאות API ספציפיות (כמו 503 Overloaded)
        print(f"Gemini API Error: {e}")
        raise HTTPException(status_code=503, detail="Gemini service is currently overloaded. Please try again.")
    except Exception as e:
        print(f"Internal Service Error: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred.")