
from typing import List, Dict, Optional
import re

from langgraph.prebuilt import create_react_agent
from langchain.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI

from .rag import RAGStore
from .tools.tavily_tool import web_search
from .config import TOP_K, GEMINI_API_KEY



_rag: Optional[RAGStore] = None
def set_rag_store(rag: RAGStore):
    global _rag
    _rag = rag



@tool("rag")
def rag_tool(query: str) -> str:
    """Retrieve relevant snippets from the local RAG knowledge base."""
    if _rag is None:
        return "RAG store not initialized."
    hits = _rag.retrieve(query, top_k=TOP_K)
    if not hits:
        return "No results found in RAG store."
    return "\n\n".join(
        f"[RAG] Source: {h['source']}\n{h['text']}" for h in hits
    )


@tool("web")
def web_tool(query: str) -> str:
    """Search the web for up-to-date information (Tavily)."""
    hits = web_search(query, max_results=TOP_K)
    if not hits:
        return "No web results found."
    return "\n\n".join(
        f"[WEB] {w.get('title','')}" + (f" | {w.get('url','')}" if w.get('url') else "") + f"\n{w.get('content','')}"
        for w in hits
    )


tools = [rag_tool, web_tool]



SYSTEM_PROMPT = (
    "You are an advanced healthcare assistant. Provide clear, evidence-aware guidance.\n"
    "Always be cautious: do not diagnose definitively; suggest differentials and when to seek urgent care.\n"
    "Use the provided context (conversation history, RAG chunks, and web snippets) faithfully. Cite sources.\n"
    "If unsure, say so and recommend consulting a licensed clinician.\n"
)



gemini_llm = ChatGoogleGenerativeAI(
    model="gemini-3.6-flash",
    temperature=0,
    convert_system_message_to_human=True,
    google_api_key=GEMINI_API_KEY,
)

agent = create_react_agent(
    model=gemini_llm,
    tools=tools,
)



def _extract_citations_from_messages(messages: List) -> List[Dict]:
    citations: List[Dict] = []
    seen = set()

    rag_pattern = re.compile(r"\[RAG\]\s*Source:\s*([^\n]+)")
    web_pattern = re.compile(r"\[WEB\]\s*(.*?)\s*\|\s*(https?://\S+)")

    for m in messages:
        content = getattr(m, "content", "")
        if not isinstance(content, str):
            continue

        for match in rag_pattern.finditer(content):
            src = match.group(1).strip()
            key = (src, None)
            if key not in seen:
                seen.add(key)
                citations.append({"source": src, "url": None})

        for match in web_pattern.finditer(content):
            title = match.group(1).strip() or "web"
            url = match.group(2).strip()
            key = (title, url)
            if key not in seen:
                seen.add(key)
                citations.append({"source": title, "url": url})

    return citations



def run_agent(query: str, memory_context: List[Dict[str, str]]) -> Dict:
    """
    Executes the ReAct agent with query + memory context.
    Returns {"reply": str, "citations": List[Dict]}
    """
    msgs: List[Dict[str, str]] = []

 
    msgs.append({"role": "system", "content": SYSTEM_PROMPT})

    for m in memory_context:
        msgs.append({"role": m["role"], "content": m["content"]})

    msgs.append({"role": "user", "content": query})

    # Run agent
    result = agent.invoke({"messages": msgs})

    reply = ""
    messages = result.get("messages", [])

   
    for m in reversed(messages):
        role = getattr(m, "type", None) or getattr(m, "role", None)
        content = getattr(m, "content", None)
        if role == "ai" or role == "assistant":
            if isinstance(content, str):
                reply = content
            elif isinstance(content, list):
                # If content is structured parts, join text
                reply = " ".join(
                    c.get("text", "") for c in content if isinstance(c, dict)
                )
            break

    citations = _extract_citations_from_messages(messages)

    return {"reply": reply, "citations": citations}
