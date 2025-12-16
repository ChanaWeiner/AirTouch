from fastapi import APIRouter

from ..models.question import QuestionRequest, GeminiResponse
from ..services.gemini_service import get_gemini_answer
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