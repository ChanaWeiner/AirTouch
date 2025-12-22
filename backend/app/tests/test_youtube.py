from http.client import HTTPException

import pytest
from unittest.mock import patch, MagicMock, mock_open
from app.services.youtube_service import get_video_transcript, extract_video_id

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
@patch("app.services.youtube_service.YouTubeTranscriptApi.list_transcripts")
@patch("builtins.open",new_callable=mock_open, read_data="cookie_data")
async def test_get_video_transcript_success(mock_file,mock_list):
    """
    בודק שהפונקציה מצליחה לחבר את הטקסט מהתמלול בצורה נכונה.
    """
    mock_transcript = MagicMock()
    mock_transcript.language_code = "he"
    mock_transcript.fetch.return_value.to_raw_data.return_value = [
        {"text": "שלום"}, {"text": "לכולם"}
    ]

    mock_list_obj = MagicMock()
    mock_list_obj.find_transcript.return_value = mock_transcript
    mock_list.return_value = mock_list_obj

    result = await get_video_transcript("https://youtu.be/test_id")

    assert "[LANGUAGE_CODE: he]" in result
    assert "שלום לכולם" in result

@pytest.mark.asyncio
@patch("app.services.youtube_service.YouTubeTranscriptApi.list_transcripts")
@patch("builtins.open",new_callable=mock_open, read_data="cookie_data")
async def test_get_video_transcript_disabled(mock_file,mock_list_transcripts):
    """
    בודק שהפונקציה מחזירה HTTPException 404 כשהכתוביות חסומות.
    """
    from youtube_transcript_api import TranscriptsDisabled
    from fastapi import HTTPException as FastAPIHTTPException  # ייבוא מפורש

    mock_list_transcripts.side_effect = TranscriptsDisabled("video_id")

    try:
        await get_video_transcript("https://youtu.be/test_id")
        pytest.fail("Should have raised HTTPException but didn't")
    except FastAPIHTTPException as exc:
        assert exc.status_code == 404
        assert "disabled" in exc.detail.lower()
    except Exception as e:
        pytest.fail(f"Raised wrong exception type: {type(e)} - Expected: {FastAPIHTTPException}")