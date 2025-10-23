import requests
import json
from datetime import datetime, timezone
import re
import schedule
import time
import imaplib
import email
from email.header import decode_header
from dotenv import load_dotenv
import os

load_dotenv()

# -----------------------
# CONFIG
# -----------------------
SLACK_TOKEN = os.getenv("SLACK_TOKEN")
SLACK_CHANNEL_IDS = ["C09NZHCCPG8", "C09MYGLPA3D"]

GITHUB_OWNER = "tensorflow"
GITHUB_REPO = "tensorflow"
GITHUB_PAT = os.getenv("GITHUB_PAT")
GITHUB_HEADERS = {"Authorization": f"token {GITHUB_PAT}"} if GITHUB_PAT else {}

EMAIL = os.getenv("EMAIL")
APP_PASSWORD = os.getenv("APP_PASSWORD")

POLL_INTERVAL = 30  # seconds
MERGED_FILE = "merged_data.json"

# -----------------------
# USER CACHE
# -----------------------
user_cache = {}

def get_slack_user_name(user_id):
    if user_id in user_cache:
        return user_cache[user_id]
    url = f"https://slack.com/api/users.info?user={user_id}"
    headers = {"Authorization": f"Bearer {SLACK_TOKEN}"}
    r = requests.get(url, headers=headers)
    data = r.json()
    if data.get("ok"):
        user_name = data["user"]["real_name"]
    else:
        user_name = user_id
    user_cache[user_id] = user_name
    return user_name

# -----------------------
# CLEAN TEXT
# -----------------------
def clean_text(text):
    if not text:
        return ""
    text = re.sub(r"<@[\w]+>", "", text)
    text = re.sub(r":\w+:", "", text)
    text = re.sub(r"[#*`]", "", text)
    text = re.sub(r"\n+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

# -----------------------
# FETCH SLACK
# -----------------------
def fetch_slack():
    all_messages = []
    for channel_id in SLACK_CHANNEL_IDS:
        url = f"https://slack.com/api/conversations.history?channel={channel_id}"
        headers = {"Authorization": f"Bearer {SLACK_TOKEN}"}
        r = requests.get(url, headers=headers)
        data = r.json()
        if not data.get("ok"):
            print(f"❌ Error fetching Slack channel {channel_id}: {data.get('error')}")
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

# -----------------------
# FETCH GITHUB
# -----------------------
def fetch_github():
    gh_data = []
    issues_url = f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/issues"
    try:
        r = requests.get(issues_url, headers=GITHUB_HEADERS)
        issues = r.json()
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
            comments_r = requests.get(issue["comments_url"], headers=GITHUB_HEADERS)
            comments = comments_r.json()
            if isinstance(comments, list):
                for c in comments:
                    c_body = clean_text(c.get("body", ""))
                    if not c_body:
                        continue
                    gh_data.append({
                        "source": "GitHub",
                        "user": c["user"]["login"],
                        "timestamp": c["created_at"],
                        "title": f"Comment on #{issue['number']}",
                        "text": c_body
                    })
        return gh_data
    except Exception as e:
        print(f"❌ Error fetching GitHub: {e}")
        return []

# -----------------------
# FETCH GMAIL
# -----------------------
def fetch_gmail():
    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(EMAIL, APP_PASSWORD)
        mail.select("inbox")
        status, messages = mail.search(None, "ALL")
        email_ids = messages[0].split()[-10:]
        emails_data = []

        for num in email_ids:
            _, data = mail.fetch(num, "(RFC822)")
            raw_email = data[0][1]
            msg = email.message_from_bytes(raw_email)

            subject, encoding = decode_header(msg["Subject"])[0]
            if isinstance(subject, bytes):
                subject = subject.decode(encoding or "utf-8", errors="ignore")

            from_ = msg.get("From", "")
            date_ = msg.get("Date", "")

            body = ""
            if msg.is_multipart():
                for part in msg.walk():
                    content_type = part.get_content_type()
                    content_disposition = str(part.get("Content-Disposition"))
                    if content_type == "text/plain" and "attachment" not in content_disposition:
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
        return emails_data

    except Exception as e:
        print(f"❌ Error fetching Gmail: {e}")
        return []

# -----------------------
# MERGE ALL
# -----------------------
def merge_all():
    slack_data = fetch_slack()
    github_data = fetch_github()
    gmail_data = fetch_gmail()
    all_data = {
        "slack": slack_data,
        "github": github_data,
        "gmail": gmail_data
    }
    return all_data

# -----------------------
# SAVE JSON
# -----------------------
def save_json(data, filename=MERGED_FILE):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    print(f"✅ JSON updated at {datetime.now(timezone.utc).isoformat()}")

# -----------------------
# JOB
# -----------------------
def job():
    merged = merge_all()
    save_json(merged)

# -----------------------
# SCHEDULE
# -----------------------
schedule.every(POLL_INTERVAL).seconds.do(job)
print(f"🚀 Polling Slack + GitHub + Gmail every {POLL_INTERVAL} seconds...")

# Initial run
job()

while True:
    schedule.run_pending()
    time.sleep(1)