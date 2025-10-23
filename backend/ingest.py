import os
import json
import re
import time
import hashlib
from datetime import datetime
from email.utils import parsedate_to_datetime
import chromadb
from sentence_transformers import SentenceTransformer

# -----------------------
# CONFIGURATION
# -----------------------
DATA_FILES = [
    "data/slack_docs_data.json",
    "data/gmail_docs_data.json",
    "data/github_docs_data.json"
]
PERSIST_DIR = "./chroma_store"
COLLECTION_NAME = "team_context"
EMBED_MODEL = "all-MiniLM-L6-v2"
POLL_INTERVAL = 10  # seconds

# -----------------------
# INITIALIZE CHROMA & MODEL
# -----------------------
os.makedirs(PERSIST_DIR, exist_ok=True)
client = chromadb.PersistentClient(path=PERSIST_DIR)
collection = client.get_or_create_collection(name=COLLECTION_NAME)
model = SentenceTransformer(EMBED_MODEL)

# -----------------------
# HELPERS
# -----------------------
def clean_text(text: str):
    if not text:
        return None
    text = re.sub(r"<@[\w]+>", "", text).strip()
    if "has joined the channel" in text.lower():
        return None
    return text

def to_iso_timestamp(value):
    if not value:
        return datetime.utcnow().isoformat()
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).isoformat()
    except ValueError:
        try:
            return parsedate_to_datetime(str(value)).isoformat()
        except Exception:
            return datetime.utcnow().isoformat()

def generate_id(record: dict):
    text = record.get("text") or record.get("body") or record.get("title") or ""
    user = record.get("user") or record.get("from") or "unknown"
    ts = record.get("timestamp") or record.get("date") or str(time.time())
    raw = f"{record.get('source','unknown')}_{user}_{ts}_{text}"
    return hashlib.sha1(raw.encode()).hexdigest()

def preprocess_records(records: list):
    cleaned = []
    for r in records:
        text = r.get("text") or r.get("body") or r.get("title")
        text = clean_text(text)
        if not text:
            continue
        ts_value = r.get("timestamp") or r.get("date") or datetime.utcnow().isoformat()
        ts_iso = to_iso_timestamp(ts_value)
        user = r.get("user") or r.get("from") or "unknown"
        cleaned.append({
            "id": generate_id(r),
            "document": text,
            "metadata": {
                "source": r.get("source", "unknown"),
                "user": user,
                "timestamp": ts_iso
            }
        })
    return cleaned

def existing_ids():
    data = collection.get()
    if not data or not data.get("ids"):
        return set()
    return set(data["ids"])

def add_new_records(records: list):
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
# WATCH FILES & UPDATE
# -----------------------
def watch_and_update(interval=10):
    last_mtime = {f: 0 for f in DATA_FILES}
    while True:
        for file in DATA_FILES:
            if not os.path.exists(file):
                print(f"⚠️ Data file '{file}' not found.")
                continue
            try:
                mtime = os.path.getmtime(file)
                if mtime <= last_mtime[file]:
                    continue
                last_mtime[file] = mtime
                with open(file, "r", encoding="utf-8") as f:
                    records = json.load(f)
                processed = preprocess_records(records)
                add_new_records(processed)
            except json.JSONDecodeError:
                print(f"⚠️ File '{file}' not ready or partially written, skipping...")
            except Exception as e:
                print(f"❌ Error processing {file}: {e}")
        time.sleep(interval)

# -----------------------
# MAIN
# -----------------------
if __name__ == "__main__":
    print(f"🚀 Watching {DATA_FILES} for updates and inserting into Chroma...")
    watch_and_update(interval=POLL_INTERVAL)
