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
store = {}
user_id = "user123"

w3 = Web3(
    Web3.HTTPProvider("https://sepolia.infura.io/v3/cae6eccc47544f2889b6e7f418521a31")
)
CONTRACT_ADDRESS = "0x2adB3b4e8B944B9d02Fa7B96DEF2a19d2473A89d"  # ← your contract

ABI = [  # minimal ABI for the tools
    {
        "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
        "name": "getStaked",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
        "name": "calculateRewards",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "address", "name": "owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
]

contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=ABI)


@tool
def get_staked_amount() -> str:
    """Get how much the user has staked"""
    try:
        staked = contract.functions.getStaked(
            w3.eth.account.from_key(os.getenv("PRIVATE_KEY")).address
        ).call()
        return f"You have staked {staked / 1e18:.4f} YIELD"
    except:
        return "Could not fetch staked amount"


@tool
def get_pending_rewards() -> str:
    """Get pending rewards"""
    try:
        rewards = contract.functions.calculateRewards(
            w3.eth.account.from_key(os.getenv("PRIVATE_KEY")).address
        ).call()
        return f"You have {rewards / 1e18:.4f} YIELD in pending rewards"
    except:
        return "Could not fetch pending rewards"


@tool
def get_total_balance() -> str:
    """Get total YIELD balance"""
    try:
        balance = contract.functions.balanceOf(
            w3.eth.account.from_key(os.getenv("PRIVATE_KEY")).address
        ).call()
        return f"Your total YIELD balance is {balance / 1e18:.4f}"
    except:
        return "Could not fetch balance"


tools = [get_staked_amount, get_pending_rewards, get_total_balance]


def get_session_id(session_id: str):
    if session_id not in store:
        store[session_id] = ChatMessageHistory()
    return store[session_id]


llm = ChatOpenAI(base_url=base_url, api_key=api_key, model=model)


agent = create_agent(
    model=llm,
    tools=tools,
    system_prompt="""
     You are a helpful AI assistant.

    """,
)
agent_with_memory = RunnableWithMessageHistory(
    agent, get_session_id, input_messages_key="messages"
)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})


@app.route("/", methods=["GET", "POST"])
def index():
    """
    Purpose: Index route
    """
    if request.method == "POST":
        if not request.get_json(silent=True):
            return jsonify({"error": "json data not define"}), 400

        data = request.get_json()
        user_input = data.get("user_input")
        if not user_input:
            return jsonify({"error": "user_input is required"}), 400

        resp = agent_with_memory.invoke(
            {"messages": [{"role": "user", "content": user_input}]},
            config={"configurable": {"session_id": user_id}},
        )
        return jsonify({"role": "ai", "content": resp["messages"][-1].content}), 201

    data = {"role": "ai", "content": "This is a custom reply"}
    return jsonify(data), 200


# end def
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=4000, debug=True)
