import os
import chromadb
from sentence_transformers import SentenceTransformer
import numpy as np
from transformers import pipeline
import torch
import warnings
from typing import Dict, List, Tuple, Optional
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timedelta
import json
import re
import imaplib
import email
from email.header import decode_header
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

warnings.filterwarnings('ignore')

load_dotenv()

# Gmail Configuration
GMAIL_ADDRESS = os.getenv("GMAIL_ADDRESS", "omdeeborkar@gmail.com")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "onpi xlgs kcrh msbl")

# -----------------------
# CONFIGURATION
# -----------------------
PERSIST_DIR = "./chroma_store"
COLLECTION_NAME = "team_context"
EMBED_MODEL = "all-MiniLM-L6-v2"
TOP_K = 5
MIN_SIMILARITY = 0.2
INTENT_THRESHOLD = 0.70

# Firebase Configuration
FIREBASE_CONFIG = {
    "apiKey": "AIzaSyARE0reg0pdRz24ncMF-RzExhcLwbuXmSk",
    "authDomain": "remo-6afe2.firebaseapp.com",
    "projectId": "remo-6afe2",
    "storageBucket": "remo-6afe2.firebasestorage.app",
    "messagingSenderId": "1075302802783",
    "appId": "1:1075302802783:web:05427acca986d7fac7c2ea"
}

# Intent categories with actionable intents
ACTIONABLE_INTENTS = {
    "create_task", "list_tasks", "set_priority", "track_deadline",
    "add_event", "update_event", "schedule_meeting",
    "create_reminder", "set_alert"
}

# Intents that should NOT trigger knowledge search
NO_SEARCH_INTENTS = {
    "create_task", "add_event", "schedule_meeting", "create_reminder", 
    "set_alert", "update_event", "set_priority", "gmail_action", "draft_email"
}

# Informational intents that should prioritize knowledge search
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
# INITIALIZE FIREBASE
# -----------------------
def init_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        if not firebase_admin._apps:
            cred = credentials.Certificate("remo-sdk.json")
            firebase_admin.initialize_app(cred)
        return firestore.client()
    except Exception as e:
        print(f"⚠ Firebase initialization error: {e}")
        return None

# -----------------------
# SETUP MODELS
# -----------------------
print("🔧 Initializing models...")

# ChromaDB
client = chromadb.PersistentClient(path=PERSIST_DIR)
try:
    collection = client.get_collection(COLLECTION_NAME)
    print(f"✓ Connected to collection '{COLLECTION_NAME}' ({collection.count()} docs)")
except:
    collection = client.create_collection(COLLECTION_NAME)
    print(f"✓ Created collection '{COLLECTION_NAME}'")

# Embedding model
model = SentenceTransformer(EMBED_MODEL)
print(f"✓ Loaded embedding model: {EMBED_MODEL}")

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
db = init_firebase()

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
        # Add other days if needed
    
    return target_date


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
    # Remove time, date, location, and attendee info
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
    # Parse time
    reminder_time = parse_datetime(query)
    
    # If no specific time, look for relative time
    if not reminder_time:
        query_lower = query.lower()
        if 'in' in query_lower:
            # "in 2 hours", "in 30 minutes", "in 2 days"
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
    
    # Default to 1 day from now
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


# -----------------------
# FIREBASE OPERATIONS
# -----------------------
def create_firebase_task(query: str, user_id: str = "dPYFilBStodR8Q8IwBXv8CyWHLB2"):
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


def create_firebase_event(query: str, user_id: str = "dPYFilBStodR8Q8IwBXv8CyWHLB2"):
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
            "endTime": event_details["datetime"] + timedelta(hours=1),  # Default 1 hour duration
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


def create_firebase_reminder(query: str, user_id: str = "dPYFilBStodR8Q8IwBXv8CyWHLB2"):
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


