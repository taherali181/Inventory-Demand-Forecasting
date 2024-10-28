# chatbot.py
from fastapi import FastAPI

app = FastAPI()

responses = {
    "upload": "You can upload your sales data as a CSV file.",
    "forecast": "You can specify the forecast horizon (e.g., number of days, weeks, or months).",
    "help": "I can assist you with uploading data, setting forecast parameters, and more."
}

@app.get("/chat/{user_input}")
async def chat(user_input: str):
    return {"response": responses.get(user_input.lower(), "I'm sorry, I don't understand that question.")}