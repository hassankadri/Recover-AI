import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI


load_dotenv()


llm = ChatGoogleGenerativeAI(
    model="gemini-3.6-flash",
    api_key=os.getenv("GEMINI_API_KEY")
)


def ask_ai(payment, analysis):
    prompt = f"""
You are RecoverAI, a payment recovery assistant.

Payment:
- Amount: ₹{payment.amount}
- Status: {payment.status}
- Failure reason: {payment.failure_reason}

Initial analysis:
- Reason: {analysis["reason"]}
- Recommended action: {analysis["recommended_action"]}

Decide whether the recommended action is appropriate.

Return:
1. Decision
2. Short explanation
3. Risk level
"""

    response = llm.invoke(prompt)

    return response.text