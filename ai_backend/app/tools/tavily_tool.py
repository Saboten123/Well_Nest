from typing import List, Dict
from tavily import TavilyClient
from ..config import TAVILY_API_KEY

_client = TavilyClient(api_key=TAVILY_API_KEY) if TAVILY_API_KEY else None

def web_search(query: str, max_results: int = 5) -> List[Dict]:
    """
    Returns list of dicts: {"title": str, "url": str, "content": str}
    If API key is missing, returns empty list.
    """
    if not _client:
        return []
    res = _client.search(query=query, max_results=max_results)
    # tavily returns "results": [{"title","url","content"}...]
    items = res.get("results", []) if isinstance(res, dict) else res  # lib versions differ slightly
    out = []
    for it in items[:max_results]:
        out.append({
            "title": it.get("title", ""),
            "url": it.get("url", ""),
            "content": it.get("content", "")
        })
    return out