def extract_roadmap_details(query: str) -> Dict:
    """Extract roadmap details from query"""
    query_lower = query.lower()
    
    # Extract project type
    project_type = "general"
    if any(keyword in query_lower for keyword in ['web', 'website', 'webapp']):
        project_type = "web_development"
    elif any(keyword in query_lower for keyword in ['mobile', 'app', 'ios', 'android']):
        project_type = "mobile_development"
    elif any(keyword in query_lower for keyword in ['ai', 'ml', 'machine learning', 'data science']):
        project_type = "ai_project"
    elif any(keyword in query_lower for keyword in ['startup', 'business', 'company']):
        project_type = "startup"
    
    # Extract timeline
    timeline_months = 6  # default
    timeline_pattern = r'(\d+)\s*(month|months|week|weeks)'
    match = re.search(timeline_pattern, query_lower)
    if match:
        duration = int(match.group(1))
        unit = match.group(2)
        if 'week' in unit:
            timeline_months = max(1, duration // 4)
        else:
            timeline_months = duration
    
    # Extract budget
    budget = None
    budget_pattern = r'\$?([\d,]+)(?:k|000)?'
    match = re.search(budget_pattern, query)
    if match:
        budget = match.group(1).replace(',', '')
        if 'k' in query_lower:
            budget = int(budget) * 1000
        else:
            budget = int(budget)
    
    return {
        "title": f"{project_type.replace('_', ' ').title()} Project",
        "description": f"AI-generated roadmap for {query}",
        "project_type": project_type,
        "timeline_months": timeline_months,
        "budget": budget,
        "phases": []
    }

# -----------------------
# GMAIL OPERATIONS
# -----------------------
def fetch_gmail(limit=10):
    """Fetch the latest N emails from Gmail inbox."""
    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
        mail.select("inbox")

        status, messages = mail.search(None, "ALL")
        if status != "OK":
            return []

        email_ids = messages[0].split()[-limit:]
        emails_data = []

        for num in email_ids:
            _, data = mail.fetch(num, "(RFC822)")
            raw_email = data[0][1]
            msg = email.message_from_bytes(raw_email)

            # Decode subject
            subject, encoding = decode_header(msg["Subject"])[0]
            if isinstance(subject, bytes):
                subject = subject.decode(encoding or "utf-8", errors="ignore")

            from_ = msg.get("From", "")
            date_ = msg.get("Date", "")

            # Extract plain text body
            body = ""
            if msg.is_multipart():
                for part in msg.walk():
                    content_type = part.get_content_type()
                    content_disposition = str(part.get("Content-Disposition"))
                    if content_type == "text/plain" and "attachment" not in content_disposition:
                        try:
                            body = part.get_payload(decode=True).decode()
                            break
                        except Exception:
                            continue
            else:
                try:
                    body = msg.get_payload(decode=True).decode(errors="ignore")
                except Exception:
                    body = str(msg.get_payload())

            # Clean up text
            body = re.sub(r"\r|\n+", " ", body)
            body = re.sub(r"http\S+", "", body)
            body = re.sub(r"={2,}", "", body)
            body = re.sub(r"\s+", " ", body).strip()

            emails_data.append({
                "from": from_,
                "subject": subject,
                "body": body[:1000],
                "date": date_
            })

        mail.close()
        mail.logout()
        return emails_data

    except Exception as e:
        print(f"❌ Error fetching Gmail: {e}")
        return []


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


def generate_email_summary(text: str, max_length: int = 150) -> str:
    """Generate a summary of email text using BART"""
    try:
        if not intent_classifier:  # Reuse the BART model
            return text[:max_length]
        
        # Use a simple summarization approach
        # For better results, you could load a separate summarization model
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
        
        # Take first few sentences as summary
        summary = '. '.join(sentences[:3])
        if len(summary) > max_length:
            summary = summary[:max_length] + "..."
        
        return summary
    except Exception as e:
        print(f"⚠ Summarization error: {e}")
        return text[:max_length]


def send_gmail(to_email: str, subject: str, body: str, reply_to: Optional[str] = None):
    """Send an email via Gmail"""
    try:
        msg = MIMEMultipart()
        msg["From"] = GMAIL_ADDRESS
        msg["To"] = to_email
        msg["Subject"] = subject
        
        if reply_to:
            msg["In-Reply-To"] = reply_to
            msg["References"] = reply_to
        
        msg.attach(MIMEText(body, "plain"))

        server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
        server.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        return {
            "status": "success",
            "recipient": to_email,
            "subject": subject
        }
    except Exception as e:
        return {
            "status": "failed",
            "error": str(e)
        }


def handle_gmail_action(query: str) -> Dict:
    """Handle Gmail-related actions: reply, draft, or send"""
    query_lower = query.lower()
    
    # Check if it's a reply action
    if any(word in query_lower for word in ["reply", "respond to"]):
        # Fetch recent emails
        emails = fetch_gmail(limit=5)
        if not emails:
            return {"status": "failed", "error": "No emails found to reply to"}
        
        # Find the most relevant email to reply to
        # Look for keywords in the query
        best_match = None
        for email_data in emails:
            if any(keyword in query_lower for keyword in [
                email_data['subject'].lower()[:20],
                email_data['from'].lower()
            ]):
                best_match = email_data
                break
        
        if not best_match:
            best_match = emails[0]  # Reply to most recent
        
        # Generate reply content
        reply_subject = f"Re: {best_match['subject']}"
        
        # Extract reply message from query
        reply_body = query
        for phrase in ["reply to", "respond to", "reply", "with", "saying"]:
            reply_body = re.sub(phrase, '', reply_body, flags=re.IGNORECASE)
        reply_body = re.sub(r'\s+', ' ', reply_body).strip()
        
        if not reply_body or len(reply_body) < 10:
            # Generate automated reply
            summary = generate_email_summary(best_match['body'])
            reply_body = (
                f"Thank you for your email regarding '{best_match['subject']}'.\n\n"
                f"I've received your message: {summary}\n\n"
                f"This is an automated acknowledgment. I'll get back to you soon.\n\n"
                f"Best regards"
            )
        
        # Extract sender email
        sender_email = extract_email_address(best_match['from'])
        if not sender_email:
            return {"status": "failed", "error": "Could not extract sender email"}
        
        result = send_gmail(sender_email, reply_subject, reply_body)
        result["action"] = "reply"
        result["original_subject"] = best_match['subject']
        return result
    
    # Otherwise, it's a draft/send action
    else:
        email_details = extract_email_content(query)
        
        if not email_details['recipient']:
            return {
                "status": "failed",
                "error": "No recipient email address found in query"
            }
        
        # Check if we should draft or send
        if "draft" in query_lower and "send" not in query_lower:
            # Just return the draft
            return {
                "status": "drafted",
                "action": "draft",
                "recipient": email_details['recipient'],
                "subject": email_details['subject'],
                "body": email_details['body']
            }
        else:
            # Send the email
            result = send_gmail(
                email_details['recipient'],
                email_details['subject'],
                email_details['body']
            )
            result["action"] = "send"
            return result


# -----------------------
# ENHANCED EMAIL FUNCTIONS WITH DYNAMIC CHAT INTEGRATION
# -----------------------

def send_dynamic_reply(to_email: str, subject: str, original_body: str, user_message: str = "", user_name: str = "Assistant"):
    """Send a dynamic reply with user-specific content from chat."""
    # Extract custom message from user input
    custom_message = ""
    if user_message:
        # Remove common email keywords to get the actual message
        keywords_to_remove = ["reply to", "send reply", "respond to", "reply", "email", "message"]
        clean_message = user_message.lower()
        for keyword in keywords_to_remove:
            clean_message = clean_message.replace(keyword, "").strip()
        
        if len(clean_message) > 10:  # If there's substantial content
            custom_message = user_message
    
    # Generate dynamic reply body
    if custom_message:
        reply_body = (
            f"Hi,\n\n"
            f"{custom_message}\n\n"
            f"Thanks for your email regarding '{subject}'.\n\n"
            f"Original message preview:\n{original_body[:150]}...\n\n"
            f"Best regards,\n{user_name}"
        )
    else:
        reply_body = (
            f"Hi,\n\n"
            f"Thanks for your email regarding '{subject}'.\n"
            f"I've received your message and will get back to you soon.\n\n"
            f"Original message preview:\n{original_body[:150]}...\n\n"
            f"Best regards,\n{user_name}"
        )

    msg = MIMEMultipart()
    msg["From"] = GMAIL_ADDRESS
    msg["To"] = to_email
    msg["Subject"] = f"Re: {subject}"
    msg.attach(MIMEText(reply_body, "plain"))

    try:
        server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
        server.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
        server.send_message(msg)
        server.quit()
        return {
            "status": "success",
            "action": "reply_sent",
            "recipient": to_email,
            "subject": f"Re: {subject}",
            "body": reply_body
        }
    except Exception as e:
        return {
            "status": "failed",
            "error": str(e)
        }


def create_email_draft(to_email: str, subject: str, body_content: str, user_name: str = "Assistant"):
    """Create an email draft with dynamic content from chat."""
    
    # Enhance body content with professional formatting
    if not body_content or len(body_content.strip()) < 10:
        body_content = "Please provide the message content for this email."
    
    formatted_body = (
        f"Hi,\n\n"
        f"{body_content}\n\n"
        f"Best regards,\n{user_name}"
    )
    
    return {
        "status": "draft_created",
        "action": "draft",
        "recipient": to_email,
        "subject": subject,
        "body": formatted_body,
        "timestamp": datetime.now().isoformat()
    }


def process_email_from_chat(chat_message: str, user_name: str = "Assistant", user_email: str = ""):
    """Process email-related requests from chat messages with dynamic content."""
    
    # Extract email action type
    action_type = "unknown"
    if any(word in chat_message.lower() for word in ["reply", "respond to"]):
        action_type = "reply"
    elif "draft" in chat_message.lower():
        action_type = "draft"
    elif "send" in chat_message.lower():
        action_type = "send"
    
    # Extract recipient email
    recipient = extract_email_address(chat_message)
    if not recipient:
        return {
            "status": "failed",
            "error": "No recipient email address found in message"
        }
    
    # Extract subject
    subject = "Message from AI Assistant"
    subject_patterns = [
        r"(?:with\s+)?subject[:\s]+([^,\n]+?)(?:\s+(?:saying|body|about|regarding)|$)",
        r"subject[:\s]+[\"']([^\"']+)[\"']",
        r"about\s+([^,\n]+?)(?:\s+(?:saying|body|to)|$)"
    ]
    
    for pattern in subject_patterns:
        match = re.search(pattern, chat_message, re.IGNORECASE)
        if match:
            subject = match.group(1).strip()
            break
    
    # Extract body content
    body = ""
    body_patterns = [
        r"(?:saying|body|message|content)[:\s]+(.+?)$",
        r"(?:about|regarding)[:\s]+(.+?)$"
    ]
    
    for pattern in body_patterns:
        match = re.search(pattern, chat_message, re.IGNORECASE)
        if match:
            body = match.group(1).strip()
            break
    
    # If no explicit body found, extract from remaining text
    if not body:
        # Remove email address, subject, and action keywords
        body = chat_message
        for keyword in ["draft email", "send email", "email", recipient, "subject:", subject]:
            body = body.replace(keyword, "", 1)
        body = re.sub(r'\s+', ' ', body).strip()
    
    # Process based on action type
    if action_type == "reply":
        # Fetch recent emails to find the one to reply to
        emails = fetch_gmail(limit=10)
        if not emails:
            return {"status": "failed", "error": "No emails found to reply to"}
        
        # Find email from the specified sender or most recent
        target_email = None
        for email_data in emails:
            sender_in_email = extract_email_address(email_data['from'])
            if sender_in_email == recipient:
                target_email = email_data
                break
        
        if not target_email:
            target_email = emails[0]  # Use most recent if specific sender not found
        
        return send_dynamic_reply(
            to_email=recipient,
            subject=target_email['subject'],
            original_body=target_email['body'],
            user_message=body,
            user_name=user_name
        )
    
    elif action_type == "draft":
        return create_email_draft(
            to_email=recipient,
            subject=subject,
            body_content=body,
            user_name=user_name
        )
    
    elif action_type == "send":
        # Create and send email immediately
        draft = create_email_draft(recipient, subject, body, user_name)
        if draft["status"] == "draft_created":
            result = send_gmail(recipient, subject, draft["body"])
            result["action"] = "sent"
            return result
        else:
            return draft
    
    else:
        return {
            "status": "failed",
            "error": "Could not determine email action type from message"
        }


def get_email_summary_for_chat(limit: int = 5) -> Dict:
    """Get a summary of recent emails formatted for chat display."""
    emails = fetch_gmail(limit=limit)
    
    if not emails:
        return {
            "status": "no_emails",
            "message": "📭 No emails found in inbox."
        }
    
    summary = {
        "status": "success",
        "email_count": len(emails),
        "emails": []
    }
    
    for i, email_data in enumerate(emails, 1):
        summary["emails"].append({
            "number": i,
            "from": email_data["from"],
            "subject": email_data["subject"],
            "preview": email_data["body"][:100] + "..." if len(email_data["body"]) > 100 else email_data["body"],
            "date": email_data["date"]
        })
    
    return summary


def create_firebase_roadmap(query: str, user_id: str = "dPYFilBStodR8Q8IwBXv8CyWHLB2"):
    """Create roadmap in Firebase"""
    if not db:
        return {"status": "failed", "error": "Firebase not initialized"}
    
    try:
        roadmap_details = extract_roadmap_details(query)
        roadmap_id = f"roadmap_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        current_time = datetime.now()
        
        # Generate basic phases based on project type
        phases = []
        if roadmap_details["project_type"] == "web_development":
            phases = [
                {"name": "Planning & Research", "duration": "2 weeks", "description": "Requirements gathering and technical planning"},
                {"name": "Design & Architecture", "duration": "3 weeks", "description": "UI/UX design and system architecture"},
                {"name": "Development", "duration": "8 weeks", "description": "Core development and feature implementation"},
                {"name": "Testing & Deployment", "duration": "3 weeks", "description": "Testing, optimization, and deployment"}
            ]
        elif roadmap_details["project_type"] == "mobile_development":
            phases = [
                {"name": "Planning & Design", "duration": "3 weeks", "description": "App concept and UI/UX design"},
                {"name": "Development", "duration": "10 weeks", "description": "Core app development"},
                {"name": "Testing & Launch", "duration": "3 weeks", "description": "Testing and app store deployment"}
            ]
        else:
            phases = [
                {"name": "Planning", "duration": "2 weeks", "description": "Project planning and requirements"},
                {"name": "Implementation", "duration": "8 weeks", "description": "Core implementation phase"},
                {"name": "Review & Launch", "duration": "2 weeks", "description": "Final review and launch"}
            ]
        
        roadmap_data = {
            "title": roadmap_details["title"],
            "description": roadmap_details["description"],
            "projectType": roadmap_details["project_type"],
            "timelineMonths": roadmap_details["timeline_months"],
            "budget": roadmap_details["budget"],
            "phases": phases,
            "createdAt": current_time,
            "updatedAt": current_time,
            "status": "active",
            "createdBy": "ai",
            "tags": ["ai-generated", roadmap_details["project_type"]]
        }
        
        doc_ref = db.collection('users').document(user_id).collection('roadmaps').document(roadmap_id)
        doc_ref.set(roadmap_data)
        
        return {
            "status": "success",
            "roadmap_id": roadmap_id,
            "title": roadmap_details["title"],
            "phases": len(phases),
            "timeline": f"{roadmap_details['timeline_months']} months"
        }
    except Exception as e:
        return {"status": "failed", "error": str(e)}


# -----------------------
# CORE FUNCTIONS
# -----------------------
def detect_intents(query: str) -> Tuple[Dict[str, List[str]], Dict[str, float]]:
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


def should_skip_search(structured_intents: Dict) -> bool:
    """Determine if we should skip knowledge base search"""
    for intents in structured_intents.values():
        if any(intent in NO_SEARCH_INTENTS for intent in intents):
            return True
    return False


def is_informational_query(structured_intents: Dict, query: str) -> bool:
    """Check if this is an informational query that should prioritize knowledge search"""
    query_lower = query.lower()
    
    # Question patterns that indicate informational queries
    question_words = ["when", "what", "where", "how", "who", "which", "why"]
    if any(query_lower.startswith(word) for word in question_words):
        return True
    
    # Check if the detected intents are informational
    for intents in structured_intents.values():
        if any(intent in INFORMATIONAL_INTENTS for intent in intents):
            return True
    
    return False


def generate_knowledge_response(query: str, retrieved_docs: List[Dict]) -> str:
    """Generate a natural response based on knowledge base content"""
    if not retrieved_docs:
        return "I couldn't find specific information about that in my knowledge base."
    
    query_lower = query.lower()
    
    # Extract key information and dates from documents
    key_facts = []
    dates_found = []
    deadlines_info = []
    
    for doc in retrieved_docs[:3]:  # Use top 3 most relevant
        text = doc['text']
        
        # Look for date patterns
        date_patterns = [
            r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?\b',
            r'\b\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December)\b',
            r'\b(?:tomorrow|today|next week|this week|next month)\b',
            r'\b\d{1,2}/\d{1,2}/\d{4}\b',
            r'\b\d{1,2}-\d{1,2}-\d{4}\b'
        ]
        
        for pattern in date_patterns:
            dates = re.findall(pattern, text, re.IGNORECASE)
            dates_found.extend(dates)
        
        # Extract deadline information
        if any(word in text.lower() for word in ['deadline', 'due', 'submission', 'submit']):
            deadlines_info.append(text)
        else:
            key_facts.append(text)
    
    # Remove duplicates while preserving order
    dates_found = list(dict.fromkeys(dates_found))
    deadlines_info = list(dict.fromkeys(deadlines_info))
    key_facts = list(dict.fromkeys(key_facts))
    
    # Generate natural responses based on query type
    if "when" in query_lower and any(word in query_lower for word in ["due", "deadline", "submission", "assignment"]):
        if deadlines_info:
            # Extract the most specific deadline information
            best_deadline = deadlines_info[0]
            # Try to extract just the date part for a cleaner response
            date_match = re.search(r'(\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?\b)', best_deadline, re.IGNORECASE)
            if date_match:
                date_str = date_match.group(1)
                return f"Based on my records, the submission is due on {date_str}."
            else:
                return f"According to my information: {best_deadline}"
        elif dates_found:
            return f"I found these relevant dates: {', '.join(dates_found[:2])}."
        else:
            return "I don't see a specific due date mentioned in my records. You might want to check your course materials or ask your instructor."
    
    elif "when" in query_lower:
        if dates_found:
            return f"Based on the information I have: {', '.join(dates_found[:2])}."
        elif key_facts:
            return f"Here's what I found: {key_facts[0]}"
        else:
            return "I couldn't find specific timing information for that."
    
    elif "what" in query_lower or "how" in query_lower:
        if key_facts:
            # Join the first 2 facts naturally
            response = "Based on my knowledge: "
            if len(key_facts) == 1:
                response += key_facts[0]
            else:
                response += key_facts[0] + " Also, " + key_facts[1].lower()
            return response
        else:
            return "I don't have specific information about that in my knowledge base."
    
    elif "where" in query_lower:
        if key_facts:
            location_facts = [fact for fact in key_facts if any(word in fact.lower() for word in ['location', 'place', 'where', 'at'])]
            if location_facts:
                return f"Regarding location: {location_facts[0]}"
        
        if key_facts:
            return f"Here's what I know: {key_facts[0]}"
        else:
            return "I don't have location information for that."
    
    else:
        # General response for other queries
        if key_facts:
            return "I found this information: " + key_facts[0]
        else:
            return "I have some general information: " + retrieved_docs[0]['text']


def execute_intents(query: str, structured_intents: Dict, intent_scores: Dict) -> List[Dict]:
    """Execute detected intents and return results"""
    executed = []
    
    for domain, intents in structured_intents.items():
        for intent in intents:
            if intent == "create_task":
                result = create_firebase_task(query)
                executed.append({"intent": "create_task", "status": result["status"], "details": result})
            
            elif intent in ["add_event", "schedule_meeting"]:
                result = create_firebase_event(query)
                executed.append({"intent": intent, "status": result["status"], "details": result})
            
            elif intent in ["create_reminder", "set_alert"]:
                result = create_firebase_reminder(query)
                executed.append({"intent": intent, "status": result["status"], "details": result})
            
            elif intent in ["gmail_action", "draft_email"]:
                result = handle_gmail_action(query)
                executed.append({"intent": intent, "status": result["status"], "details": result})
            
            else:
                executed.append({"intent": intent, "status": "not_implemented"})
    
    return executed


def format_response(response_text: str, intents_detected: List[Dict], intents_executed: List[Dict], related_content: List[Dict]) -> str:
    """Format output - now without showing raw records"""
    output = []
    
    output.append("response:")
    output.append(response_text)
    
    # REMOVED: No longer showing raw related content to keep responses clean
    
    output.append("\nintents_detected:")
    if intents_detected:
        for item in intents_detected:
            output.append(f"  - {item['intent']}: {item['confidence']:.1%}")
    else:
        output.append("  []")
    
    output.append("\nintents_executed:")
    if intents_executed:
        for item in intents_executed:
            if item['status'] == 'success':
                output.append(f"  ✓ {item['intent']}: {item['status']}")
                if 'details' in item:
                    details = item['details']
                    for key in ['title', 'message', 'priority', 'datetime', 'deadline', 'location', 'attendees']:
                        if key in details:
                            value = details[key]
                            if isinstance(value, list):
                                value = ', '.join(value)
                            output.append(f"    - {key.title()}: {value}")
                    if 'task_id' in details:
                        output.append(f"    - ID: {details['task_id']}")
                    elif 'event_id' in details:
                        output.append(f"    - ID: {details['event_id']}")
                    elif 'reminder_id' in details:
                        output.append(f"    - ID: {details['reminder_id']}")
                    elif 'recipient' in details:
                        # Gmail action
                        output.append(f"    - Action: {details.get('action', 'email')}")
                        output.append(f"    - Recipient: {details['recipient']}")
                        output.append(f"    - Subject: {details['subject']}")
                        if details['status'] == 'drafted':
                            output.append(f"    - Body: {details['body'][:100]}...")
                        if 'original_subject' in details:
                            output.append(f"    - Original: {details['original_subject']}")
            elif item['status'] == 'failed':
                output.append(f"  ✗ {item['intent']}: {item['status']}")
                if 'details' in item and 'error' in item['details']:
                    output.append(f"    - Error: {item['details']['error']}")
            else:
                output.append(f"  - {item['intent']}: {item['status']}")
    else:
        output.append("  []")
    
    return "\n".join(output)


# -----------------------
# MAIN AGENT
# -----------------------


# -----------------------
# EMAIL INTERFACE - MAIN EXECUTION
# -----------------------
def email_interface():
    """Interactive email interface similar to your example."""
    print("📧 Welcome to Dynamic Email Manager!")
    print("Commands: 'inbox', 'reply', 'draft', 'send', 'quit'")
    print("="*50)
    
    while True:
        try:
            command = input("\n📧 Enter command (inbox/reply/draft/send/quit): ").strip().lower()
            
            if command == "quit":
                print("👋 Goodbye!")
                break
                
            elif command == "inbox":
                emails = fetch_gmail(limit=10)
                if not emails:
                    print("📭 No emails found.")
                    continue
                
                print(f"\n📧 Found {len(emails)} emails:")
                for i, mail in enumerate(emails, 1):
                    print(f"\n--- Email {i} ---")
                    print(f"From: {mail['from']}")
                    print(f"Subject: {mail['subject']}")
                    print(f"Preview: {mail['body'][:120]}...")
                    print(f"Date: {mail['date']}")
                
            elif command == "reply":
                emails = fetch_gmail(limit=5)
                if not emails:
                    print("📭 No emails found to reply to.")
                    continue
                
                print("\n📧 Recent emails to reply to:")
                for i, mail in enumerate(emails, 1):
                    print(f"{i}. From: {mail['from']} | Subject: {mail['subject'][:30]}...")
                
                try:
                    choice = int(input("Select email number to reply to: ")) - 1
                    if 0 <= choice < len(emails):
                        selected_email = emails[choice]
                        
                        print(f"\nReplying to: {selected_email['subject']}")
                        user_name = input("Your name (default: Assistant): ").strip() or "Assistant"
                        reply_message = input("Your reply message: ").strip()
                        
                        if reply_message:
                            sender_email = extract_email_address(selected_email['from'])
                            if sender_email:
                                result = send_dynamic_reply(
                                    to_email=sender_email,
                                    subject=selected_email['subject'],
                                    original_body=selected_email['body'],
                                    user_message=reply_message,
                                    user_name=user_name
                                )
                                
                                if result['status'] == 'success':
                                    print(f"✅ Reply sent to {sender_email}")
                                else:
                                    print(f"❌ Failed to send reply: {result.get('error', 'Unknown error')}")
                            else:
                                print("❌ Could not extract sender email address.")
                        else:
                            print("❌ No reply message provided.")
                    else:
                        print("❌ Invalid email selection.")
                except (ValueError, IndexError):
                    print("❌ Invalid selection.")
                    
            elif command == "draft":
                print("\n📝 Create Email Draft")
                to_email = input("Recipient email: ").strip()
                subject = input("Subject: ").strip()
                body = input("Message body: ").strip()
                user_name = input("Your name (default: Assistant): ").strip() or "Assistant"
                
                if to_email and subject and body:
                    draft = create_email_draft(to_email, subject, body, user_name)
                    print(f"\n✅ Draft created:")
                    print(f"To: {draft['recipient']}")
                    print(f"Subject: {draft['subject']}")
                    print(f"Body:\n{draft['body']}")
                    
                    send_now = input("\nSend this email now? (y/n): ").strip().lower()
                    if send_now == 'y':
                        result = send_gmail(draft['recipient'], draft['subject'], draft['body'])
                        if result['status'] == 'success':
                            print("✅ Email sent successfully!")
                        else:
                            print(f"❌ Failed to send: {result.get('error', 'Unknown error')}")
                else:
                    print("❌ All fields are required.")
                    
            elif command == "send":
                print("\n📤 Send Email")
                to_email = input("Recipient email: ").strip()
                subject = input("Subject: ").strip()
                body = input("Message body: ").strip()
                user_name = input("Your name (default: Assistant): ").strip() or "Assistant"
                
                if to_email and subject and body:
                    # Format the body
                    formatted_body = (
                        f"Hi,\n\n"
                        f"{body}\n\n"
                        f"Best regards,\n{user_name}"
                    )
                    
                    result = send_gmail(to_email, subject, formatted_body)
                    if result['status'] == 'success':
                        print(f"✅ Email sent to {to_email}")
                    else:
                        print(f"❌ Failed to send: {result.get('error', 'Unknown error')}")
                else:
                    print("❌ All fields are required.")
                    
            else:
                print("❌ Unknown command. Use: inbox, reply, draft, send, quit")
                
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}")


