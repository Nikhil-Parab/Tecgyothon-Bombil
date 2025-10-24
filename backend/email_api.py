#!/usr/bin/env python3
"""
Email API - Simple Flask API for email functionality
This provides HTTP endpoints for the email drafting functionality
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os

# Add the current directory to path to import do.py
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from do import create_email_draft, handle_gmail_action, extract_email_content
except ImportError as e:
    print(f"Error importing email functions: {e}")
    # Fallback functions
    def create_email_draft(query, user_id=None):
        return {"status": "failed", "error": "Email module not available"}
    
    def handle_gmail_action(query):
        return {"status": "failed", "error": "Gmail module not available"}
    
    def extract_email_content(query):
        return {"recipient": "", "subject": "", "body": ""}

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration

@app.route('/api/email/draft', methods=['POST'])
def draft_email():
    """Create an email draft"""
    try:
        data = request.get_json()
        
        if not data or 'query' not in data:
            return jsonify({
                "status": "failed",
                "error": "Missing query parameter"
            }), 400
        
        query = data['query']
        user_id = data.get('user_id', 'demo_user')
        
        result = create_email_draft(query, user_id)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            "status": "failed",
            "error": str(e)
        }), 500

@app.route('/api/email/send', methods=['POST'])
def send_email():
    """Send an email"""
    try:
        data = request.get_json()
        
        if not data or 'query' not in data:
            return jsonify({
                "status": "failed",
                "error": "Missing query parameter"
            }), 400
        
        query = data['query']
        result = handle_gmail_action(query)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            "status": "failed",
            "error": str(e)
        }), 500

@app.route('/api/email/extract', methods=['POST'])
def extract_email():
    """Extract email details from natural language"""
    try:
        data = request.get_json()
        
        if not data or 'query' not in data:
            return jsonify({
                "status": "failed",
                "error": "Missing query parameter"
            }), 400
        
        query = data['query']
        result = extract_email_content(query)
        
        return jsonify({
            "status": "success",
            "data": result
        })
        
    except Exception as e:
        return jsonify({
            "status": "failed",
            "error": str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "email-api",
        "version": "1.0.0"
    })

@app.route('/api/email/test', methods=['GET'])
def test_email():
    """Test endpoint for email functionality"""
    try:
        # Test email extraction
        test_query = "draft an email to test@example.com with subject 'Test Subject' saying hello world"
        result = extract_email_content(test_query)
        
        return jsonify({
            "status": "success",
            "test_query": test_query,
            "extracted": result,
            "message": "Email functionality is working"
        })
        
    except Exception as e:
        return jsonify({
            "status": "failed",
            "error": str(e),
            "message": "Email functionality test failed"
        }), 500

if __name__ == '__main__':
    print("🚀 Starting Email API Server...")
    print("📧 Endpoints available:")
    print("  - POST /api/email/draft - Create email draft")
    print("  - POST /api/email/send - Send email")
    print("  - POST /api/email/extract - Extract email details")
    print("  - GET /api/health - Health check")
    print("  - GET /api/email/test - Test email functionality")
    print("\n🌐 Server running on http://localhost:5001")
    
    app.run(host='0.0.0.0', port=5001, debug=True)