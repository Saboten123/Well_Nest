import google.generativeai as genai
from typing import List, Dict
from ..config import GEMINI_API_KEY, GEMINI_MODEL, EMBEDDING_MODEL

genai.configure(api_key=GEMINI_API_KEY)

def generate_response(system_prompt: str, messages: List[Dict[str, str]]) -> str:
    """
    messages: list of {"role": "user"|"assistant"|"system", "content": "..."}
    We'll pass system separately and keep chat strictly user/assistant for the model call.
    """
    model = genai.GenerativeModel(GEMINI_MODEL, system_instruction=system_prompt)
    # Convert to Gemini-style input (list of dicts with role/content)
    chat_history = [{"role": m["role"], "parts": [m["content"]]} for m in messages if m["role"] in ("user", "assistant")]
    resp = model.generate_content(chat_history)
    return resp.text or ""

def summarize_conversation(existing_summary: str, messages: List[Dict[str, str]]) -> str:
    """
    Summarize entire conversation to a compact brief, suitable for retrieval in future turns.
    """
    model = genai.GenerativeModel(GEMINI_MODEL)
    prompt = (
        "You are summarizing a doctor-patient chat for future context.\n"
        "Produce a concise, factual, privacy-aware summary capturing:\n"
        "- patient concerns, symptoms, key facts\n"
        "- clinician reasoning, differentials, and recommendations\n"
        "- timeline and follow-ups\n"
        "Do NOT include personally identifying information.\n\n"
        f"Existing summary (may be empty):\n{existing_summary}\n\n"
        "Recent messages:\n" + "\n".join([f"{m['role']}: {m['content']}" for m in messages])
    )
    resp = model.generate_content(prompt)
    return (resp.text or "").strip()

def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Returns a list of embedding vectors for the given texts using Gemini embeddings.
    """
    # Batch embed using embed_content
    vectors: List[List[float]] = []
    for t in texts:
        e = genai.embed_content(model=EMBEDDING_MODEL, content=t)
        vectors.append(e["embedding"])
    return vectors
