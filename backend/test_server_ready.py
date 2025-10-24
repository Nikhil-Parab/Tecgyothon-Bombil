#!/usr/bin/env python3
"""
Quick test to start the server and check if imports work
"""
import sys
import os

# Add the backend directory to Python path  
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

print("🚀 Testing Bombil AI Backend Server Import...")

try:
    # This is the same import that was failing
    from do import (
        semantic_search, 
        detect_intents,
        execute_intents,
        generate_knowledge_response,
        format_response,
        create_firebase_task,
        create_firebase_event,
        create_firebase_reminder,
        create_firebase_roadmap,  # This was missing!
        init_firebase,
        parse_datetime,
        extract_meeting_details,
        extract_reminder_details,
        extract_task_details,
        extract_roadmap_details,  # This was missing!
        should_skip_search,
        is_informational_query,
        collection,
        model,
        intent_classifier,
        db,
        client,
        INTENTS,
        ACTIONABLE_INTENTS,
        NO_SEARCH_INTENTS,
        INFORMATIONAL_INTENTS,
        FIREBASE_CONFIG
    )
    
    print("✅ All imports successful!")
    print("✅ Backend is ready to start!")
    print("\n🔧 Key components loaded:")
    print(f"   📊 ChromaDB Collection: {collection.count() if collection else 'Not loaded'} docs")
    print(f"   🤖 AI Model: {'Loaded' if model else 'Not loaded'}")
    print(f"   🎯 Intent Classifier: {'Loaded' if intent_classifier else 'Not loaded'}")
    print(f"   🔥 Firebase: {'Connected' if db else 'Not connected'}")
    
    print("\n🚀 Ready to start server with:")
    print("   python start_server.py")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("❌ Server cannot start due to missing functions")
    sys.exit(1)
except Exception as e:
    print(f"❌ Unexpected error: {e}")
    sys.exit(1)