def test_email_functions():
    """Test the enhanced email functions."""
    print("🧪 Testing Email Functions")
    print("="*30)
    
    # Test 1: Chat-based email processing
    test_messages = [
        "draft email to john@example.com subject Meeting Update saying We need to reschedule our meeting to next week",
        "send email to sarah@company.com about Project Status saying The project is on track and will be delivered on time",
        "reply to latest email saying Thank you for your message, I'll get back to you soon"
    ]
    
    print("\n📝 Testing chat-based email processing:")
    for i, message in enumerate(test_messages, 1):
        print(f"\nTest {i}: {message}")
        result = process_email_from_chat(message, user_name="Test User")
        print(f"Result: {result['status']}")
        if result['status'] != 'failed':
            print(f"Action: {result.get('action', 'unknown')}")
            if 'recipient' in result:
                print(f"To: {result['recipient']}")
            if 'subject' in result:
                print(f"Subject: {result['subject']}")
    
    # Test 2: Email summary
    print(f"\n📧 Testing email summary:")
    summary = get_email_summary_for_chat(limit=3)
    print(f"Status: {summary['status']}")
    if summary['status'] == 'success':
        print(f"Found {summary['email_count']} emails")


if __name__ == "__main__":
    print("📧 Dynamic Email Manager with Chat Integration")
    print("="*50)
    
    choice = input("Choose mode:\n1. Interactive Email Interface\n2. Test Functions\n3. Regular Chat Interface\nEnter choice (1/2/3): ").strip()
    
    if choice == "1":
        email_interface()
    elif choice == "2":
        test_email_functions()
    elif choice == "3":
        interactive_agent()  # Original interactive function
    else:
            print("Invalid choice. Starting email interface...")
            email_interface()

