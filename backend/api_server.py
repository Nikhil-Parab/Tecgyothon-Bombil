from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List, Any
import chromadb
from sentence_transformers import SentenceTransformer
import numpy as np
from transformers import pipeline
import torch
import warnings
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timedelta
import re
import os

warnings.filterwarnings('ignore')

# -----------------------
# CONFIGURATION
# -----------------------
PERSIST_DIR = "./chroma_store"
COLLECTION_NAME = "team_context"
EMBED_MODEL = "all-MiniLM-L6-v2"
TOP_K = 5
MIN_SIMILARITY = 0.2
INTENT_THRESHOLD = 0.70

# Intent categories
ACTIONABLE_INTENTS = {
    "create_task", "list_tasks", "set_priority", "track_deadline",
    "add_event", "update_event", "schedule_meeting",
    "create_reminder", "set_alert"
}

NO_SEARCH_INTENTS = {
    "create_task", "add_event", "schedule_meeting", "create_reminder", 
    "set_alert", "update_event", "set_priority"
}

INFORMATIONAL_INTENTS = {
    "track_deadline", "track_progress", "list_tasks"
}

INTENTS = {
    "task_management": ["create_task", "list_tasks", "set_priority", "track_progress"],
    "calendar": ["add_event", "update_event", "track_deadline", "schedule_meeting"],
    "tools": ["github_action", "gmail_action"],
    "reminders": ["create_reminder", "set_alert"], 
    "communication": ["draft_email", "write_note"],
    "coding": ["generate_code", "explain_code", "debug_code"]
}

