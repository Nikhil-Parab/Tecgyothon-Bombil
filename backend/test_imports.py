#!/usr/bin/env python3
"""
Test script to verify all imports work correctly
"""
import sys
import os

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

def test_imports():
    """Test all the imports that api_server.py needs"""
    try:
        print("🧪 Testing imports...")
        
        # Test individual imports
        from do import semantic_search
        print("✅ semantic_search imported")
        
        from do import detect_intents
        print("✅ detect_intents imported")
        
        from do import execute_intents
        print("✅ execute_intents imported")
        
        from do import generate_knowledge_response
        print("✅ generate_knowledge_response imported")
        
        from do import format_response
        print("✅ format_response imported")
        
        from do import create_firebase_task
        print("✅ create_firebase_task imported")
        
        from do import create_firebase_event
        print("✅ create_firebase_event imported")
        
        from do import create_firebase_reminder
        print("✅ create_firebase_reminder imported")
        
        from do import create_firebase_roadmap
        print("✅ create_firebase_roadmap imported")
        
        from do import init_firebase
        print("✅ init_firebase imported")
        
        from do import extract_roadmap_details
        print("✅ extract_roadmap_details imported")
        
        print("🎉 All imports successful!")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = test_imports()
    sys.exit(0 if success else 1)