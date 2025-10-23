from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

# --- Config ---
PERSIST_DIR = "./meeting_memory_db"

print("🗄️ Meeting Memory Database Query Tool\n")

# --- Initialize embeddings & Chroma ---
embedding_function = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

vectorstore = Chroma(
    collection_name="meeting_notes",
    embedding_function=embedding_function,
    persist_directory=PERSIST_DIR
)

# --- Check database contents ---
print("📊 DATABASE STATUS")
print("=" * 80)

collection = vectorstore._collection
all_data = collection.get()

total = len(all_data['ids'])
print(f"✅ Total documents in database: {total}\n")

if total == 0:
    print("⚠️ Database is empty!")
    print("💡 Run 'python load_existing.py' to load your JSON files first.\n")
    exit()

# --- Show first 3 documents ---
print("📄 SAMPLE DOCUMENTS (First 3)")
print("=" * 80)

for i in range(min(3, total)):
    print(f"\n--- Document {i+1} ---")
    content = all_data['documents'][i]
    # Show first 300 characters
    print(f"Content: {content[:300]}{'...' if len(content) > 300 else ''}")
    print(f"Metadata: {all_data['metadatas'][i]}")

# --- Interactive search ---
print("\n" + "=" * 80)
print("🔍 INTERACTIVE SEARCH")
print("=" * 80)
print("Type your search query (or 'all' to see all docs, 'quit' to exit)\n")

while True:
    query = input("💬 Search: ").strip()
    
    if query.lower() == 'quit':
        print("\n👋 Goodbye!")
        break
    
    elif query.lower() == 'all':
        print(f"\n📚 Showing all {total} documents:\n")
        for i in range(total):
            print(f"--- Document {i+1} ---")
            print(f"Content: {all_data['documents'][i]}")
            print(f"Metadata: {all_data['metadatas'][i]}\n")
    
    elif query:
        print(f"\n🔍 Searching for: '{query}'")
        print("-" * 80)
        
        results = vectorstore.similarity_search_with_score(query, k=5)
        
        if results:
            for i, (doc, score) in enumerate(results, 1):
                print(f"\n📄 Result {i} (Relevance Score: {score:.4f})")
                print(f"Content: {doc.page_content}")
                print(f"Metadata: {doc.metadata}")
        else:
            print("No results found.")
        
        print()
    
    else:
        print("⚠️ Please enter a valid query\n")