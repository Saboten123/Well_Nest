import os
import glob
import pickle
import faiss
import numpy as np
from typing import List, Dict, Tuple
from .config import DATA_DIR, VECTOR_DIR, FAISS_PATH, METADATA_PATH, CHUNK_SIZE, CHUNK_OVERLAP, TOP_K
from .tools.gemini_tool import embed_texts

def _read_txt_files() -> List[Tuple[str, str]]:
    files = glob.glob(os.path.join(DATA_DIR, "*.txt"))
    data = []
    for path in files:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            data.append((os.path.basename(path), f.read()))
    return data

def _chunk_text(text: str, size: int, overlap: int) -> List[str]:
    """
    Simple whitespace-based token approximation to keep implementation minimal.
    """
    tokens = text.split()
    chunks = []
    i = 0
    print(f"Chunking text into pieces of {size} with {overlap} overlap")
    while i < len(tokens):
        chunk = tokens[i:i+size]
        chunks.append(" ".join(chunk))
        i += (size - overlap) if (size - overlap) > 0 else size
    return chunks

class RAGStore:
    def __init__(self):
        os.makedirs(VECTOR_DIR, exist_ok=True)
        self.index = None  # faiss.IndexFlatL2
        self.metadata: List[Dict] = []

    def load_or_build(self):
        if os.path.exists(FAISS_PATH) and os.path.exists(METADATA_PATH):
            self._load()
            print(f"Loaded RAGStore from disk with {len(self.metadata)} chunks.")
        else:
            self._build()

    def _build(self):
        docs = _read_txt_files()
        texts, meta = [], []
        print(f"Read {len(docs)} documents from disk.")
        for filename, content in docs:
            chunks = _chunk_text(content, CHUNK_SIZE, CHUNK_OVERLAP)
            for ci, ch in enumerate(chunks):
                texts.append(ch)
                meta.append({"source": filename, "chunk_id": ci, "text": ch})

        if not texts:
            # Empty index fallback
            dim = 768
            self.index = faiss.IndexFlatL2(dim)
            self.metadata = []
            self._save()
            return

        vectors = embed_texts(texts)
        arr = np.array(vectors, dtype="float32")
        dim = arr.shape[1]
        self.index = faiss.IndexFlatL2(dim)
        self.index.add(arr)

        self.metadata = meta
        self._save()

    def _save(self):
        faiss.write_index(self.index, FAISS_PATH)
        with open(METADATA_PATH, "wb") as f:
            pickle.dump(self.metadata, f)
            print(f"Saved metadata for {len(self.metadata)} chunks.")

    def _load(self):
        self.index = faiss.read_index(FAISS_PATH)
        with open(METADATA_PATH, "rb") as f:
            self.metadata = pickle.load(f)
            print(f"Loaded metadata for {len(self.metadata)} chunks.")

    def retrieve(self, query: str, top_k: int = TOP_K) -> List[Dict]:
        """
        Return top-k results with their text + source for citation.
        """
        if self.index is None or self.index.ntotal == 0:
            return []
        qvec = np.array(embed_texts([query])[0], dtype="float32").reshape(1, -1)
        D, I = self.index.search(qvec, min(top_k, self.index.ntotal))
        results = []
        for idx, dist in zip(I[0], D[0]):
            if idx == -1:
                continue
            md = self.metadata[idx]
            results.append({
                "source": md.get("source", "unknown"),
                "chunk_id": md.get("chunk_id", -1),
                "text": md.get("text", ""),
                "score": float(dist)
            })
        print(f"RAG retrieved {len(results)} results for query: {query}")
        return results