def interactive_agent():
    """Original interactive agent function."""
    print("\n" + "="*70)
    print("🚀 AI Agent with Natural Knowledge Responses")
    print("="*70)
    print(f"\n📊 Database: {collection.count()} documents")
    print("✓ Supported: create_task, schedule_meeting, add_event, create_reminder")
    print("✓ Knowledge: Natural responses from ChromaDB (no raw records)")
    print("\nType 'exit' to quit\n")
    
    while True:
        try:
            query = input("\n💬 Query: ").strip()
            
            if query.lower() == "exit":
                print("\n👋 Goodbye!")
                break
            
            if not query:
                continue
            
            print("\n" + "="*70)
            
            # Detect intents - returns a tuple
            structured_intents, intent_scores = detect_intents(query)
            
            intents_detected = []
            for domain, intents in structured_intents.items():
                for intent in intents:
                    intents_detected.append({
                        "intent": intent,
                        "confidence": intent_scores.get(intent, 0)
                    })
            
            # Check if this is an informational query
            is_informational = is_informational_query(structured_intents, query)
            
            # Check if we should skip search for action-oriented queries
            skip_search = should_skip_search(structured_intents)
            
            # Execute intents
            intents_executed = []
            retrieved_docs = []
            
            if structured_intents:
                intents_executed = execute_intents(query, structured_intents, intent_scores)
                
                success_count = sum(1 for item in intents_executed if item['status'] == 'success')
                failed_count = sum(1 for item in intents_executed if item['status'] == 'failed')
                
                # Always search for informational queries, even if intents are detected
                if is_informational or not skip_search:
                    retrieved_docs = semantic_search(query, top_k=3)
                
                if success_count > 0:
                    response_text = "Intent(s) executed successfully."
                    if retrieved_docs and is_informational:
                        # For informational queries with successful actions, still show knowledge
                        response_text = generate_knowledge_response(query, retrieved_docs)
                elif failed_count > 0:
                    response_text = "Intent execution failed. Check details below."
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
            
            output = format_response(response_text, intents_detected, intents_executed, retrieved_docs)
            print(output)
            print("="*70)
            
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()
        continue


# Original main execution - now moved to prevent conflicts