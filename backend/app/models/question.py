from pydantic import BaseModel

class QuestionRequest(BaseModel):
    """
    מודל Pydantic לגוף הבקשה ל-Gemini.
    """
    video_url: str # שינינו מ-full_transcript ל-video_url
    user_question: str

class GeminiResponse(BaseModel):
    """
    מודל Pydantic לתשובה המוחזרת מהשרת.
    """
    answer: str