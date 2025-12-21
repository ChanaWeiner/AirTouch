import os
from google import genai
from fastapi import WebSocket
import dotenv
dotenv.load_dotenv()

class GeminiLiveService:
    def __init__(self):
        self.client = genai.Client(
            api_key=os.getenv("AIR_TOUCH_KEY"),
            vertexai=False,
            http_options={'api_version': "v1alpha"}
        )
        self.model_id = "gemini-2.0-flash-exp"

    async def stream_audio_to_gemini(self, client_websocket: WebSocket):
        # הגדרת המודל לענות באודיו (זה מה שיוצר את הקול האנושי)
        config = {"generation_config": {"response_modalities": ["audio"]}}

        try:
            async with self.client.aio.live.connect(model=self.model_id, config=config) as session:
                print("Successfully connected to Gemini Live!")

                async def send_to_gemini():
                    async for message in client_websocket.iter_bytes():
                        await session.send(input=message, end_of_turn=True)

                async def receive_from_gemini():
                    async for response in session.receive():
                        if response.data:  # זה האודיו שחוזר מגוגל
                            await client_websocket.send_bytes(response.data)
                        if response.text:
                            await client_websocket.send_json({"type": "text", "content": response.text})

                # הרצה של שני התהליכים יחד כדי למנוע חסימה (Deadlock)
                await asyncio.gather(send_to_gemini(), receive_from_gemini())

        except Exception as e:
            print(f"Error in Live Session: {e}")


