import asyncio
from google import genai
from fastapi import WebSocket


class GeminiLiveManager:
    def __init__(self):
        self.model_id = "gemini-2.0-flash-exp"
        self.client = genai.Client(
            vertexai=True,
            project="tangential-helper-pqvfd",
            location="us-central1"
        )

    async def stream_audio_to_gemini(self, client_websocket: WebSocket):
        """מנהל תקשורת דו-כיוונית מול Vertex AI Live API"""

        # חיבור ל-Live API ב-Vertex
        async with self.client.aio.live.connect(model=self.model_id) as session:
            print(f"Connected to Vertex AI Live API (Model: {self.model_id})")

            async def send_to_gemini():
                """שליחת קלט מהמשתמש לג'מיני"""
                try:
                    while True:
                        data = await client_websocket.receive()
                        if "bytes" in data:
                            # ב-Live API, המודל מזהה לבד מתי סיימת לדבר
                            await session.send(input=data["bytes"], end_of_turn=False)
                        elif "text" in data:
                            await session.send(input=data["text"], end_of_turn=True)
                except Exception as e:
                    print(f"Error sending to Gemini: {e}")

            async def receive_from_gemini():
                """קבלת פלט מג'מיני ושליחה למשתמש"""
                try:
                    # שימי לב לכתיב הנכון: receive
                    async for response in session.receive():
                        # טיפול בטקסט (אם יש)
                        if response.text:
                            await client_websocket.send_json({
                                "type": "text",
                                "content": response.text,
                            })

                        # טיפול באודיו (הדאטה הגולמי שחוזר)
                        if response.data:
                            await client_websocket.send_bytes(response.data)

                except Exception as e:
                    print(f"Error receiving from Gemini: {e}")

            # הרצת שני התהליכים במקביל כדי לאפשר שיחה חיה (Full Duplex)
            await asyncio.gather(send_to_gemini(), receive_from_gemini())