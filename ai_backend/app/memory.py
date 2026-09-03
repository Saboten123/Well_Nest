import time
from typing import Dict, List
from .db import conversations
from .config import SUMMARY_INTERVAL, KEEP_LAST_N
from .tools.gemini_tool import summarize_conversation

#{session_id: {"summary": str, "messages": [..], "turns": int, "updated_at": float}}
_GUEST_MEM: Dict[str, Dict] = {}


def _now() -> float:
    return time.time()


def _empty_doc() -> Dict:
    return {"summary": "", "messages": [], "turns": 0, "updated_at": _now()}


def _count_user_turns(messages: List[Dict[str, str]]) -> int:
    return sum(1 for m in messages if m["role"] == "user")


def load_memory(user_key: str, signed_in: bool) -> Dict:
    """
    Returns a conversation doc.
    For signed-in users → load from Mongo, create one if missing.
    For guests → use in-memory store.
    """
    if signed_in:
        found = conversations.find_one({"user_id": user_key})
        if not found:
            # Insert new doc for this signed-in user
            doc = _empty_doc()
            conversations.insert_one({"user_id": user_key, **doc})
            return doc

        return {
            "summary": found.get("summary", ""),
            "messages": found.get("messages", []),
            "turns": found.get("turns", 0),
            "updated_at": found.get("updated_at", _now()),
        }

    # guest
    if user_key not in _GUEST_MEM:
        _GUEST_MEM[user_key] = _empty_doc()
    return _GUEST_MEM[user_key]


def save_memory(user_key: str, signed_in: bool, doc: Dict) -> None:
    doc["updated_at"] = _now()
    if signed_in:
        conversations.update_one(
            {"user_id": user_key},
            {
                "$set": {
                    "summary": doc.get("summary", ""),
                    "messages": doc.get("messages", []),
                    "turns": doc.get("turns", 0),
                    "updated_at": doc["updated_at"],
                }
            },
            upsert=True,
        )
    else:
        _GUEST_MEM[user_key] = doc


def build_context(doc: Dict) -> List[Dict[str, str]]:
    """
    Returns a list of messages to feed the agent: [ {"role","content"}, ... ]
    Includes summary (system preface) + actual history.
    """
    messages: List[Dict[str, str]] = []
    if doc.get("summary"):
        messages.append(
            {"role": "system", "content": f"Conversation summary:\n{doc['summary']}"}
        )
    messages.extend(doc.get("messages", []))
    return messages


def update_on_interaction(user_key: str, signed_in: bool, user_msg: str, assistant_msg: str) -> Dict:
    """
    Append user+assistant turns, summarize every SUMMARY_INTERVAL turns,
    keep only summary + last KEEP_LAST_N turns.
    """
    doc = load_memory(user_key, signed_in)
    doc["messages"].append({"role": "user", "content": user_msg})
    doc["messages"].append({"role": "assistant", "content": assistant_msg})

    # Count user turns
    user_turns = _count_user_turns(doc["messages"])
    doc["turns"] = user_turns

    # Summarize at interval
    if user_turns > 0 and user_turns % SUMMARY_INTERVAL == 0:
        new_summary = summarize_conversation(doc.get("summary", ""), doc["messages"])

        # keep only last N pairs
        pairs: List[Dict[str, str]] = []
        i = len(doc["messages"]) - 1
        collected = 0
        while i >= 1 and collected < KEEP_LAST_N:
            if (
                doc["messages"][i]["role"] == "assistant"
                and doc["messages"][i - 1]["role"] == "user"
            ):
                pairs.append(doc["messages"][i - 1])
                pairs.append(doc["messages"][i])
                collected += 1
                i -= 2
            else:
                i -= 1

        pairs.reverse()
        doc["summary"] = new_summary
        doc["messages"] = pairs

    save_memory(user_key, signed_in, doc)
    return doc
