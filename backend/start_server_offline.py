#!/usr/bin/env python3
"""
Start the FastAPI server in offline mode - no model downloads
"""
import os
import uvicorn
import sys

# Set offline mode environment variable
os.environ['OFFLINE_MODE'] = 'true'

# Add the backend directory to the Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

if __name__ == "__main__":
    print("🚀 Starting Bombil AI Backend Server (OFFLINE MODE)...")
    print("🔌 Running without downloading AI models - using keyword fallbacks")
    print("📡 Server will be available at: http://localhost:8000")
    print("📋 API endpoints:")
    print("   - GET  /health - Backend health check")
    print("   - POST /api/chat - Main chat processing (keyword-based)")
    print("   - POST /api/generate/roadmap - Roadmap generation (rule-based)")
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