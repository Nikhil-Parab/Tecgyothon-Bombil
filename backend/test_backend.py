#!/usr/bin/env python3
"""
Test script to verify the AI backend is working correctly
"""
import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def test_health():
    """Test the health endpoint"""
    print("🔍 Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("✅ Health check passed")
            print(f"   Status: {data.get('status')}")
            print(f"   Models loaded: {len(data.get('models', []))}")
            print(f"   Database docs: {data.get('database_info', {}).get('document_count', 'Unknown')}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_chat():
    """Test the chat endpoint"""
    print("\n💬 Testing chat endpoint...")
    test_message = "Hello, can you help me create a project roadmap?"
    
    try:
        payload = {
            "message": test_message,
            "user_id": "test_user",
            "context": {}
        }
        
        response = requests.post(
            f"{BASE_URL}/api/chat",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Chat request successful")
            print(f"   Response length: {len(data.get('response', ''))}")
            print(f"   Confidence: {data.get('confidence', 'N/A')}")
            print(f"   Intents detected: {len(data.get('intents', {}))}")
            print(f"   Retrieved docs: {len(data.get('retrieved_docs', []))}")
            print(f"   Preview: {data.get('response', '')[:100]}...")
            return True
        else:
            print(f"❌ Chat request failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Chat request failed: {e}")
        return False

def test_roadmap():
    """Test the roadmap generation endpoint"""
    print("\n🗺️ Testing roadmap generation...")
    test_prompt = "Create a roadmap for launching a new AI product"
    
    try:
        payload = {
            "prompt": test_prompt,
            "user_id": "test_user"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/generate/roadmap",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Roadmap generation successful")
            print(f"   Response length: {len(data.get('roadmap', ''))}")
            print(f"   Confidence: {data.get('confidence', 'N/A')}")
            print(f"   Preview: {data.get('roadmap', '')[:100]}...")
            return True
        else:
            print(f"❌ Roadmap generation failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Roadmap generation failed: {e}")
        return False

def main():
    print("🧪 Bombil AI Backend Test Suite")
    print("=" * 40)
    
    # Test all endpoints
    tests = [
        ("Health Check", test_health),
        ("Chat Processing", test_chat),
        ("Roadmap Generation", test_roadmap),
    ]
    
    results = []
    for test_name, test_func in tests:
        success = test_func()
        results.append((test_name, success))
    
    # Summary
    print("\n" + "=" * 40)
    print("📊 Test Results Summary:")
    passed = 0
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"   {test_name}: {status}")
        if success:
            passed += 1
    
    print(f"\nOverall: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("🎉 All tests passed! Backend is ready for frontend integration.")
        sys.exit(0)
    else:
        print("⚠️ Some tests failed. Check the server logs and configuration.")
        sys.exit(1)

if __name__ == "__main__":
    main()