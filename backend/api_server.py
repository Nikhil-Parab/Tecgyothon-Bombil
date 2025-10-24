"""
FastAPI server wrapper for the AI backend
This creates HTTP endpoints so the frontend can communicate with your AI models
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import sys
import os
import asyncio
from datetime import datetime

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import ALL functions from do.py for complete dynamic functionality
from do import (
    # Core AI functions
    semantic_search, 
    detect_intents,
    execute_intents,
    generate_knowledge_response,
    format_response,
    
    # Firebase operations
    create_firebase_task,
    create_firebase_event,
    create_firebase_reminder,
    create_firebase_roadmap,
    init_firebase,
    
    # Utility functions
    parse_datetime,
    extract_meeting_details,
    extract_reminder_details,
    extract_task_details,
    extract_roadmap_details,
    
    # Helper functions
    should_skip_search,
    is_informational_query,
    
    # Global objects
    collection,
    model,
    intent_classifier,
    db,
    client,
    
    # Constants
    INTENTS,
    ACTIONABLE_INTENTS,
    NO_SEARCH_INTENTS,
    INFORMATIONAL_INTENTS,
    FIREBASE_CONFIG
)

app = FastAPI(title="Remo AI Backend API", version="1.0.0")

# Add CORS middleware to allow frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Comprehensive Pydantic models for ALL API requests/responses
class ChatRequest(BaseModel):
    message: str
    userId: Optional[str] = "dPYFilBStodR8Q8IwBXv8CyWHLB2"
    context: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    response: str
    type: str = "text"  # text, roadmap, task, summary
    intents: Optional[Dict[str, List[str]]] = None
    retrieved_docs: Optional[List[Dict]] = None
    confidence: Optional[float] = None
    timestamp: str

class HealthResponse(BaseModel):
    status: str
    models_loaded: Dict[str, bool]
    database_docs: int
    firebase_collections: Optional[List[str]] = None
    timestamp: str

class TaskRequest(BaseModel):
    query: str
    userId: Optional[str] = "dPYFilBStodR8Q8IwBXv8CyWHLB2"

class EventRequest(BaseModel):
    query: str
    userId: Optional[str] = "dPYFilBStodR8Q8IwBXv8CyWHLB2"

class ReminderRequest(BaseModel):
    query: str
    userId: Optional[str] = "dPYFilBStodR8Q8IwBXv8CyWHLB2"

class SemanticSearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5

class IntentDetectionRequest(BaseModel):
    query: str

class ParseDateTimeRequest(BaseModel):
    query: str

class TaskResponse(BaseModel):
    status: str
    task_id: Optional[str] = None
    title: Optional[str] = None
    priority: Optional[str] = None
    deadline: Optional[str] = None
    error: Optional[str] = None

class EventResponse(BaseModel):
    status: str
    event_id: Optional[str] = None
    title: Optional[str] = None
    attendees: Optional[List[str]] = None
    location: Optional[str] = None
    datetime: Optional[str] = None
    error: Optional[str] = None

class ReminderResponse(BaseModel):
    status: str
    reminder_id: Optional[str] = None
    message: Optional[str] = None
    datetime: Optional[str] = None
    error: Optional[str] = None

class IntentResponse(BaseModel):
    structured_intents: Dict[str, List[str]]
    intent_scores: Dict[str, float]
    actionable_intents: List[str]
    informational_intents: List[str]

class SemanticSearchResponse(BaseModel):
    results: List[Dict[str, Any]]
    query: str
    total_results: int

class DateTimeParseResponse(BaseModel):
    original_query: str
    parsed_datetime: Optional[str] = None
    success: bool
    error: Optional[str] = None

class UtilityResponse(BaseModel):
    original_query: str
    extracted_data: Dict[str, Any]
    success: bool

class RoadmapRequest(BaseModel):
    message: str
    userId: Optional[str] = "dPYFilBStodR8Q8IwBXv8CyWHLB2"
    project_type: Optional[str] = None
    timeline: Optional[str] = None

class RoadmapResponse(BaseModel):
    response: str
    type: str
    data: Optional[Dict[str, Any]] = None
    roadmap_created: bool
    confidence: float
    timestamp: str

class RoadmapListResponse(BaseModel):
    roadmaps: List[Dict[str, Any]]
    total_count: int
    timestamp: str

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint to verify backend status"""
    firebase_collections = []
    if db:
        try:
            # Get available collections
            collections_ref = db.collections()
            firebase_collections = [col.id for col in collections_ref]
        except:
            firebase_collections = ["error_accessing_collections"]
    
    return HealthResponse(
        status="healthy",
        models_loaded={
            "sentence_transformer": model is not None,
            "intent_classifier": intent_classifier is not None,
            "chromadb": collection is not None,
            "firebase": db is not None,
            "chroma_client": client is not None
        },
        database_docs=collection.count() if collection else 0,
        firebase_collections=firebase_collections,
        timestamp=datetime.now().isoformat()
    )

