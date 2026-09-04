from typing import TypedDict

from langgraph.graph import StateGraph, START, END

from schemas import Payment
from analyzer import analyze_payment
from agent import ask_ai
from guardrails import check_action
from recovery import execute_recovery_action


# Stores information as it moves through the workflow
class RecoveryState(TypedDict):
    payment: Payment
    analysis: dict
    ai_decision: str
    safety_check: dict
    recovery_action: dict


# Step 1: Analyze payment
def analyze_node(state: RecoveryState):
    analysis = analyze_payment(state["payment"])

    return {
        "analysis": analysis
    }


# Step 2: AI decision
def ai_node(state: RecoveryState):

    action = state["analysis"]["recommended_action"]

    # Known payment failures can be handled safely
    # without spending an AI request.
    if action in {
        "retry_now",
        "retry_later",
        "ask_for_another_payment_method"
    }:
        return {
            "ai_decision": (
                "Rule-based decision approved. "
                "Known failure type does not require AI escalation."
            )
        }

    # Unknown failures are sent to Gemini.
    ai_decision = ask_ai(
        state["payment"],
        state["analysis"]
    )

    return {
        "ai_decision": ai_decision
    }


# Step 3: Check safety
def guardrail_node(state: RecoveryState):

    safety_check = check_action(
        state["analysis"]["recommended_action"],
        retry_count=state["payment"].retry_count,
        amount=state["payment"].amount
    )

    return {
        "safety_check": safety_check
    }


# Step 4: Execute recovery
def recovery_node(state: RecoveryState):

    if state["safety_check"]["allowed"]:

        recovery_action = execute_recovery_action(
            state["analysis"]["recommended_action"],
            state["payment"].amount
        )

    else:

        recovery_action = {
            "action": state["analysis"]["recommended_action"],
            "status": "blocked",
            "message": state["safety_check"]["reason"],
            "recovered_amount": 0
        }

    return {
        "recovery_action": recovery_action
    }


# Create workflow
graph = StateGraph(RecoveryState)

graph.add_node("analyze", analyze_node)
graph.add_node("ai_decision", ai_node)
graph.add_node("guardrails", guardrail_node)
graph.add_node("recovery", recovery_node)


# Connect workflow
graph.add_edge(START, "analyze")
graph.add_edge("analyze", "ai_decision")
graph.add_edge("ai_decision", "guardrails")
graph.add_edge("guardrails", "recovery")
graph.add_edge("recovery", END)


# Compile workflow
recovery_graph = graph.compile()


# Test the workflow directly
if __name__ == "__main__":

    test_payment = Payment(
        payment_id="pay_test",
        customer_id="cust_test",
        amount=999,
        status="failed",
        failure_reason="insufficient_funds"
    )

    result = recovery_graph.invoke({
        "payment": test_payment
    })

    print(result)