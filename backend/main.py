import os
from dotenv import load_dotenv
import chromadb
from sentence_transformers import SentenceTransformer
import numpy as np
from transformers import pipeline
import torch
import warnings
from typing import Dict, List, Tuple
warnings.filterwarnings('ignore')

# -----------------------
# CONFIGURATION
# -----------------------
PERSIST_DIR = "./chroma_store"
COLLECTION_NAME = "team_context"
EMBED_MODEL = "all-MiniLM-L6-v2"
TOP_K = 10
MIN_SIMILARITY = 0.2
INTENT_THRESHOLD = 0.4

# Intent categories
INTENTS = {
    "task_management": ["list_tasks", "set_priority", "track_progress"],
    "calendar": ["add_event", "update_event", "track_deadline", "schedule_meeting"],
    "tools": ["github_action", "gmail_action", "notion_action", "calendar_sync", "file_manage"],
    "reminders": ["create_reminder", "set_alert"],
    "knowledge": ["web_search", "file_lookup"],
    "communication": ["draft_email", "write_note"],
    "coding": ["generate_code", "explain_code", "debug_code"],
    "sentiment": ["analyze_sentiment", "reflect_emotion"]
}

# -----------------------
# SETUP CHROMA & MODELS
# -----------------------
print("🔧 Initializing models...")

# ChromaDB setup
client = chromadb.PersistentClient(path=PERSIST_DIR)
try:
    collection = client.get_collection(COLLECTION_NAME)
    print(f"✓ Connected to collection '{COLLECTION_NAME}' with {collection.count()} documents")
except:
    collection = client.create_collection(COLLECTION_NAME)
    print(f"✓ Created new collection '{COLLECTION_NAME}'")

# Sentence transformer for embeddings
model = SentenceTransformer(EMBED_MODEL)
print(f"✓ Loaded embedding model: {EMBED_MODEL}")

# Device selection
device = 0 if torch.cuda.is_available() else -1
print(f"✓ Using device: {'GPU' if device == 0 else 'CPU'}")

# BART model for text generation
try:
    bart_generator = pipeline(
        "text2text-generation",
        model="facebook/bart-large-cnn",
        device=device,
        max_length=512,
        truncation=True
    )
    print("✓ Loaded BART-large-CNN (text generation)")
except Exception as e:
    print(f"⚠️ Error loading BART generator: {e}")
    bart_generator = None

# BART model for intent classification
try:
    intent_classifier = pipeline(
        "zero-shot-classification",
        model="facebook/bart-large-mnli",
        device=device
    )
    print("✓ Loaded BART-large-MNLI (intent classification)")
except Exception as e:
    print(f"⚠️ Error loading intent classifier: {e}")
    intent_classifier = None

# -----------------------
# HELPER FUNCTIONS
# -----------------------
def detect_intents(query: str) -> Tuple[Dict[str, List[str]], List[str], Dict[str, float]]:
    """
    Detect user intents from query using zero-shot classification
    Returns: (structured_intents, all_intents_list, intent_scores)
    """
    if not intent_classifier:
        return {}, [], {}
    
    try:
        # Flatten all intents for classification
        candidate_labels = [intent for sublist in INTENTS.values() for intent in sublist]
        
        # Classify with multi-label support
        result = intent_classifier(query, candidate_labels, multi_label=True)
        
        # Filter by threshold
        predicted = [
            label for label, score in zip(result["labels"], result["scores"])
            if score > INTENT_THRESHOLD
        ]
        
        # Create score dictionary
        intent_scores = {
            label: score for label, score in zip(result["labels"], result["scores"])
            if score > INTENT_THRESHOLD
        }
        
        # Structure by domain
        structured_output = {}
        for domain, intents in INTENTS.items():
            matched = [p for p in predicted if p in intents]
            if matched:
                structured_output[domain] = matched
        
        # Flatten all detected intents
        all_detected_intents = [
            intent for sublist in structured_output.values()
            for intent in sublist
        ]
        
        return structured_output, all_detected_intents, intent_scores
    
    except Exception as e:
        print(f"⚠️ Intent detection error: {e}")
        return {}, [], {}