# ============================================================================
# INDIVIDUAL FIREBASE OPERATIONS ENDPOINTS
# ============================================================================

@app.post("/api/task/create", response_model=TaskResponse)
async def create_task(request: TaskRequest):
    """Create a new task in Firebase"""
    try:
        result = create_firebase_task(request.query, request.userId)
        return TaskResponse(**result)
    except Exception as e:
        return TaskResponse(status="failed", error=str(e))

@app.post("/api/event/create", response_model=EventResponse)
async def create_event(request: EventRequest):
    """Create a new event in Firebase"""
    try:
        result = create_firebase_event(request.query, request.userId)
        return EventResponse(**result)
    except Exception as e:
        return EventResponse(status="failed", error=str(e))

@app.post("/api/reminder/create", response_model=ReminderResponse)
async def create_reminder(request: ReminderRequest):
    """Create a new reminder in Firebase"""
    try:
        result = create_firebase_reminder(request.query, request.userId)
        return ReminderResponse(**result)
    except Exception as e:
        return ReminderResponse(status="failed", error=str(e))

# ============================================================================
# UTILITY FUNCTION ENDPOINTS
# ============================================================================

@app.post("/api/util/parse-datetime", response_model=DateTimeParseResponse)
async def parse_datetime_endpoint(request: ParseDateTimeRequest):
    """Parse date and time from natural language"""
    try:
        parsed_dt = parse_datetime(request.query)
        return DateTimeParseResponse(
            original_query=request.query,
            parsed_datetime=parsed_dt.isoformat() if parsed_dt else None,
            success=parsed_dt is not None
        )
    except Exception as e:
        return DateTimeParseResponse(
            original_query=request.query,
            success=False,
            error=str(e)
        )

@app.post("/api/util/extract-meeting", response_model=UtilityResponse)
async def extract_meeting_details_endpoint(request: ParseDateTimeRequest):
    """Extract meeting details from natural language"""
    try:
        details = extract_meeting_details(request.query)
        # Convert datetime to string for JSON serialization
        if 'datetime' in details and details['datetime']:
            details['datetime'] = details['datetime'].isoformat()
        
        return UtilityResponse(
            original_query=request.query,
            extracted_data=details,
            success=True
        )
    except Exception as e:
        return UtilityResponse(
            original_query=request.query,
            extracted_data={},
            success=False
        )

@app.post("/api/util/extract-reminder", response_model=UtilityResponse)
async def extract_reminder_details_endpoint(request: ParseDateTimeRequest):
    """Extract reminder details from natural language"""
    try:
        details = extract_reminder_details(request.query)
        # Convert datetime to string for JSON serialization
        if 'datetime' in details and details['datetime']:
            details['datetime'] = details['datetime'].isoformat()
        
        return UtilityResponse(
            original_query=request.query,
            extracted_data=details,
            success=True
        )
    except Exception as e:
        return UtilityResponse(
            original_query=request.query,
            extracted_data={},
            success=False
        )

