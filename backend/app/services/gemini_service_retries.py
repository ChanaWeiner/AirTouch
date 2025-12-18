import asyncio  # עדיף להשתמש ב-asyncio.sleep במקום time.sleep ב-FastAPI
from fastapi import HTTPException
from google.genai.errors import APIError
from app.core.config import clients

MODELS = [
    "gemini-2.0-flash",  # המודל העדכני ביותר
    "gemini-2.5-flash",  # fallback יציב
]

MAX_RETRIES = 3  # כמה פעמים לנסות את כל סבב המפתחות לפני הרמת ידיים


async def get_gemini_answer(full_transcript: str, user_question: str) -> str:
    if not clients:
        raise HTTPException(status_code=500, detail="No Gemini API keys configured.")

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

    for attempt in range(MAX_RETRIES):
        # עוברים על כל הלקוחות (מפתחות) שיש לנו
        for i, current_client in enumerate(clients):
            for model in MODELS:
                try:
                    # שימוש ב-generate_content (שימי לב: אם זה לא Live, משתמשים בזה)
                    response = current_client.models.generate_content(
                        model=model,
                        contents=[prompt],
                    )

                    if response.text:
                        return response.text

                except Exception as e:
                    error_str = str(e).lower()

                    # בדיקה אם זו שגיאת הצפה (429) או עומס שרת (503/500)
                    if "429" in error_str or "quota" in error_str or "503" in error_str:
                        print(f"⚠️ Key {i} failed (Rate Limit/Overload) with model {model}. Trying next...")
                        continue  # עובר למודל הבא או למפתח הבא

                    print(f"❌ Unexpected error with key {i}: {e}")
                    continue

        # אם הגענו לכאן, כל המפתחות וכל המודלים נכשלו בסבב הנוכחי
        wait_time = (attempt + 1) * 2  # המתנה גדלה בכל פעם (Exponential-ish backoff)
        print(f"🔄 All keys exhausted. Retry {attempt + 1}/{MAX_RETRIES} in {wait_time}s...")
        await asyncio.sleep(wait_time)

    raise HTTPException(
        status_code=503,
        detail="All API keys are exhausted or rate-limited. Please wait a minute and try again."
    )