def semantic_search(query: str, user_filter=None, top_k=TOP_K):
    """Search ChromaDB for relevant documents using semantic similarity"""
    all_docs = collection.get()
    
    if not all_docs or not all_docs.get("documents"):
        return []
    
    docs = all_docs["documents"]
    metas = all_docs["metadatas"]

    # Filter by user if specified
    filtered_docs, filtered_metas = [], []
    for doc, meta in zip(docs, metas):
        if user_filter and meta.get("user", "").lower() != user_filter.lower():
            continue
        filtered_docs.append(doc)
        filtered_metas.append(meta)

    if not filtered_docs:
        return []

    # Calculate semantic similarity
    query_emb = model.encode([query])[0]
    doc_embs = model.encode(filtered_docs)

    sims = [
        np.dot(query_emb, de) / (np.linalg.norm(query_emb) * np.linalg.norm(de))
        for de in doc_embs
    ]

    # Get top-k results above similarity threshold
    top_indices = np.argsort(sims)[::-1]
    results = []
    for idx in top_indices:
        if sims[idx] < MIN_SIMILARITY:
            continue
        results.append({
            "text": filtered_docs[idx],
            "metadata": filtered_metas[idx],
            "score": float(sims[idx])
        })
        if len(results) >= top_k:
            break
    
    return results


def generate_answer_with_bart(query: str, retrieved_docs):
    """Generate answer using BART model based on retrieved context"""
    if not retrieved_docs:
        return "❌ I could not find any relevant information to answer your query."

    if not bart_generator:
        # Fallback to simple context display
        response = "📚 Based on the available information:\n\n"
        for i, doc in enumerate(retrieved_docs[:3], 1):
            response += f"{i}. {doc['text']}\n"
            response += f"   (by {doc['metadata'].get('user', 'unknown')} at {doc['metadata'].get('timestamp', 'unknown')})\n\n"
        return response

    # Prepare context from retrieved documents
    context = "\n".join([
        f"- {d['text']} (by {d['metadata'].get('user', 'unknown')})"
        for d in retrieved_docs[:5]
    ])

    # Create prompt for BART
    prompt = f"""Based on the following information, answer the question.

Information:
{context}

Question: {query}

Answer:"""

    try:
        # Generate response using BART
        response = bart_generator(
            prompt,
            max_length=300,
            min_length=50,
            do_sample=True,
            temperature=0.7,
            top_p=0.9,
            num_return_sequences=1
        )[0]['generated_text']
        
        # Extract only the answer part
        if "Answer:" in response:
            answer = response.split("Answer:")[-1].strip()
        else:
            answer = response.strip()
        
        return answer
    
    except Exception as e:
        print(f"⚠️ Error generating with BART: {e}")
        response = "📚 Based on the retrieved information:\n\n"
        for i, doc in enumerate(retrieved_docs[:3], 1):
            response += f"{i}. {doc['text']}\n"
        return response


def format_intent_actions(structured_intents: Dict[str, List[str]], intent_scores: Dict[str, float]) -> str:
    """Format detected intents as actionable items"""
    if not structured_intents:
        return ""
    
    output = "\n\n🎯 DETECTED ACTION INTENTS:\n" + "="*70 + "\n"
    
    intent_emojis = {
        "task_management": "📋",
        "calendar": "📅",
        "tools": "🔧",
        "reminders": "⏰",
        "knowledge": "🔍",
        "communication": "✉️",
        "coding": "💻",
        "sentiment": "😊"
    }
    
    for domain, intents in structured_intents.items():
        emoji = intent_emojis.get(domain, "•")
        output += f"\n{emoji} {domain.upper().replace('_', ' ')}:\n"
        for intent in intents:
            score = intent_scores.get(intent, 0)
            output += f"   ✓ {intent.replace('_', ' ').title()} (confidence: {score:.2%})\n"
    
    output += "\n" + "="*70
    return output


def add_sample_data():
    """Add sample data to ChromaDB for testing"""
    sample_docs = [
        {
            "text": "The project deadline is October 30th, 2025. All deliverables must be submitted by then.",
            "metadata": {"user": "Alice", "timestamp": "2025-10-15 10:00:00", "type": "deadline"}
        },
        {
            "text": "Team meeting scheduled for Monday at 2 PM to discuss project progress.",
            "metadata": {"user": "Bob", "timestamp": "2025-10-16 14:30:00", "type": "meeting"}
        },
        {
            "text": "Assignment on machine learning is due next Friday. Remember to submit the Jupyter notebook.",
            "metadata": {"user": "Charlie", "timestamp": "2025-10-17 09:15:00", "type": "assignment"}
        },
        {
            "text": "Client feedback: They want to see more data visualizations in the final presentation.",
            "metadata": {"user": "Alice", "timestamp": "2025-10-18 16:45:00", "type": "feedback"}
        },
        {
            "text": "Code review session planned for Thursday at 3 PM. Please have your PRs ready.",
            "metadata": {"user": "Bob", "timestamp": "2025-10-19 11:20:00", "type": "meeting"}
        },
        {
            "text": "The GitHub repository has 3 pending pull requests that need review before Friday.",
            "metadata": {"user": "Charlie", "timestamp": "2025-10-20 14:00:00", "type": "github"}
        },
        {
            "text": "Reminder: Update the Notion board with current sprint progress by end of day.",
            "metadata": {"user": "Alice", "timestamp": "2025-10-21 09:30:00", "type": "reminder"}
        },
        {
            "text": "Client wants a follow-up email with the demo recording and next steps.",
            "metadata": {"user": "Bob", "timestamp": "2025-10-22 11:15:00", "type": "email"}
        }
    ]
    
    for i, doc in enumerate(sample_docs):
        doc_id = f"sample_{i}_{doc['metadata']['user']}_{doc['metadata']['timestamp']}"
        try:
            collection.add(
                documents=[doc["text"]],
                metadatas=[doc["metadata"]],
                ids=[doc_id]
            )
        except:
            pass
    
    print(f"✓ Added {len(sample_docs)} sample documents")


