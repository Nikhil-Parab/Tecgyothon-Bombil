import os
from dotenv import load_dotenv
import chromadb
from sentence_transformers import SentenceTransformer
import numpy as np
from google import genai  # Gemini SDK

# -----------------------
# LOAD ENV VARIABLES
# -----------------------
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("⚠️ GEMINI_API_KEY not found in .env")

# -----------------------
# CONFIGURATION
# -----------------------
PERSIST_DIR = "./chroma_store"
COLLECTION_NAME = "team_context"
EMBED_MODEL = "all-MiniLM-L6-v2"
TOP_K = 10
MIN_SIMILARITY = 0.2

# -----------------------
# SETUP CHROMA & GEMINI
# -----------------------
client = chromadb.PersistentClient(path=PERSIST_DIR)
collection = client.get_collection(COLLECTION_NAME)
model = SentenceTransformer(EMBED_MODEL)

gemini_client = genai.Client(api_key=GEMINI_API_KEY)

# -----------------------
# HELPER FUNCTIONS
# -----------------------
def semantic_search(query: str, user_filter=None, top_k=TOP_K):
    all_docs = collection.get()
    docs = all_docs["documents"]
    metas = all_docs["metadatas"]

    filtered_docs, filtered_metas = [], []
    for doc, meta in zip(docs, metas):
        if user_filter and meta["user"].lower() != user_filter.lower():
            continue
        filtered_docs.append(doc)
        filtered_metas.append(meta)

    if not filtered_docs:
        return []

    query_emb = model.encode([query])[0]
    doc_embs = model.encode(filtered_docs)

    sims = [np.dot(query_emb, de)/(np.linalg.norm(query_emb)*np.linalg.norm(de)) for de in doc_embs]

    top_indices = np.argsort(sims)[::-1]
    results = []
    for idx in top_indices:
        if sims[idx] < MIN_SIMILARITY:
            continue
        results.append({
            "text": filtered_docs[idx],
            "metadata": filtered_metas[idx],
            "score": sims[idx]
        })
        if len(results) >= top_k:
            break
    return results

def generate_answer(query: str, retrieved_docs):
    if not retrieved_docs:
        return "I could not find any relevant information to answer your query."

    context = "\n".join([f"[{d['metadata']['user']} @ {d['metadata']['timestamp']}] {d['text']}"
                         for d in retrieved_docs])

    prompt = f"""
You are a helpful AI assistant. Based on the following messages and notes from a team:

{context}

Answer the following user query accurately and concisely:

Query: {query}
Answer:
"""

    response = gemini_client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    return response.text.strip()

# -----------------------
# INTERACTIVE AGENT
# -----------------------
if __name__ == "__main__":
    print("🚀 Team AI Agent using Gemini (type 'exit' to quit)")

    while True:
        query = input("\nEnter your query: ").strip()
        if query.lower() == "exit":
            print("👋 Goodbye!")
            break

        user_filter = input("Filter by user (leave empty for all): ").strip() or None
        retrieved_docs = semantic_search(query, user_filter=user_filter, top_k=TOP_K)
        answer = generate_answer(query, retrieved_docs)

        print(f"\n🤖 Answer:\n{answer}")
