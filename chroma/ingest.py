import os
import json
import re
import time
import hashlib
from datetime import datetime
import chromadb
from sentence_transformers import SentenceTransformer


# -----------------------
# CONFIGURATION
# -----------------------
DATA_FILE = "data/slack_docs_data.json"
PERSIST_DIR = "./chroma_store"
COLLECTION_NAME = "team_context"
EMBED_MODEL = "all-MiniLM-L6-v2"

# ✅ Initialize Chroma persistent client and collection
os.makedirs(PERSIST_DIR, exist_ok=True)
client = chromadb.PersistentClient(path=PERSIST_DIR)
collection = client.get_or_create_collection(name=COLLECTION_NAME)

# ✅ Initialize embedding model
model = SentenceTransformer(EMBED_MODEL)


# -----------------------
# HELPERS
# -----------------------
def clean_text(text: str):
    """Remove mentions and system messages."""
    text = re.sub(r"<@[\w]+>", "", text).strip()
    if "has joined the channel" in text.lower():
        return None
    return text


def generate_id(record: dict):
    """Generate deterministic hash ID for deduplication."""
    raw = f"{record['source']}_{record['user']}_{record['timestamp']}_{record['text']}"
    return hashlib.sha1(raw.encode()).hexdigest()


def preprocess_records(records: list):
    """Clean and prepare JSON data for Chroma insertion."""
    cleaned = []
    for r in records:
        text = clean_text(r["text"])
        if not text:
            continue
        cleaned.append({
            "id": generate_id(r),
            "document": text,
            "metadata": {
                "source": r["source"],
                "user": r["user"],
                "timestamp": datetime.fromisoformat(
                    r["timestamp"].replace("Z", "+00:00")
                ).isoformat()
            }
        })
    return cleaned


def existing_ids():
    """Fetch all stored IDs from Chroma."""
    data = collection.get()
    if not data or not data.get("ids"):
        return set()
    return set(data["ids"])


def add_new_records(records: list):
    """Insert new records (skip duplicates)."""
    current_ids = existing_ids()
    new_records = [r for r in records if r["id"] not in current_ids]

    if not new_records:
        print("✅ No new data to add.")
        return

    print(f"🧩 Adding {len(new_records)} new records...")

    docs = [r["document"] for r in new_records]
    metas = [r["metadata"] for r in new_records]
    ids = [r["id"] for r in new_records]
    embeddings = model.encode(docs)

    collection.add(ids=ids, documents=docs, metadatas=metas, embeddings=embeddings)
    print(f"✅ Successfully added {len(new_records)} new records.")


# -----------------------
# MAIN LOOP
# -----------------------
def watch_and_update(interval=10):
    """Continuously watch the JSON file for updates."""
    last_hash = None
    while True:
        if not os.path.exists(DATA_FILE):
            print("⚠️ Data file not found.")
            time.sleep(interval)
            continue

        with open(DATA_FILE, "r", encoding="utf-8") as f:
            raw_data = f.read()

        new_hash = hashlib.md5(raw_data.encode()).hexdigest()

        if new_hash != last_hash:
            try:
                records = json.loads(raw_data)
                processed = preprocess_records(records)
                add_new_records(processed)
                last_hash = new_hash
            except Exception as e:
                print(f"❌ Error processing data: {e}")
        else:
            print("⏳ No changes detected...")

        time.sleep(interval)


if __name__ == "__main__":
    print(f"🚀 Watching '{DATA_FILE}' for updates...")
    watch_and_update(interval=15)
