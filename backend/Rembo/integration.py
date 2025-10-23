import os
import json
import re
import requests
import imaplib
import email
from email.header import decode_header
from datetime import datetime, timezone
import schedule
import time
from dotenv import load_dotenv

# -----------------------
# LOAD ENV
# -----------------------
load_dotenv()
SLACK_TOKEN = os.getenv("SLACK_TOKEN")
GITHUB_PAT = os.getenv("GITHUB_PAT")
EMAIL = os.getenv("EMAIL")
APP_PASSWORD = os.getenv("APP_PASSWORD")

# -----------------------
# CONFIG
# -----------------------
SLACK_CHANNEL_IDS = ["C09NZHCCPG8", "C09MYGLPA3D"]
GITHUB_OWNER = "tensorflow"
GITHUB_REPO = "tensorflow"
GITHUB_HEADERS = {"Authorization": f"token {GITHUB_PAT}"} if GITHUB_PAT else {}
POLL_INTERVAL_SLACK = 30
POLL_INTERVAL_GIT_GMAIL = 120

# -----------------------
# GO ONE DIRECTORY UP & FIND DATA FOLDER
# -----------------------
os.chdir('..')
data_folder = None
for root, dirs, _ in os.walk('.'):
    if 'data' in dirs:
        data_folder = os.path.join(root, 'data')
        break
if not data_folder:
    raise FileNotFoundError("No 'data' folder found. Create a 'data' folder in your project.")

STORE_FILE = os.path.join(data_folder, "slack_docs_data.json")  # just the single unified file

# -----------------------
# HELPERS
# -----------------------
user_cache = {}

def get_slack_user_name(user_id):
    if user_id in user_cache:
        return user_cache[user_id]
    url = f"https://slack.com/api/users.info?user={user_id}"
    headers = {"Authorization": f"Bearer {SLACK_TOKEN}"}
    r = requests.get(url, headers=headers)
    data = r.json()
    user_name = data.get("user", {}).get("real_name", user_id) if data.get("ok") else user_id
    user_cache[user_id] = user_name
    return user_name

def clean_text(text):
    if not text:
        return ""
    text = re.sub(r"<@[\w]+>", "", text)
    text = re.sub(r":\w+:", "", text)
    text = re.sub(r"[#*`]", "", text)
    text = re.sub(r"\n+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def append_data_to_file(new_data):
    if not os.path.exists(data_folder):
        os.makedirs(data_folder)

    if os.path.exists(STORE_FILE):
        with open(STORE_FILE, "r", encoding="utf-8") as f:
            try:
                existing = json.load(f)
                if not isinstance(existing, list):
                    existing = []
            except json.JSONDecodeError:
                existing = []
        existing.extend(new_data)
        new_data = existing

    with open(STORE_FILE, "w", encoding="utf-8") as f:
        json.dump(new_data, f, indent=4, ensure_ascii=False)

    print(f"✅ Appended {len(new_data)} items to {STORE_FILE} at {datetime.now(timezone.utc).isoformat()}")

# -----------------------
# FETCH FUNCTIONS
# -----------------------
def fetch_slack():
    all_messages = []
    for channel_id in SLACK_CHANNEL_IDS:
        url = f"https://slack.com/api/conversations.history?channel={channel_id}"
        headers = {"Authorization": f"Bearer {SLACK_TOKEN}"}
        r = requests.get(url, headers=headers)
        data = r.json()
        if not data.get("ok"):
            print(f"❌ Slack error {channel_id}: {data.get('error')}")
            continue
        for msg in data.get("messages", []):
            text = clean_text(msg.get("text"))
            if not text:
                continue
            user_name = get_slack_user_name(msg.get("user"))
            all_messages.append({
                "source": "Slack",
                "channel_id": channel_id,
                "user": user_name,
                "timestamp": datetime.fromtimestamp(float(msg.get("ts")), tz=timezone.utc).isoformat(),
                "text": text
            })
    return all_messages

def fetch_github():
    gh_data = []
    try:
        issues = requests.get(f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/issues",
                              headers=GITHUB_HEADERS).json()
        if isinstance(issues, dict) and issues.get("message"):
            print(f"❌ GitHub API error: {issues['message']}")
            return []
        if not isinstance(issues, list):
            print("❌ Unexpected GitHub response")
            return []

        for issue in issues:
            if "pull_request" in issue:
                continue
            text_body = clean_text(issue.get("body", ""))
            gh_data.append({
                "source": "GitHub",
                "user": issue["user"]["login"],
                "timestamp": issue["created_at"],
                "title": clean_text(issue["title"]),
                "text": text_body
            })
            comments = requests.get(issue["comments_url"], headers=GITHUB_HEADERS).json()
            for c in comments if isinstance(comments, list) else []:
                c_body = clean_text(c.get("body", ""))
                if c_body:
                    gh_data.append({
                        "source": "GitHub",
                        "user": c["user"]["login"],
                        "timestamp": c["created_at"],
                        "title": f"Comment on #{issue['number']}",
                        "text": c_body
                    })
        return gh_data
    except Exception as e:
        print(f"❌ GitHub fetch error: {e}")
        return []

def fetch_gmail():
    emails_data = []
    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(EMAIL, APP_PASSWORD)
        mail.select("inbox")
        status, messages = mail.search(None, "ALL")
        email_ids = messages[0].split()[-10:]

        for num in email_ids:
            _, data = mail.fetch(num, "(RFC822)")
            msg = email.message_from_bytes(data[0][1])
            subject, encoding = decode_header(msg["Subject"])[0]
            if isinstance(subject, bytes):
                subject = subject.decode(encoding or "utf-8", errors="ignore")
            from_ = msg.get("From", "")
            date_ = msg.get("Date", "")

            body = ""
            if msg.is_multipart():
                for part in msg.walk():
                    if part.get_content_type() == "text/plain" and "attachment" not in str(part.get("Content-Disposition")):
                        try:
                            body = part.get_payload(decode=True).decode()
                            break
                        except:
                            pass
            else:
                body = msg.get_payload(decode=True).decode(errors="ignore")

            body = re.sub(r"\r|\n+", " ", body)
            body = re.sub(r"http\S+", "", body)
            body = re.sub(r"={2,}", "", body)
            body = re.sub(r"\s+", " ", body).strip()

            emails_data.append({
                "source": "Gmail",
                "from": from_,
                "subject": subject,
                "body": body[:1000],
                "date": date_
            })

        mail.close()
        mail.logout()
    except Exception as e:
        print(f"❌ Gmail fetch error: {e}")

    return emails_data

# -----------------------
# JOB FUNCTIONS
# -----------------------
def job_fetch_all():
    all_data = []
    all_data.extend(fetch_slack())
    all_data.extend(fetch_github())
    all_data.extend(fetch_gmail())
    append_data_to_file(all_data)

# -----------------------
# SCHEDULE
# -----------------------
schedule.every(POLL_INTERVAL_SLACK).seconds.do(job_fetch_all)
schedule.every(POLL_INTERVAL_GIT_GMAIL).seconds.do(job_fetch_all)

print(f"🚀 Polling all sources. Slack every {POLL_INTERVAL_SLACK}s, GitHub + Gmail every {POLL_INTERVAL_GIT_GMAIL}s...")

# Initial run
job_fetch_all()

while True:
    schedule.run_pending()
    time.sleep(1)
