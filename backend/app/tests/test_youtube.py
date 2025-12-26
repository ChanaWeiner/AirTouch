import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
from youtube_transcript_api import TranscriptsDisabled, NoTranscriptFound
from app.services.youtube_service import get_video_transcript, extract_video_id
import pytest
from app.services.youtube_service import TRANSCRIPT_CACHE # ייבוא המילון הגלובלי

@pytest.fixture(autouse=True)
def clear_cache():
    """מנקה את ה-Cache לפני כל טסט כדי למנוע זיהום בין בדיקות"""
    TRANSCRIPT_CACHE.clear()
    yield

def test_extract_video_id_valid():
    """בודק חילוץ ID תקין משני סוגי URL נפוצים"""
    url1 = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=2s"
    url2 = "https://youtu.be/dQw4w9WgXcQ?si=xyz"
    assert extract_video_id(url1) == "dQw4w9WgXcQ"
    assert extract_video_id(url2) == "dQw4w9WgXcQ"

def test_extract_video_id_invalid():
    """בודק שהפונקציה זורקת שגיאה ב-URL לא תקין"""
    with pytest.raises(ValueError, match="Invalid YouTube URL"):
        extract_video_id("https://google.com")

@pytest.mark.asyncio
@patch("app.services.youtube_service.YouTubeTranscriptApi")
async def test_get_video_transcript_success(mock_api_class):
    """
    בודק שהפונקציה מצליחה לחבר את הטקסט מהתמלול בצורה נכונה עם זמנים.
    """
    mock_transcript = MagicMock()
    mock_transcript.language_code = "he"
    
    mock_transcript.fetch.return_value.to_raw_data.return_value = [
        {"text": "שלום", "start": 0.0, "duration": 2.0},
        {"text": "לכולם", "start": 2.5, "duration": 1.5}
    ]

    mock_list_obj = MagicMock()
    mock_list_obj.find_transcript.return_value = mock_transcript
    
    mock_api_instance = mock_api_class.return_value
    mock_api_instance.list.return_value = mock_list_obj

    result = await get_video_transcript("https://youtu.be/test_id")

    assert "[LANGUAGE_CODE: he]" in result
    assert "[0s] שלום" in result
    assert "[2s] לכולם" in result

@pytest.mark.asyncio
@patch("app.services.youtube_service.YouTubeTranscriptApi")
async def test_get_video_transcript_disabled(mock_api_class):
    """
    בודק שהפונקציה מחזירה HTTPException 404 כשהכתוביות חסומות.
    """
    # הגדרת המוק כך שיזרוק שגיאת TranscriptsDisabled כשקוראים ל-list()
    mock_api_instance = mock_api_class.return_value
    mock_api_instance.list.side_effect = TranscriptsDisabled("video_id")

    with pytest.raises(HTTPException) as excinfo:
        await get_video_transcript("https://youtu.be/test_id")
    
    assert excinfo.value.status_code == 404
    assert "disabled" in excinfo.value.detail.lower()

@pytest.mark.asyncio
@patch("app.services.youtube_service.YouTubeTranscriptApi")
async def test_get_video_transcript_not_found(mock_api_class):
    """
    בודק מקרה שבו לא נמצא תמלול בשפות המבוקשות ואין תמלולים אחרים.
    """
    mock_api_instance = mock_api_class.return_value
    mock_list_obj = MagicMock()

    # גורמים ל-find_transcript לזרוק את השגיאה (עם פרמטרים כדי שהמוק לא יקרוס)
    mock_list_obj.find_transcript.side_effect = NoTranscriptFound("test_id", [], {})
    
    # גורמים לרשימה הכללית להיות ריקה
    mock_list_obj.__iter__.return_value = iter([]) 

    mock_api_instance.list.return_value = mock_list_obj

    with pytest.raises(HTTPException) as excinfo:
        await get_video_transcript("https://youtu.be/test_id")

    assert excinfo.value.status_code == 404
    assert "No direct or translatable" in excinfo.value.detail