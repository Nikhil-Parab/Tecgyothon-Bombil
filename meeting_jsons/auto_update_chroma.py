import os
import json
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document

# --- Config ---
WATCH_DIR = "./meetingsjson"  # ✅ Fixed to match your folder name
PERSIST_DIR = "./meeting_memory_db"

os.makedirs(WATCH_DIR, exist_ok=True)
os.makedirs(PERSIST_DIR, exist_ok=True)

# --- Initialize embeddings & Chroma ---
embedding_function = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

vectorstore = Chroma(
    collection_name="meeting_notes",
    embedding_function=embedding_function,
    persist_directory=PERSIST_DIR
)

# --- Function to load JSON and add to Chroma ---
def load_and_add_json(file_path):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        docs = [
            Document(page_content=item["content"], metadata=item.get("metadata", {}))
            for item in data
        ]

        vectorstore.add_documents(docs)
        print(f"✅ Added {len(docs)} documents from {file_path}")
    except Exception as e:
        print(f"❌ Error processing {file_path}: {e}")

# --- Watchdog event handler ---
class MeetingJSONHandler(FileSystemEventHandler):
    def on_created(self, event):
        if event.src_path.endswith(".json"):
            print(f"\n📂 New JSON file detected: {event.src_path}")
            load_and_add_json(event.src_path)

    def on_modified(self, event):
        if event.src_path.endswith(".json"):
            print(f"\n✏️ JSON file modified: {event.src_path}")
            load_and_add_json(event.src_path)

# --- Main ---
if __name__ == "__main__":
    print("👀 Watching folder for new meeting JSON files:", WATCH_DIR)
    event_handler = MeetingJSONHandler()
    observer = Observer()
    observer.schedule(event_handler, WATCH_DIR, recursive=False)
    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        print("\n🛑 Stopped watching.")
    observer.join()