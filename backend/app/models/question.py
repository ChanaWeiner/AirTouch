from pydantic import BaseModel

class QuestionRequest(BaseModel):
    """
    מודל Pydantic לגוף הבקשה ל-Gemini.
    """
    full_transcript: str
    user_question: str

class GeminiResponse(BaseModel):
    """
    מודל Pydantic לתשובה המוחזרת מהשרת.
    """
    answer: str