from fastapi import APIRouter

from ..models.question import QuestionRequest, GeminiResponse
from ..services.gemini_service import get_gemini_answer

# הגדרת ה-Router
router = APIRouter()

@router.post("/ask-gemini", response_model=GeminiResponse)
async def ask_gemini_route(request: QuestionRequest):
    """
    מטפל בבקשת POST לשאול את Gemini על בסיס תמלול.
    """
    answer = await get_gemini_answer(request)
    return {"answer": answer}