# -----------------------
# FASTAPI APP
# -----------------------
app = FastAPI(title="Bombil AI Backend", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------
# REQUEST/RESPONSE MODELS
# -----------------------
class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = "dPYFilBStodR8Q8IwBXv8CyWHLB2"
    conversation_id: Optional[str] = None

class IntentInfo(BaseModel):
    intent: str
    confidence: float

class IntentExecution(BaseModel):
    intent: str
    status: str
    details: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    response: str
    intents_detected: List[IntentInfo]
    intents_executed: List[IntentExecution]
    related_content: Optional[List[Dict]] = None

# -----------------------
# GLOBAL VARIABLES
# -----------------------
client = None
collection = None
model = None
intent_classifier = None
db = None

# -----------------------
# INITIALIZATION
# -----------------------
def init_firebase():
    """Initialize Firebase Admin SDK"""
    global db
    try:
        if not firebase_admin._apps:
            # Try to load Firebase credentials
            if os.path.exists("remo-6afe2-firebase-adminsdk-fbsvc-0e331a5e1e.json"):
                cred = credentials.Certificate("remo-6afe2-firebase-adminsdk-fbsvc-0e331a5e1e.json")
                firebase_admin.initialize_app(cred)
                db = firestore.client()
                print("✓ Firebase initialized successfully")
            else:
                print("⚠ Firebase credentials file not found")
                db = None
        else:
            db = firestore.client()
        return db
    except Exception as e:
        print(f"⚠ Firebase initialization error: {e}")
        db = None
        return None

def init_models():
    """Initialize all models"""
    global client, collection, model, intent_classifier, db
    
    print("🔧 Initializing models...")
    
    # ChromaDB
    try:
        client = chromadb.PersistentClient(path=PERSIST_DIR)
        try:
            collection = client.get_collection(COLLECTION_NAME)
            print(f"✓ Connected to collection '{COLLECTION_NAME}' ({collection.count()} docs)")
        except:
            collection = client.create_collection(COLLECTION_NAME)
            print(f"✓ Created collection '{COLLECTION_NAME}'")
    except Exception as e:
        print(f"⚠ ChromaDB error: {e}")
        collection = None
    
    # Embedding model
    try:
        model = SentenceTransformer(EMBED_MODEL)
        print(f"✓ Loaded embedding model: {EMBED_MODEL}")
    except Exception as e:
        print(f"⚠ Embedding model error: {e}")
        model = None
    
    # Device
    device = 0 if torch.cuda.is_available() else -1
    print(f"✓ Device: {'GPU' if device == 0 else 'CPU'}")
    
    # Intent classifier
    try:
        intent_classifier = pipeline(
            "zero-shot-classification",
            model="facebook/bart-large-mnli",
            device=device
        )
        print("✓ Loaded BART-large-MNLI")
    except Exception as e:
        print(f"⚠ Intent classifier error: {e}")
        intent_classifier = None
    
    # Firebase
    init_firebase()

# -----------------------
# HELPER FUNCTIONS
# -----------------------
def parse_datetime(query: str) -> Optional[datetime]:
    """Parse date and time from natural language"""
    query_lower = query.lower()
    now = datetime.now()
    
    # Time patterns
    time_pattern = r'(\d{1,2})\s*(?::(\d{2}))?\s*(am|pm)?'
    time_match = re.search(time_pattern, query_lower)
    
    hour, minute = 9, 0  # Default time
    if time_match:
        hour = int(time_match.group(1))
        minute = int(time_match.group(2)) if time_match.group(2) else 0
        if time_match.group(3) == 'pm' and hour < 12:
            hour += 12
        elif time_match.group(3) == 'am' and hour == 12:
            hour = 0
    
    # Date patterns
    target_date = None
    
    # Specific date: "26th october", "october 26"
    date_patterns = [
        r'(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(\w+)',
        r'(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?'
    ]
    
    for pattern in date_patterns:
        match = re.search(pattern, query_lower)
        if match:
            try:
                day = int(match.group(1)) if match.group(1).isdigit() else int(match.group(2))
                month_str = match.group(2) if match.group(1).isdigit() else match.group(1)
                
                # Parse month
                months = {
                    'jan': 1, 'january': 1, 'feb': 2, 'february': 2,
                    'mar': 3, 'march': 3, 'apr': 4, 'april': 4,
                    'may': 5, 'jun': 6, 'june': 6, 'jul': 7, 'july': 7,
                    'aug': 8, 'august': 8, 'sep': 9, 'september': 9,
                    'oct': 10, 'october': 10, 'nov': 11, 'november': 11,
                    'dec': 12, 'december': 12
                }
                
                month = months.get(month_str[:3], now.month)
                year = now.year if month >= now.month else now.year + 1
                
                target_date = datetime(year, month, day, hour, minute)
                break
            except:
                pass
    
    # Relative dates
    if not target_date:
        if 'tomorrow' in query_lower:
            target_date = now + timedelta(days=1)
            target_date = target_date.replace(hour=hour, minute=minute)
        elif 'today' in query_lower:
            target_date = now.replace(hour=hour, minute=minute)
        elif 'next week' in query_lower:
            target_date = now + timedelta(days=7)
            target_date = target_date.replace(hour=hour, minute=minute)
        elif 'monday' in query_lower:
            days_ahead = (0 - now.weekday()) % 7
            if days_ahead == 0:
                days_ahead = 7
            target_date = now + timedelta(days=days_ahead)
            target_date = target_date.replace(hour=hour, minute=minute)
        elif 'tuesday' in query_lower:
            days_ahead = (1 - now.weekday()) % 7
            if days_ahead == 0:
                days_ahead = 7
            target_date = now + timedelta(days=days_ahead)
            target_date = target_date.replace(hour=hour, minute=minute)
    
    return target_date

def extract_task_details(query: str) -> Dict:
    """Extract task title, priority, and deadline from query"""
    deadline = None
    deadline_patterns = [
        r'by\s+(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)',
        r'due\s+(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)',
        r'deadline\s+(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)',
    ]
    
    for pattern in deadline_patterns:
        match = re.search(pattern, query, re.IGNORECASE)
        if match:
            deadline = parse_datetime(query)
            break
    
    if not deadline:
        deadline = datetime.now() + timedelta(days=7)
    
    # Extract title
    title = query
    for pattern in deadline_patterns:
        title = re.sub(pattern, '', title, flags=re.IGNORECASE)
    title = re.sub(r'\s+', ' ', title).strip()
    title = title.replace('create a task to ', '').replace('create task to ', '').strip()
    title = title[:100] if title else query[:100]
    
    # Determine priority
    priority_keywords = {
        "high": ["urgent", "asap", "critical", "important", "priority", "immediately"],
        "low": ["whenever", "someday", "maybe", "optional", "low priority"]
    }
    
    query_lower = query.lower()
    priority = "medium"
    
    for level, keywords in priority_keywords.items():
        if any(kw in query_lower for kw in keywords):
            priority = level
            break
    
    return {
        "title": title,
        "priority": priority,
        "description": query,
        "deadline": deadline
    }

def extract_meeting_details(query: str) -> Dict:
    """Extract meeting details from query"""
    query_lower = query.lower()
    
    # Extract attendees
    attendees = []
    attendee_pattern = r'with\s+([\w\s,]+?)(?:\s+at|\s+on|\s+in|$)'
    match = re.search(attendee_pattern, query_lower)
    if match:
        attendee_str = match.group(1)
        attendees = [name.strip() for name in re.split(r',|\sand\s', attendee_str)]
    
    # Extract location
    location = "Not specified"
    location_pattern = r'(?:at|in)\s+([\w\s]+?)(?:\s+on|\s+at\s+\d|$)'
    match = re.search(location_pattern, query)
    if match:
        location = match.group(1).strip()
    
    # Extract title
    title = query
    title = re.sub(r'(?:on|at)\s+\d{1,2}(?:st|nd|rd|th)?\s+\w+', '', title, flags=re.IGNORECASE)
    title = re.sub(r'with\s+[\w\s,]+', '', title, flags=re.IGNORECASE)
    title = re.sub(r'at\s+[\w\s]+', '', title, flags=re.IGNORECASE)
    title = re.sub(r'schedule\s+(?:a\s+)?meeting', 'Meeting', title, flags=re.IGNORECASE)
    title = re.sub(r'\s+', ' ', title).strip()
    
    if not title or title.lower() in ['meeting', 'a meeting']:
        title = "Team Meeting"
    
    # Parse datetime
    event_time = parse_datetime(query)
    if not event_time:
        event_time = datetime.now() + timedelta(days=1)
    
    return {
        "title": title,
        "attendees": attendees,
        "location": location,
        "datetime": event_time,
        "description": query
    }

def extract_reminder_details(query: str) -> Dict:
    """Extract reminder details from query"""
    reminder_time = parse_datetime(query)
    
    if not reminder_time:
        query_lower = query.lower()
        if 'in' in query_lower:
            time_match = re.search(r'in\s+(\d+)\s+(hour|minute|day|week)', query_lower)
            if time_match:
                amount = int(time_match.group(1))
                unit = time_match.group(2)
                
                if 'hour' in unit:
                    reminder_time = datetime.now() + timedelta(hours=amount)
                elif 'minute' in unit:
                    reminder_time = datetime.now() + timedelta(minutes=amount)
                elif 'day' in unit:
                    reminder_time = datetime.now() + timedelta(days=amount)
                elif 'week' in unit:
                    reminder_time = datetime.now() + timedelta(weeks=amount)
    
    if not reminder_time:
        reminder_time = datetime.now() + timedelta(days=1)
    
    # Extract reminder message
    message = query
    message = re.sub(r'(?:set\s+)?(?:a\s+)?reminder\s+(?:to\s+)?', '', message, flags=re.IGNORECASE)
    message = re.sub(r'(?:for|on|at)\s+(?:tomorrow|today|\d+)', '', message, flags=re.IGNORECASE)
    message = re.sub(r'\s+', ' ', message).strip()
    
    if not message:
        message = "Reminder"
    
    return {
        "message": message,
        "datetime": reminder_time,
        "description": query
    }

# -----------------------
# FIREBASE OPERATIONS
# -----------------------
def create_firebase_task(query: str, user_id: str):
    """Create task in Firebase"""
    if not db:
        return {"status": "failed", "error": "Firebase not initialized"}
    
    try:
        task_details = extract_task_details(query)
        task_id = f"task_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        current_time = datetime.now()
        
        task_data = {
            "assignedTo": [],
            "chatMessages": [{
                "id": f"msg_{int(current_time.timestamp() * 1000)}_init",
                "isUser": True,
                "metadata": {},
                "text": query,
                "timestamp": current_time
            }],
            "createdAt": current_time,
            "deadline": task_details["deadline"],
            "description": task_details["description"],
            "priority": task_details["priority"],
            "roadmaps": [],
            "summaries": [],
            "status": "pending",
            "tags": ["ai-generated", "task"],
            "title": task_details["title"],
            "updatedAt": current_time
        }
        
        doc_ref = db.collection('users').document(user_id).collection('tasks').document(task_id)
        doc_ref.set(task_data)
        
        return {
            "status": "success",
            "task_id": task_id,
            "title": task_details["title"],
            "priority": task_details["priority"],
            "deadline": task_details["deadline"].strftime("%B %d, %Y at %I:%M %p")
        }
    except Exception as e:
        return {"status": "failed", "error": str(e)}

def create_firebase_event(query: str, user_id: str):
    """Create calendar event in Firebase"""
    if not db:
        return {"status": "failed", "error": "Firebase not initialized"}
    
    try:
        event_details = extract_meeting_details(query)
        event_id = f"event_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        current_time = datetime.now()
        
        event_data = {
            "title": event_details["title"],
            "description": event_details["description"],
            "attendees": event_details["attendees"],
            "location": event_details["location"],
            "startTime": event_details["datetime"],
            "endTime": event_details["datetime"] + timedelta(hours=1),
            "createdAt": current_time,
            "updatedAt": current_time,
            "status": "scheduled",
            "type": "meeting",
            "tags": ["ai-generated"]
        }
        
        doc_ref = db.collection('users').document(user_id).collection('events').document(event_id)
        doc_ref.set(event_data)
        
        return {
            "status": "success",
            "event_id": event_id,
            "title": event_details["title"],
            "attendees": event_details["attendees"],
            "location": event_details["location"],
            "datetime": event_details["datetime"].strftime("%B %d, %Y at %I:%M %p")
        }
    except Exception as e:
        return {"status": "failed", "error": str(e)}

def create_firebase_reminder(query: str, user_id: str):
    """Create reminder in Firebase"""
    if not db:
        return {"status": "failed", "error": "Firebase not initialized"}
    
    try:
        reminder_details = extract_reminder_details(query)
        reminder_id = f"reminder_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        current_time = datetime.now()
        
        reminder_data = {
            "message": reminder_details["message"],
            "description": reminder_details["description"],
            "reminderTime": reminder_details["datetime"],
            "createdAt": current_time,
            "updatedAt": current_time,
            "status": "active",
            "type": "reminder",
            "tags": ["ai-generated"]
        }
        
        doc_ref = db.collection('users').document(user_id).collection('reminders').document(reminder_id)
        doc_ref.set(reminder_data)
        
        return {
            "status": "success",
            "reminder_id": reminder_id,
            "message": reminder_details["message"],
            "datetime": reminder_details["datetime"].strftime("%B %d, %Y at %I:%M %p")
        }
    except Exception as e:
        return {"status": "failed", "error": str(e)}

# -----------------------
# CORE FUNCTIONS
# -----------------------
def detect_intents(query: str) -> tuple:
    """Detect user intents above threshold"""
    if not intent_classifier:
        return {}, {}
    
    try:
        candidate_labels = [intent for sublist in INTENTS.values() for intent in sublist]
        result = intent_classifier(query, candidate_labels, multi_label=True)
        
        intent_scores = {
            label: score for label, score in zip(result["labels"], result["scores"])
            if score > INTENT_THRESHOLD
        }
        
        if not intent_scores:
            return {}, {}
        
        structured = {}
        for domain, intents in INTENTS.items():
            matched = [intent for intent in intents if intent in intent_scores]
            if matched:
                structured[domain] = matched
        
        return structured, intent_scores
    except Exception as e:
        print(f"⚠ Intent detection error: {e}")
        return {}, {}

def semantic_search(query: str, top_k=TOP_K):
    """Search ChromaDB for relevant documents"""
    if not collection or not model:
        return []
    
    try:
        all_docs = collection.get()
        
        if not all_docs or not all_docs.get("documents"):
            return []
        
        docs = all_docs["documents"]
        metas = all_docs["metadatas"]
        
        query_emb = model.encode([query])[0]
        doc_embs = model.encode(docs)
        
        sims = [
            np.dot(query_emb, de) / (np.linalg.norm(query_emb) * np.linalg.norm(de))
            for de in doc_embs
        ]
        
        top_indices = np.argsort(sims)[::-1]
        results = []
        for idx in top_indices:
            if sims[idx] < MIN_SIMILARITY:
                continue
            results.append({
                "text": docs[idx],
                "metadata": metas[idx],
                "score": float(sims[idx])
            })
            if len(results) >= top_k:
                break
        
        return results
    except Exception as e:
        print(f"⚠ Semantic search error: {e}")
        return []

def should_skip_search(structured_intents: Dict) -> bool:
    """Determine if we should skip knowledge base search"""
    for intents in structured_intents.values():
        if any(intent in NO_SEARCH_INTENTS for intent in intents):
            return True
    return False

def is_informational_query(structured_intents: Dict, query: str) -> bool:
    """Check if this is an informational query"""
    query_lower = query.lower()
    
    question_words = ["when", "what", "where", "how", "who", "which", "why"]
    if any(query_lower.startswith(word) for word in question_words):
        return True
    
    for intents in structured_intents.values():
        if any(intent in INFORMATIONAL_INTENTS for intent in intents):
            return True
    
    return False

def generate_knowledge_response(query: str, retrieved_docs: List[Dict]) -> str:
    """Generate a natural response based on knowledge base content"""
    if not retrieved_docs:
        return "I couldn't find specific information about that in my knowledge base."
    
    query_lower = query.lower()
    
    # Extract key information
    key_facts = []
    dates_found = []
    deadlines_info = []
    
    for doc in retrieved_docs[:3]:
        text = doc['text']
        
        # Look for date patterns
        date_patterns = [
            r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?\b',
            r'\b\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December)\b',
            r'\b(?:tomorrow|today|next week|this week|next month)\b',
        ]
        
        for pattern in date_patterns:
            dates = re.findall(pattern, text, re.IGNORECASE)
            dates_found.extend(dates)
        
        if any(word in text.lower() for word in ['deadline', 'due', 'submission', 'submit']):
            deadlines_info.append(text)
        else:
            key_facts.append(text)
    
    dates_found = list(dict.fromkeys(dates_found))
    deadlines_info = list(dict.fromkeys(deadlines_info))
    key_facts = list(dict.fromkeys(key_facts))
    
    # Generate response based on query type
    if "when" in query_lower and any(word in query_lower for word in ["due", "deadline", "submission", "assignment"]):
        if deadlines_info:
            best_deadline = deadlines_info[0]
            date_match = re.search(r'(\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?\b)', best_deadline, re.IGNORECASE)
            if date_match:
                date_str = date_match.group(1)
                return f"Based on my records, the submission is due on {date_str}."
            else:
                return f"According to my information: {best_deadline}"
        elif dates_found:
            return f"I found these relevant dates: {', '.join(dates_found[:2])}."
        else:
            return "I don't see a specific due date mentioned in my records."
    
    elif "when" in query_lower:
        if dates_found:
            return f"Based on the information I have: {', '.join(dates_found[:2])}."
        elif key_facts:
            return f"Here's what I found: {key_facts[0]}"
        else:
            return "I couldn't find specific timing information for that."
    
    elif "what" in query_lower or "how" in query_lower:
        if key_facts:
            response = "Based on my knowledge: "
            if len(key_facts) == 1:
                response += key_facts[0]
            else:
                response += key_facts[0] + " Also, " + key_facts[1].lower()
            return response
        else:
            return "I don't have specific information about that in my knowledge base."
    
    else:
        if key_facts:
            return "I found this information: " + key_facts[0]
        else:
            return "I have some general information: " + retrieved_docs[0]['text']

def execute_intents(query: str, structured_intents: Dict, user_id: str) -> List[Dict]:
    """Execute detected intents and return results"""
    executed = []
    
    for domain, intents in structured_intents.items():
        for intent in intents:
            if intent == "create_task":
                result = create_firebase_task(query, user_id)
                executed.append({"intent": "create_task", "status": result["status"], "details": result})
            
            elif intent in ["add_event", "schedule_meeting"]:
                result = create_firebase_event(query, user_id)
                executed.append({"intent": intent, "status": result["status"], "details": result})
            
            elif intent in ["create_reminder", "set_alert"]:
                result = create_firebase_reminder(query, user_id)
                executed.append({"intent": intent, "status": result["status"], "details": result})
            
            else:
                executed.append({"intent": intent, "status": "not_implemented"})
    
    return executed

# -----------------------
# API ENDPOINTS
# -----------------------
@app.on_event("startup")
async def startup_event():
    """Initialize models on startup"""
    init_models()
    print("✓ Server ready!")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "models_loaded": {
            "chromadb": collection is not None,
            "embeddings": model is not None,
            "intent_classifier": intent_classifier is not None,
            "firebase": db is not None
        },
        "collection_size": collection.count() if collection else 0
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Main chat endpoint with intent classification and execution"""
    try:
        query = request.message.strip()
        user_id = request.user_id
        
        if not query:
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        # Detect intents
        structured_intents, intent_scores = detect_intents(query)
        
        intents_detected = []
        for domain, intents in structured_intents.items():
            for intent in intents:
                intents_detected.append(
                    IntentInfo(
                        intent=intent,
                        confidence=intent_scores.get(intent, 0)
                    )
                )
        
        # Check if informational
        is_informational = is_informational_query(structured_intents, query)
        skip_search = should_skip_search(structured_intents)
        
        # Execute intents
        intents_executed = []
        retrieved_docs = []
        
        if structured_intents:
            intents_executed_raw = execute_intents(query, structured_intents, user_id)
            
            for item in intents_executed_raw:
                intents_executed.append(
                    IntentExecution(
                        intent=item["intent"],
                        status=item["status"],
                        details=item.get("details")
                    )
                )
            
            success_count = sum(1 for item in intents_executed if item.status == 'success')
            
            if is_informational or not skip_search:
                retrieved_docs = semantic_search(query, top_k=3)
            
            if success_count > 0:
                response_text = "Intent(s) executed successfully."
                if retrieved_docs and is_informational:
                    response_text = generate_knowledge_response(query, retrieved_docs)
            else:
                if retrieved_docs and is_informational:
                    response_text = generate_knowledge_response(query, retrieved_docs)
                else:
                    response_text = "Intent(s) detected but not implemented."
        else:
            # No intents: knowledge query
            retrieved_docs = semantic_search(query, top_k=3)
            response_text = generate_knowledge_response(query, retrieved_docs)
        
        return ChatResponse(
            response=response_text,
            intents_detected=intents_detected,
            intents_executed=intents_executed,
            related_content=retrieved_docs if retrieved_docs else None
        )
        
    except Exception as e:
        print(f"❌ Error in chat endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate/roadmap")
async def generate_roadmap(request: ChatRequest):
    """Generate roadmap endpoint (placeholder for future implementation)"""
    try:
        return {
            "status": "success",
            "message": "Roadmap generation not yet implemented",
            "roadmap": []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Bombil AI Backend API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "chat": "/api/chat",
            "roadmap": "/api/generate/roadmap"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)