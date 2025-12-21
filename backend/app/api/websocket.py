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


@router.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    audio_queue_mic = asyncio.Queue(maxsize=50)
    client_chunks_count = 0
    gemini_chunks_count = 0
    is_ai_talking = False

    await websocket.accept()
    print(f"Client Connected! Using model: {MODEL}")
    config = types.LiveConnectConfig(
    # מתוך הרשימה שלך: responseModalities
    response_modalities=["AUDIO"],

    # מתוך הרשימה שלך: speechConfig
    speech_config=types.SpeechConfig(
        voice_config=types.VoiceConfig(
            prebuilt_voice_config=types.PrebuiltVoiceConfig(
                voice_name="Puck"
            )
        )
    ),

    # מתוך הרשימה שלך: systemInstruction
    system_instruction="You are a helpful assistant. Keep answers very short."
)
    try:
        async with client.aio.live.connect(model=MODEL,config=config) as session:
            print("Connected to Gemini Live API")

            async def listen_from_websocket():
                nonlocal client_chunks_count
                nonlocal is_ai_talking
                try:
                    while True:
                        data = await websocket.receive_bytes()
                        client_chunks_count += 1

                        if client_chunks_count % 20 == 1:
                            print(f"🎤 [Client -> Server] Received chunk #{client_chunks_count} ({len(data)} bytes)")
                        # בתוך הלולאה ב-listen_from_websocket
                        if not is_ai_talking:
                            try:
                                audio_queue_mic.put_nowait({"data": data, "mime_type": "audio/pcm"})

                                # הדפסת דיבאג - תראה אם המספר הזה עולה כל הזמן
                                if client_chunks_count % 50 == 0:
                                    print(f"📊 Queue Size: {audio_queue_mic.qsize()}")

                            except asyncio.QueueFull:
                                print("⚠️ Queue is full! Dropping frame to keep connection alive.")
                except WebSocketDisconnect:
                    await audio_queue_mic.put(None)

            async def send_realtime():
                # משתנה לאגירת נתונים
                buffer = bytearray()

                try:
                    while True:
                        msg = await audio_queue_mic.get()

                        if msg is None:
                            break

                        # הוספת המידע החדש לבאפר
                        buffer.extend(msg["data"])

                        # שליחה רק אם הצטברו מספיק נתונים (למשל 6KB שזה כ-0.2 שניות)
                        # זה מפחית דרמטית את כמות הבקשות לגוגל ומונע חנק
                        if len(buffer) >= 4096:
                            try:
                                await session.send_realtime_input(audio={"data": buffer, "mime_type": "audio/pcm"})
                                buffer.clear()  # ריקון הבאפר לאחר שליחה מוצלחת

                                # חשוב מאוד: נותן למעבד "אוויר" לטפל בחיבור ה-WebSocket
                                # מונע את שגיאת ה-ping timeout
                                await asyncio.sleep(0.01)

                            except Exception as e:
                                print(f"⚠️ Error sending to Gemini: {e}")
                                # אם יש שגיאה, לא מנקים את הבאפר אלא מנסים שוב בסיבוב הבא
                                # אבל מחכים קצת כדי לא להציף בלוגים
                                await asyncio.sleep(0.1)

                except Exception as e:
                    print(f"Critical Error in send_realtime: {e}")

            async def receive_and_forward():
                nonlocal gemini_chunks_count
                is_responding = False  # משתנה למעקב אחרי תחילת תשובה

                try:
                    print("📡 Listening for responses from Gemini...")
                    async for response in session.receive():

                        if response.server_content:
                            # 1. בדיקה האם המודל מתחיל/ממשיך לדבר
                            model_turn = response.server_content.model_turn
                            if model_turn:
                                if not is_responding:
                                    print("\n🤖 [Gemini] Start speaking...")
                                    is_responding = True

                                for part in model_turn.parts:
                                    if part.inline_data:
                                        gemini_chunks_count += 1
                                        # הדפסה קטנה כל 10 צ'אנקים כדי לראות זרימה
                                        if gemini_chunks_count % 10 == 0:
                                            print(f"  > Sending audio chunk #{gemini_chunks_count}")

                                        # שליחה ללקוח ב-WebSocket
                                        await websocket.send_bytes(part.inline_data.data)

                            # 2. בדיקה אם התור הסתיים (Turn Complete)
                            if response.server_content.turn_complete:
                                print("🏁 [Gemini] Finished speaking (Turn Complete).")
                                is_responding = False
                                gemini_chunks_count = 0  # איפוס מונה לצורך הסדר
                                await websocket.send_json({
                                    "type": "status",
                                    "event": "turn_complete",
                                    "text": "Gemini finished speaking"
                                })

                        # 3. טיפול במקרה של הפרעה (Interruption)
                        if response.server_content and response.server_content.interrupted:
                            print("⚠️ [Gemini] Interrupted by user!")
                            is_responding = False

                except Exception as e:
                    print(f"❌ Error in receive_and_forward: {e}")

            await asyncio.gather(
                listen_from_websocket(),
                send_realtime(),
                receive_and_forward()
            )
    except WebSocketDisconnect:
        print("WebSocket disconnected cleanly")
    except Exception as e:
        print(f"Connection Error: {e}")
    finally:
        try:
            await websocket.close()
        except:
            pass
        print("Session closed")