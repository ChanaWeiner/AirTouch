import os
from google import genai
from fastapi import WebSocket

class GeminiLiveService:
    def __init__(self):
        self.client = genai.Client(
            api_key="AQ.Ab8RN6K7VQfaClW2WLnNbpyNKSAwaMW_lgjxN9hECTQdxOJ4dQ",
            http_options={'api_version': "v1alpha"}
        )
        self.model_id = "gemini-2.0-flash-exp"

    async def stream_audio_to_gemini(self,client_websocket: WebSocket):
        """מנהל את התקשורת הדו-כיוונית מול גוגל"""
        async with self.client.aio.live.connect(model=self.model_id) as session:
            print("Connected to Gemini Live API")

            while True:
                try:
                    data = await client_websocket.receive()

                    if "bytes" in data:
                        await session.send(input=data["bytes"],end_of_turn=True)
                    elif "text" in data:
                           await session.send(input=data["text"],end_of_turn=True)

                    async for response in session.recieve():
                        if response.text:
                            await client_websocket.send_json({
                                "type": "text",
                                "content": response.text,
                            })
                            if response.data:
                                await client_websocket.send_bytes(response.data)
                except Exception as e:
                    print(f"Error in Live Session: {e}")
                    break


#AQ.Ab8RN6JiSfOJuTsi8zx8mgk_AnY87Uojf69K_WLl--DSmLvnWw