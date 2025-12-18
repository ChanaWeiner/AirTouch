from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse # הוסיפי StreamingResponse
import edge_tts
import io
from ..models.question import QuestionRequest, GeminiResponse
from ..services.gemini_service_retries import get_gemini_answer
from ..services.youtube_service import get_video_transcript
# הגדרת ה-Router
router = APIRouter()

@router.post("/ask-gemini", response_model=GeminiResponse)
async def ask_gemini_route(request: QuestionRequest):
    """
    מטפל בבקשת POST לשאול את Gemini על בסיס תמלול.
    """
    transcript_text = await get_video_transcript(request.video_url)
    answer = await get_gemini_answer(transcript_text, request.user_question)
    return {"answer": answer}


@router.get("/tts")
async def text_to_speech(text: str = Query(...), lang: str = "he"):
    # בחירת קול: 'Hila' לעברית, 'Aria' לאנגלית (קולות מעולים)
    voice = "he-IL-HilaNeural" if lang == "he" else "en-US-AriaNeural"

    communicate = edge_tts.Communicate(text, voice)

    # הזרמת האודיו לזיכרון
    mp3_data = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            mp3_data += chunk["data"]

    return StreamingResponse(io.BytesIO(mp3_data), media_type="audio/mpeg")