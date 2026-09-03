import os
from dotenv import load_dotenv

load_dotenv()

# API Keys
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Database
DB_NAME = "healthcare_chatbot"
COLLECTION_NAME = "conversations"

# Memory settings
SUMMARY_INTERVAL = 12   # summarize every 12 user turns
KEEP_LAST_N = 4         # keep last 4 raw turns after summarization

# RAG settings
TOP_K = 5
CHUNK_SIZE = 800
CHUNK_OVERLAP = 120

# Models
GEMINI_MODEL = "gemini-3.6-flash"
EMBEDDING_MODEL = "models/embedding-001"

# Paths
DATA_DIR = os.getenv("DATA_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), "data"))
print(f"Data directory set to: {DATA_DIR}")
VECTOR_DIR = os.getenv("VECTOR_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), "vectorstore"))
FAISS_PATH = os.path.join(VECTOR_DIR, "faiss.index")
METADATA_PATH = os.path.join(VECTOR_DIR, "metadata.pkl")