@app.post("/api/util/extract-task", response_model=UtilityResponse)
async def extract_task_details_endpoint(request: ParseDateTimeRequest):
    """Extract task details from natural language"""
    try:
        details = extract_task_details(request.query)
        # Convert datetime to string for JSON serialization
        if 'deadline' in details and details['deadline']:
            details['deadline'] = details['deadline'].isoformat()
        
        return UtilityResponse(
            original_query=request.query,
            extracted_data=details,
            success=True
        )
    except Exception as e:
        return UtilityResponse(
            original_query=request.query,
            extracted_data={},
            success=False
        )

# ============================================================================
# ADVANCED SEARCH AND AI ENDPOINTS
# ============================================================================

@app.post("/api/search/semantic", response_model=SemanticSearchResponse)
async def semantic_search_endpoint(request: SemanticSearchRequest):
    """Perform semantic search in ChromaDB"""
    try:
        results = semantic_search(request.query, top_k=request.top_k)
        return SemanticSearchResponse(
            results=results,
            query=request.query,
            total_results=len(results)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")

@app.post("/api/ai/detect-intents", response_model=IntentResponse)
async def detect_intents_endpoint(request: IntentDetectionRequest):
    """Detect intents from user query"""
    try:
        structured_intents, intent_scores = detect_intents(request.query)
        
        # Extract actionable and informational intents
        actionable = []
        informational = []
        
        for domain, intents in structured_intents.items():
            for intent in intents:
                if intent in ACTIONABLE_INTENTS:
                    actionable.append(intent)
                if intent in INFORMATIONAL_INTENTS:
                    informational.append(intent)
        
        return IntentResponse(
            structured_intents=structured_intents,
            intent_scores=intent_scores,
            actionable_intents=actionable,
            informational_intents=informational
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Intent detection error: {str(e)}")

@app.post("/api/ai/knowledge-response")
async def generate_knowledge_response_endpoint(request: SemanticSearchRequest):
    """Generate knowledge-based response"""
    try:
        # Get relevant documents
        retrieved_docs = semantic_search(request.query, top_k=request.top_k)
        
        # Generate response
        response = generate_knowledge_response(request.query, retrieved_docs)
        
        return {
            "query": request.query,
            "response": response,
            "sources": len(retrieved_docs),
            "retrieved_docs": retrieved_docs[:3]  # Return top 3 for reference
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Knowledge response error: {str(e)}")

@app.post("/api/ai/execute-intents")
async def execute_intents_endpoint(request: ChatRequest):
    """Execute detected intents and return results"""
    try:
        # Detect intents first
        structured_intents, intent_scores = detect_intents(request.message)
        
        if not structured_intents:
            return {
                "message": "No actionable intents detected",
                "intents_detected": {},
                "intents_executed": []
            }
        
        # Execute intents
        executed_results = execute_intents(request.message, structured_intents, intent_scores)
        
        return {
            "message": request.message,
            "user_id": request.userId,
            "intents_detected": structured_intents,
            "intent_scores": intent_scores,
            "intents_executed": executed_results,
            "success_count": sum(1 for r in executed_results if r.get('status') == 'success'),
            "failed_count": sum(1 for r in executed_results if r.get('status') == 'failed')
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Intent execution error: {str(e)}")

# ============================================================================
# CONFIGURATION AND CONSTANTS ENDPOINTS
# ============================================================================

@app.get("/api/config/intents")
async def get_intents_config():
    """Get available intents configuration"""
    return {
        "intents": INTENTS,
        "actionable_intents": list(ACTIONABLE_INTENTS),
        "no_search_intents": list(NO_SEARCH_INTENTS),
        "informational_intents": list(INFORMATIONAL_INTENTS)
    }

@app.get("/api/config/firebase")
async def get_firebase_config():
    """Get Firebase configuration (without sensitive data)"""
    safe_config = {
        "projectId": FIREBASE_CONFIG.get("projectId"),
        "authDomain": FIREBASE_CONFIG.get("authDomain"),
        "status": "connected" if db else "disconnected"
    }
    return safe_config

@app.get("/api/endpoints")
async def list_all_endpoints():
    """List all available API endpoints with descriptions"""
    endpoints = {
        "health_and_status": {
            "GET /health": "Check backend health and model status",
            "GET /api/config/intents": "Get available intents configuration",
            "GET /api/config/firebase": "Get Firebase configuration",
            "GET /api/endpoints": "List all available endpoints (this endpoint)"
        },
        "firebase_operations": {
            "POST /api/task/create": "Create a new task in Firebase",
            "POST /api/event/create": "Create a new calendar event in Firebase", 
            "POST /api/reminder/create": "Create a new reminder in Firebase"
        },
        "utility_functions": {
            "POST /api/util/parse-datetime": "Parse date/time from natural language",
            "POST /api/util/extract-meeting": "Extract meeting details from text",
            "POST /api/util/extract-reminder": "Extract reminder details from text",
            "POST /api/util/extract-task": "Extract task details from text"
        },
        "ai_and_search": {
            "POST /api/search/semantic": "Perform semantic search in knowledge base",
            "POST /api/ai/detect-intents": "Detect intents from user query",
            "POST /api/ai/knowledge-response": "Generate knowledge-based response",
            "POST /api/ai/execute-intents": "Execute detected intents and return results",
            "POST /api/chat": "Main chat endpoint with full AI processing"
        },
        "roadmap_management": {
            "POST /api/generate/roadmap": "Generate comprehensive project roadmaps",
            "GET /api/roadmaps": "List all user roadmaps",
            "GET /api/roadmaps/{roadmap_id}": "Get detailed roadmap information"
        }
    }
    
    return {
        "total_endpoints": sum(len(category) for category in endpoints.values()),
        "categories": endpoints,
        "base_url": "http://localhost:8000",
        "documentation": "http://localhost:8000/docs",
        "note": "All do.py functions are now dynamically exposed via these endpoints"
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest):
    """
    Main chat endpoint - processes user messages with your AI backend
    """
    try:
        user_message = request.message
        user_id = request.userId
        
        print(f"🤖 Processing message: {user_message[:50]}...")
        
        # Step 1: Detect intents using your existing function
        structured_intents, intent_scores = detect_intents(user_message)
        all_intents = [intent for sublist in structured_intents.values() for intent in sublist]
        
        # Step 2: Perform semantic search using your existing function
        retrieved_docs = semantic_search(user_message, top_k=5)
        
        # Step 3: Execute intents and generate response
        intents_executed = []
        if structured_intents:
            intents_executed = execute_intents(user_message, structured_intents, intent_scores)
        
        # Step 4: Generate knowledge response
        ai_response = generate_knowledge_response(user_message, retrieved_docs)
        
        # If intents were executed successfully, update response
        success_count = sum(1 for item in intents_executed if item.get('status') == 'success')
        if success_count > 0:
            ai_response = f"✅ Successfully executed {success_count} action(s)!\n\n{ai_response}"
        
        # Step 4: Determine response type based on intents and content
        response_type = "text"
        if any("roadmap" in intent for intent in all_intents) or "roadmap" in user_message.lower():
            response_type = "roadmap"
        elif any("task" in intent for intent in all_intents) or "task" in user_message.lower():
            response_type = "task"
        elif any("calendar" in intent for intent in all_intents) or "schedule" in user_message.lower():
            response_type = "calendar"
        
        # Step 5: Add context and formatting
        if structured_intents:
            intent_summary = format_detected_intents(structured_intents, intent_scores)
            ai_response += f"\n\n{intent_summary}"
        
        # Calculate confidence based on retrieval and intent detection
        confidence = calculate_response_confidence(retrieved_docs, structured_intents)
        
        print(f"✅ Generated response with {len(retrieved_docs)} context docs and {len(all_intents)} intents")
        
        return ChatResponse(
            response=ai_response,
            type=response_type,
            intents=structured_intents,
            retrieved_docs=[{
                "text": doc["text"][:200] + "..." if len(doc["text"]) > 200 else doc["text"],
                "score": doc["score"],
                "user": doc["metadata"].get("user", "unknown")
            } for doc in retrieved_docs[:3]],
            confidence=confidence,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        print(f"❌ Error processing chat request: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

@app.post("/api/generate/roadmap")
async def generate_roadmap(request: ChatRequest):
    """
    Dedicated roadmap generation endpoint - Creates comprehensive project roadmaps
    """
    try:
        print(f"🗺️ Generating roadmap for: {request.message[:50]}...")
        
        # Create comprehensive roadmap using Firebase integration
        roadmap_result = create_firebase_roadmap(request.message, request.userId)
        
        if roadmap_result["status"] == "success":
            # Generate AI-powered description and insights
            roadmap_prompt = f"Create an executive summary for this project roadmap: {request.message}"
            retrieved_docs = semantic_search(roadmap_prompt, top_k=5)
            ai_summary = generate_knowledge_response(roadmap_prompt, retrieved_docs)
            
            # Structure comprehensive roadmap response
            roadmap_data = {
                "roadmap_id": roadmap_result.get("roadmap_id"),
                "title": roadmap_result.get("title"),
                "project_type": roadmap_result.get("project_type"),
                "timeline": roadmap_result.get("timeline"),
                "phases_count": roadmap_result.get("phases_count", 0),
                "milestones_count": roadmap_result.get("milestones_count", 0),
                "ai_summary": ai_summary,
                "status": "draft",
                "created_at": datetime.now().isoformat()
            }
            
            success_message = f"✅ Successfully created comprehensive roadmap!\n\n📋 **Project Details:**\n• Type: {roadmap_result.get('project_type', 'General').title()}\n• Timeline: {roadmap_result.get('timeline', 'TBD')}\n• Phases: {roadmap_result.get('phases_count', 0)}\n• Milestones: {roadmap_result.get('milestones_count', 0)}\n\n🧠 **AI Insights:**\n{ai_summary}\n\n🎯 **Next Steps:**\n1. Review the generated roadmap phases\n2. Assign team members to specific phases\n3. Set up milestone tracking\n4. Begin phase 1 execution"
            
            return {
                "response": success_message,
                "type": "roadmap",
                "data": roadmap_data,
                "roadmap_created": True,
                "confidence": 0.95,
                "timestamp": datetime.now().isoformat()
            }
        else:
            error_message = f"❌ Failed to create roadmap: {roadmap_result.get('error', 'Unknown error')}"
            return {
                "response": error_message,
                "type": "error",
                "data": None,
                "roadmap_created": False,
                "confidence": 0.1,
                "timestamp": datetime.now().isoformat()
            }
        
    except Exception as e:
        print(f"❌ Error generating roadmap: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating roadmap: {str(e)}")

@app.get("/api/roadmaps")
async def list_user_roadmaps(userId: str = "dPYFilBStodR8Q8IwBXv8CyWHLB2"):
    """
    List all roadmaps for a user
    """
    try:
        if not db:
            raise HTTPException(status_code=500, detail="Firebase not initialized")
        
        roadmaps_ref = db.collection('users').document(userId).collection('roadmaps')
        roadmaps = roadmaps_ref.order_by('createdAt', direction='DESCENDING').get()
        
        roadmap_list = []
        for doc in roadmaps:
            data = doc.to_dict()
            roadmap_list.append({
                "id": doc.id,
                "title": data.get('title', 'Untitled Roadmap'),
                "project_type": data.get('project_type', 'general'),
                "timeline": data.get('timeline', 'TBD'),
                "status": data.get('status', 'draft'),
                "completion_percentage": data.get('completion_percentage', 0),
                "phases_count": len(data.get('phases', [])),
                "created_at": data.get('createdAt', datetime.now()).isoformat() if hasattr(data.get('createdAt'), 'isoformat') else str(data.get('createdAt'))
            })
        
        return {
            "roadmaps": roadmap_list,
            "total_count": len(roadmap_list),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Error listing roadmaps: {e}")
        raise HTTPException(status_code=500, detail=f"Error listing roadmaps: {str(e)}")

@app.get("/api/roadmaps/{roadmap_id}")
async def get_roadmap_details(roadmap_id: str, userId: str = "dPYFilBStodR8Q8IwBXv8CyWHLB2"):
    """
    Get detailed information about a specific roadmap
    """
    try:
        if not db:
            raise HTTPException(status_code=500, detail="Firebase not initialized")
        
        doc_ref = db.collection('users').document(userId).collection('roadmaps').document(roadmap_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Roadmap not found")
        
        roadmap_data = doc.to_dict()
        
        # Convert Firestore timestamps to ISO strings
        if hasattr(roadmap_data.get('createdAt'), 'isoformat'):
            roadmap_data['createdAt'] = roadmap_data['createdAt'].isoformat()
        if hasattr(roadmap_data.get('updatedAt'), 'isoformat'):
            roadmap_data['updatedAt'] = roadmap_data['updatedAt'].isoformat()
        
        return {
            "roadmap": roadmap_data,
            "roadmap_id": roadmap_id,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting roadmap details: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting roadmap details: {str(e)}")

def format_detected_intents(structured_intents: Dict[str, List[str]], intent_scores: Dict[str, float]) -> str:
    """Format detected intents for display"""
    if not structured_intents:
        return ""
    
    output = "\n\n🎯 **Detected Actions:**\n"
    
    intent_emojis = {
        "task_management": "📋",
        "calendar": "📅", 
        "tools": "🔧",
        "reminders": "⏰",
        "knowledge": "🔍",
        "communication": "✉️",
        "coding": "💻"
    }
    
    for domain, intents in structured_intents.items():
        emoji = intent_emojis.get(domain, "•")
        output += f"\n{emoji} **{domain.replace('_', ' ').title()}:**\n"
        for intent in intents:
            score = intent_scores.get(intent, 0)
            output += f"  • {intent.replace('_', ' ').title()} (confidence: {score:.1%})\n"
    
    return output

def calculate_response_confidence(retrieved_docs: List, structured_intents: Dict) -> float:
    """Calculate confidence score based on retrieval quality and intent detection"""
    base_confidence = 0.5
    
    # Boost confidence based on retrieved documents
    if retrieved_docs:
        avg_score = sum(doc["score"] for doc in retrieved_docs) / len(retrieved_docs)
        base_confidence += avg_score * 0.3
    
    # Boost confidence based on intent detection
    if structured_intents:
        base_confidence += 0.2
    
    return min(base_confidence, 1.0)

def extract_title_from_message(message: str) -> str:
    """Extract a title from the user message"""
    # Simple title extraction - you can make this more sophisticated
    words = message.split()
    if len(words) <= 5:
        return message.title()
    else:
        return " ".join(words[:5]).title() + "..."

def generate_roadmap_items(message: str, retrieved_docs: List) -> List[Dict]:
    """Generate roadmap items based on message and context"""
    # This is a simple implementation - you can enhance with your AI models
    base_items = [
        {
            "title": "Initial Planning Phase",
            "description": "Define requirements and scope",
            "status": "not-started",
            "priority": "high",
            "timeline": "Week 1-2"
        },
        {
            "title": "Development Phase", 
            "description": "Core implementation and features",
            "status": "not-started",
            "priority": "high",
            "timeline": "Week 3-8"
        },
        {
            "title": "Testing & Deployment",
            "description": "Quality assurance and production deployment",
            "status": "not-started", 
            "priority": "medium",
            "timeline": "Week 9-10"
        }
    ]
    
    return base_items

if __name__ == "__main__":
    import uvicorn
    
    print("🚀 Starting Remo AI Backend API Server...")
    print("📡 Frontend can connect at: http://localhost:8000")
    print("📖 API documentation: http://localhost:8000/docs")
    print("🔍 Health check: http://localhost:8000/health")
    print("\nPress Ctrl+C to stop\n")
    
    # Start the FastAPI server
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    )