# -----------------------
# INTERACTIVE AGENT
# -----------------------
if __name__ == "__main__":
    print("\n" + "="*70)
    print("🚀 Team AI Agent with Intent Detection & Context-Aware Responses")
    print("="*70)
    
    # Check if collection has data
    if collection.count() == 0:
        print("\n📝 Collection is empty. Adding sample data...")
        add_sample_data()
    
    print(f"\n📊 Database contains {collection.count()} documents")
    print("\n💡 Example queries:")
    print("  Query:  'When is the project deadline?'")
    print("  Action: 'Schedule a meeting for Monday at 2 PM'")
    print("  Mixed:  'Show me pending tasks and create a reminder for tomorrow'")
    print("  Complex: 'Summarize recent feedback, draft an email to client, and check GitHub PRs'")
    print("\nType 'exit' to quit\n")

    while True:
        try:
            query = input("\n💬 Enter your query: ").strip()
            
            if query.lower() == "exit":
                print("\n👋 Goodbye!")
                break
            
            if not query:
                print("⚠️ Please enter a valid query.")
                continue

            print("\n" + "="*70)
            print("⚙️  PROCESSING YOUR REQUEST...")
            print("="*70)
            
            # Step 1: Detect intents
            print("\n🔍 Analyzing intents...")
            structured_intents, all_intents, intent_scores = detect_intents(query)
            
            if all_intents:
                print(f"✓ Detected {len(all_intents)} intent(s): {', '.join(all_intents)}")
            else:
                print("✓ No specific action intents detected (query mode)")
            
            # Step 2: Search for relevant context
            print("\n🔎 Searching knowledge base...")
            user_filter = None  # Can be set via input if needed
            retrieved_docs = semantic_search(query, user_filter=user_filter, top_k=TOP_K)
            
            if retrieved_docs:
                print(f"✓ Found {len(retrieved_docs)} relevant documents")
            else:
                print("⚠️ No relevant documents found in knowledge base")
            
            # Step 3: Generate answer
            print("\n🤖 Generating response...\n")
            
            print("="*70)
            print("📝 RESPONSE:")
            print("="*70)
            
            answer = generate_answer_with_bart(query, retrieved_docs)
            print(f"\n{answer}\n")
            
            # Step 4: Display detected action intents
            if structured_intents:
                intent_summary = format_intent_actions(structured_intents, intent_scores)
                print(intent_summary)
                
                print("\n💡 These actions would be automatically executed in a full system:")
                for domain, intents in structured_intents.items():
                    for intent in intents:
                        if intent == "schedule_meeting":
                            print("   → Creating calendar event...")
                        elif intent == "draft_email":
                            print("   → Drafting email template...")
                        elif intent == "github_action":
                            print("   → Checking GitHub for updates...")
                        elif intent == "create_reminder":
                            print("   → Setting up reminder...")
                        elif intent == "list_tasks":
                            print("   → Fetching task list...")
                        elif intent == "notion_action":
                            print("   → Updating Notion board...")
                        elif intent == "set_priority":
                            print("   → Prioritizing tasks...")
                        else:
                            print(f"   → Executing {intent.replace('_', ' ')}...")
            
            # Show top matching documents if available
            if retrieved_docs:
                print("\n\n📄 TOP RELEVANT CONTEXT:")
                print("="*70)
                for i, doc in enumerate(retrieved_docs[:3], 1):
                    print(f"\n{i}. [{doc['metadata'].get('user', 'unknown')}] "
                          f"(Score: {doc['score']:.3f})")
                    print(f"   {doc['text']}")
                print("\n" + "="*70)
        
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()
            continue