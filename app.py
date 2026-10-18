
import os
from flask import Flask, request, jsonify, send_from_directory
from dotenv import load_dotenv
from google import genai

load_dotenv()

app = Flask(__name__)

@app.route("/")
def home():
    return send_from_directory(".", "index.html")

@app.route("/style.css")
def styles():
    return send_from_directory(".", "style.css")

@app.route("/script.js")
def scripts():
    return send_from_directory(".", "script.js")


api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise RuntimeError("GEMINI_API_KEY is missing from your .env file.")

client = genai.Client(api_key=api_key)


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    message = data.get("message", "").strip()

    if not message:
        return jsonify({"error": "Please enter a message."}), 400

    try:
        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=(
                "You are StudySidekick, a friendly student study assistant. "
                "Give clear, practical explanations and study advice. "
                "Keep answers concise and beginner-friendly.\n\n"
                f"Student: {message}"
            ),
        )

        print("AI RESPONSE:", repr(response.text))
        return jsonify({"reply": response.text})

    except Exception:
        app.logger.exception("Gemini request failed")
        return jsonify({
            "error": "Sorry, StudySidekick couldn't get an AI response. Try again."
        }), 502


if __name__ == "__main__":
    app.run(debug=False, port=5001)