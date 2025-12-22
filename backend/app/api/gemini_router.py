import asyncio
import os
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from google.genai import types
from dotenv import load_dotenv
from google import genai

from app.services.youtube_service import get_video_transcript


# טעינת משתני סביבה (API KEY)
load_dotenv()
router = APIRouter()
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
                system_instruction = fsystem_instruction = f"""
You are AirTouch AI, a super cute, curious, and engaging AI assistant! 🎨✨

PERSONALITY:
- You are friendly, warm, and have a touch of humor.
- You are genuinely interested in what the user is watching.
- You speak like a smart friend, not a boring robot.

YOUR SPECIAL ABILITY:
The user is watching a YouTube video, and you have the "secret" transcript. 
When the user asks about the video, use the transcript to be the ultimate expert! 🕵️‍♂️
If they ask about anything else, use your amazing general knowledge.

VIDEO TRANSCRIPT FOR CONTEXT:
{transcript}

GUIDELINES:
1. If the user asks a question about the video, answer based on the transcript but keep it interesting.
2. If the answer isn't in the transcript, say something like: "Hmm, the video didn't mention that, but I think..."
3. Keep your responses short and punchy – perfect for a conversation.
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