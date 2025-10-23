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

# Import your existing AI backend
from main import (
    semantic_search, 
    generate_answer_with_bart, 
    detect_intents,
    collection,
    model,
    bart_generator,
    intent_classifier
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

# Pydantic models for API requests/responses
class ChatRequest(BaseModel):
    message: str
    userId: Optional[str] = None
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
    timestamp: str

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint to verify backend status"""
    return HealthResponse(
        status="healthy",
        models_loaded={
            "sentence_transformer": model is not None,
            "bart_generator": bart_generator is not None,
            "intent_classifier": intent_classifier is not None,
            "chromadb": collection is not None
        },
        database_docs=collection.count() if collection else 0,
        timestamp=datetime.now().isoformat()
    )

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
        structured_intents, all_intents, intent_scores = detect_intents(user_message)
        
        # Step 2: Perform semantic search using your existing function
        retrieved_docs = semantic_search(user_message, user_filter=None, top_k=5)
        
        # Step 3: Generate response using your existing BART model
        ai_response = generate_answer_with_bart(user_message, retrieved_docs)
        
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
    Dedicated roadmap generation endpoint
    """
    try:
        # Use your existing AI backend with roadmap-specific processing
        structured_intents, all_intents, intent_scores = detect_intents(request.message)
        retrieved_docs = semantic_search(request.message, top_k=10)
        
        # Generate roadmap-specific response
        roadmap_prompt = f"Create a detailed project roadmap for: {request.message}"
        ai_response = generate_answer_with_bart(roadmap_prompt, retrieved_docs)
        
        # Structure roadmap data (you can enhance this based on your needs)
        roadmap_data = {
            "title": extract_title_from_message(request.message),
            "description": ai_response,
            "items": generate_roadmap_items(request.message, retrieved_docs),
            "timeline": "Q4 2025 - Q2 2026",
            "priority": "high"
        }
        
        return {
            "response": ai_response,
            "type": "roadmap",
            "data": roadmap_data,
            "intents": structured_intents,
            "confidence": 0.9,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Error generating roadmap: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating roadmap: {str(e)}")

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