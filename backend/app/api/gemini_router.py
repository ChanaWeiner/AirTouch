import asyncio
import os
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.gemini_live import GeminiLiveService
from app.services.gemini_live_vertex_ai import GeminiLiveManager
from google.genai import types
from dotenv import load_dotenv
from google import genai

from app.services.youtube_service import get_video_transcript


# טעינת משתני סביבה (API KEY)
load_dotenv()
router = APIRouter()
gemini_service = GeminiLiveManager()
client = genai.Client(api_key=os.getenv("AIR_TOUCH_KEY"), vertexai=False, http_options={'api_version': 'v1alpha',})

MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"


@router.get("/gen-token")
async def generate_token(video_url: str = None):
    try:
        system_instruction = "You are a helpful AI assistant."

        if video_url:
            try:
                transcript = await get_video_transcript(video_url)

                max_words = 1000
                words = transcript.split()
                if len(words) > max_words:
                    transcript = " ".join(words[:max_words]) + "... [Transcript truncated for brevity]"
                print(transcript)
                system_instruction = f"""
                You are a specialized video assistant. 
                The user is currently watching a YouTube video. 
                Below is a part of the transcript of the video. 
                Use this context to answer questions. 
                Keep your answers concise and conversational.

                VIDEO TRANSCRIPT:
                {transcript}
                """
                print(f"Token generated for video with {len(words)} words (capped at {max_words}).")
            except Exception as e:
                print(f"Transcript fetch failed: {e}")

        token = client.auth_tokens.create(
            config={
                'uses': 1,
                'live_connect_constraints': {
                    'model': MODEL,
                    'config': {
                        'system_instruction': system_instruction,
                        'session_resumption': {},
                        'temperature': 0.7,
                        'response_modalities': ['AUDIO']
                    }
                }
            }
        )
        return {"token": token.name}
    except Exception as e:
        print(f"Error creating token: {e}")
        return {"error": str(e)}, 500