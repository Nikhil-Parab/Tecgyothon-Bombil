import os
import json
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document

# --- Config ---
WATCH_DIR = "./meetingsjson"  # ✅ Matches your folder
PERSIST_DIR = "./meeting_memory_db"

print("🔄 Loading existing JSON files into Chroma DB...")
print(f"📁 Scanning folder: {WATCH_DIR}\n")

# --- Initialize embeddings & Chroma ---
embedding_function = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

vectorstore = Chroma(
    collection_name="meeting_notes",
    embedding_function=embedding_function,
    persist_directory=PERSIST_DIR
)

# --- Load all existing JSON files ---
total_docs = 0
files_processed = 0

for filename in os.listdir(WATCH_DIR):
    if filename.endswith(".json"):
        filepath = os.path.join(WATCH_DIR, filename)
        print(f"📄 Processing: {filename}")
        
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            # Handle both list and single object formats
            if not isinstance(data, list):
                data = [data]
            
            docs = [
                Document(
                    page_content=item["content"], 
                    metadata=item.get("metadata", {})
                )
                for item in data
            ]
            
            vectorstore.add_documents(docs)
            total_docs += len(docs)
            files_processed += 1
            print(f"   ✅ Added {len(docs)} documents\n")
            
        except Exception as e:
            print(f"   ❌ Error: {e}\n")

print("=" * 60)
print(f"✅ Finished!")
print(f"📊 Files processed: {files_processed}")
print(f"📊 Total documents added: {total_docs}")
print("\n💡 Now run 'python query.py' to search your data!")