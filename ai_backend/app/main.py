from fastapi import FastAPI
from .routes import router
from .rag import RAGStore
from .agent import set_rag_store

app = FastAPI(title="Healthcare Chatbot Backend")

#rag is started only during startup so add files , dele the indexes and once again start rag to generate embeddings
_rag = RAGStore()
print(f"Initializing RAGStore...")
_rag.load_or_build()
print(f"RAGStore initialized.")
set_rag_store(_rag)
print(f"RAGStore set in agent.")
app.include_router(router)
print(
  f"Included router with {len(router.routes)} routes."
)