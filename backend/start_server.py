#!/usr/bin/env python3
"""
Simple script to start the FastAPI server for the AI backend
"""
import uvicorn
import sys
import os

# Add the backend directory to the Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

if __name__ == "__main__":
    print("🚀 Starting REMO.ai AI Backend Server...")
    print("📡 Server will be available at: http://localhost:8000")
    print("📋 API endpoints:")
    print("   - GET  /health - Backend health check")
    print("   - POST /api/chat - Main chat processing")
    print("   - POST /api/generate/roadmap - Roadmap generation")
    print("\n🔧 Starting FastAPI server with uvicorn...")
    
    try:
        uvicorn.run(
            "api_server:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            reload_dirs=[backend_dir],
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)