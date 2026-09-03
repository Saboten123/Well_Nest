from fastapi import APIRouter, Request, Response, Header
from typing import Optional
from uuid import uuid4
from .schemas import ChatRequest, ChatResponse, Citation
from .memory import load_memory, build_context, update_on_interaction
from .agent import run_agent

router = APIRouter()

COOKIE_NAME = "guest_session_id"

@router.get("/")
def manashish():
    return {"message": "Hi i am manashish!"}

@router.get("/health")
def health():
    return {"status": "ok"}
from typing import Optional, Tuple
def _extract_identity(authorization: Optional[str]) -> Tuple[bool, str]:
    """
    Returns (signed_in, key). For simplicity:
    - If Authorization: Bearer <token> present -> signed_in=True, key=<token>
    - Else -> signed_in=False, key="" (guest id handled separately)
    """
    if authorization and authorization.lower().startswith("bearer "):
        return True, authorization.split(" ", 1)[1].strip()
    return False, ""

@router.post("/chat", response_model=ChatResponse)
async def chat(req: Request, res: Response, body: ChatRequest, authorization: Optional[str] = Header(None)):
    signed_in, key = _extract_identity(authorization)

    # guest session id
    if not signed_in:
        sid = req.cookies.get(COOKIE_NAME)
        if not sid:
            sid = str(uuid4())
            res.set_cookie(COOKIE_NAME, sid, httponly=True, samesite="Lax")
        user_key = sid
    else:
        user_key = key

    # load memory and build context
    doc = load_memory(user_key, signed_in)
    context_msgs = build_context(doc)

    # run agent
    result = run_agent(body.message, context_msgs)
    reply = result["reply"]
    citations_in = result.get("citations", []) or []
    citations = [Citation(source=c["source"], url=c.get("url")) for c in citations_in]

    # update memory (append user+assistant; summarize if needed)
    update_on_interaction(user_key, signed_in, body.message, reply)

    return ChatResponse(reply=reply, citations=citations)
