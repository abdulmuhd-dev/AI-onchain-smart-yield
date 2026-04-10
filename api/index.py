from langchain_openai import ChatOpenAI
from langchain.agents import create_agent
from langchain.tools import tool
from langchain_core.prompts import ChatPromptTemplate
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from web3 import Web3
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import os
load_dotenv()

base_url = os.getenv("BASE_URL")
model = os.getenv("MODEL_NAME")
api_key = os.getenv("API_KEY")
llm = ChatOpenAI(
    base_url=base_url,
    api_key=api_key,
    model=model
)
prompt = ChatPromptTemplate([
    ("system", "You are helpful AI assistant you answer questions friendly and concisely."),
    ("user", "{user_input}")
])
chatLLM = prompt | llm

app = Flask(__name__)
#CORS(app)

@app.route("/", methods=["GET", "POST"])
def index():
    """
    Purpose: Index route
    """
    if request.method == "POST":
        data = request.get_json()
        user_input = data.get("user_input")
        resp = chatLLM.invoke({
            "user_input": user_input
        })
        return jsonify({
            "role": "ai",
            "content": resp.content
        }), 201

    data = {
        "role": "ai",
        "content": "This is a custom reply"
    }
    return jsonify(data), 200
# end def
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=4000, debug=True)