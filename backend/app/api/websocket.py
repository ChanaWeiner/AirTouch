from fastapi import APIRouter, WebSocket
from app.services.gemini_live import GeminiLiveService
from app.services.gemini_live_vertex_ai import GeminiLiveManager

router = APIRouter()
gemini_service = GeminiLiveManager()

@router.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        await gemini_service.stream_audio_to_gemini(websocket)
    except Exception as e:
        print(f"WebSocket Connection Closed: {e}")
    finally:
        await websocket.close()