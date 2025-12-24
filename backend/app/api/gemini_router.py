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

tools = [
    {
        "function_declarations": [
            {
                "name": "jump_to_video_timestamp",
                "description": "Navigates the video to the start of a specific topic, explanation, or mentioned segment based on semantic understanding of the user's request.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "timestamp_seconds": {
                            "type": "NUMBER",
                            "description": "The exact time in seconds to jump to in the video."
                        }
                    },
                    "required": ["timestamp_seconds"]
                }
            }
        ]
    }
]


@router.get("/gen-token")
async def generate_token(video_url: str = None, current_time: int = 0):
    try:
        system_instruction = "You are a helpful AI assistant."

        if video_url:
            try:
                transcript = await get_video_transcript(video_url)

                max_words = 5000
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
4. The video is currently at {current_time} seconds. Use this to understand questions about what was "just said" or "this part".

COMMANDS & TOOL USAGE:
- **Semantic Jump (CRITICAL)**: When the user wants to go to a specific part, use your intelligence to find the *logical start* of that topic in the transcript. Don't just look for keywords—understand the context.
- **Trigger the Tool**: You MUST call `jump_to_video_timestamp(timestamp_seconds=NUMBER)` to actually move the video.
- **Brief Confirmation**: Give a short, cute confirmation like "Sure thing! Jumping to the part about [Topic]..." and execute the tool immediately.
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
                        'tools': tools,
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