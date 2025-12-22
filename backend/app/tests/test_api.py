import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app

client = TestClient(app)


# שימי לב לנתיב: app.api.gemini_router (כי ככה זה אצלך בקובץ main)
@patch("app.api.gemini_router.get_video_transcript")
@patch("app.api.gemini_router.client.auth_tokens.create")
def test_generate_token_with_video(mock_token_create, mock_get_transcript):
    # 1. הגדרת זיוף לתמלול
    mock_get_transcript.return_value = "This is a test transcript."

    # 2. הגדרת זיוף לטוקן
    mock_token = MagicMock()
    mock_token.name = "fake-token-123"
    mock_token_create.return_value = mock_token

    # 3. קריאה ל-API
    response = client.get("/gen-token?video_url=https://youtube.com/watch?v=123")

    assert response.status_code == 200
    assert response.json() == {"token": "fake-token-123"}


@patch("app.api.gemini_router.client.auth_tokens.create")
def test_generate_token_no_video(mock_token_create):
    mock_token = MagicMock()
    mock_token.name = "default-token"
    mock_token_create.return_value = mock_token

    response = client.get("/gen-token")

    assert response.status_code == 200
    assert response.json()["token"] == "default-token"