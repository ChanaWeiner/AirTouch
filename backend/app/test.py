from dotenv import load_dotenv
from google import genai
import os, certifi

load_dotenv()

os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

print(
    client.models.generate_content(
        model="gemini-2.5-flash",
        contents="ping"
    ).text
)
