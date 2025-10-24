#!/usr/bin/env python3
"""
Simple email functionality test without heavy dependencies
"""

import re
from typing import Dict, Optional

def extract_email_address(text: str) -> Optional[str]:
    """Extract email address from text"""
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    match = re.search(email_pattern, text)
    return match.group(0) if match else None

def extract_email_content(query: str) -> Dict:
    """Extract recipient, subject, and body from query"""
    query_lower = query.lower()
    
    # Extract recipient email
    recipient = extract_email_address(query)
    
    # Extract subject
    subject = ""
    subject_patterns = [
        r'subject[:\s]+([^,]+?)(?:\s+about|\s+regarding|\s+body|$)',
        r'with subject[:\s]+([^,]+?)(?:\s+about|\s+regarding|\s+body|$)',
    ]
    
    for pattern in subject_patterns:
        match = re.search(pattern, query, re.IGNORECASE)
        if match:
            subject = match.group(1).strip()
            break
    
    # Extract body/message
    body = ""
    body_patterns = [
        r'(?:body|message|saying|content)[:\s]+(.+)',
        r'(?:about|regarding)[:\s]+(.+)',
    ]
    
    for pattern in body_patterns:
        match = re.search(pattern, query, re.IGNORECASE)
        if match:
            body = match.group(1).strip()
            # Remove subject if it was included in body
            if subject:
                body = body.replace(subject, "").strip()
            break
    
    # If no explicit body, use the query after removing other parts
    if not body:
        body = query
        # Remove common phrases
        remove_phrases = [
            r'send\s+(?:an?\s+)?email\s+to\s+\S+@\S+',
            r'draft\s+(?:an?\s+)?email\s+to\s+\S+@\S+',
            r'with\s+subject[:\s]+[^,]+',
            r'subject[:\s]+[^,]+',
        ]
        for phrase in remove_phrases:
            body = re.sub(phrase, '', body, flags=re.IGNORECASE)
        body = re.sub(r'\s+', ' ', body).strip()
    
    if not subject:
        subject = "Message from AI Assistant"
    
    return {
        "recipient": recipient,
        "subject": subject,
        "body": body
    }

def create_email_draft_simple(query: str) -> Dict:
    """Create an email draft (simplified version)"""
    try:
        email_details = extract_email_content(query)
        
        if not email_details['recipient']:
            return {
                "status": "failed", 
                "error": "No recipient email address found in query"
            }
        
        return {
            "status": "success",
            "action": "draft_created",
            "recipient": email_details['recipient'],
            "subject": email_details['subject'],
            "body": email_details['body'],
            "preview": email_details['body'][:100] + "..." if len(email_details['body']) > 100 else email_details['body']
        }
    except Exception as e:
        return {"status": "failed", "error": str(e)}

if __name__ == "__main__":
    print("🧪 Testing Email Extraction...")
    
    test_queries = [
        "draft an email to john@example.com with subject Meeting Tomorrow saying Hi John, let us meet tomorrow at 2pm",
        "send email to sarah@company.com about project update saying The project is on track",
        "draft email to team@startup.com with subject Weekly Update body The team has made great progress this week",
    ]
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n--- Test {i} ---")
        print(f"Query: {query}")
        
        result = extract_email_content(query)
        print(f"Extracted:")
        print(f"  - Recipient: {result['recipient'] or 'None'}")
        print(f"  - Subject: {result['subject']}")
        print(f"  - Body: {result['body']}")
        
        draft_result = create_email_draft_simple(query)
        print(f"Draft Status: {draft_result['status']}")
        if draft_result['status'] == 'success':
            print(f"Preview: {draft_result['preview']}")
        else:
            print(f"Error: {draft_result.get('error', 'Unknown error')}")
    
    print("\n✅ Email functionality test completed!")