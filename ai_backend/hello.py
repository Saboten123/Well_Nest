from dotenv import load_dotenv
import os
from google import genai

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

print("API key loaded:", bool(api_key))

client = genai.Client(api_key=api_key)

try:
    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents="Say hello in one sentence."
    )

    print("GEMINI RESPONSE:")
    print(response.text)

except Exception as e:
    print("GEMINI ERROR:")
    print(type(e).__name__)
    print(e)