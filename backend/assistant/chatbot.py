"""General-purpose "Ask anything" chatbot using Google Gemini's free API tier.

Unlike ai_match.py (a strict keyword classifier that can only return keys
from a fixed list), this powers the navbar's "Ask anything" button -- a
free-form chat the logged-in user can open from anywhere in the app. It
still isn't a medical-advice generator: the system instruction below tells
the model to nudge the user toward a pharmacist/doctor for anything
diagnosis/dosage/treatment-specific, but (unlike ai_match.py) that isn't
mechanically enforced on the output here.

If GEMINI_API_KEY isn't set, or the call fails for any reason, ask_gemini
returns a clear error message instead of raising -- the view below turns
that into a normal JSON error response.
"""

import json
import logging
import urllib.error
import urllib.request

from django.conf import settings

logger = logging.getLogger(__name__)

# Same model as ai_match.py -- see that file's comment re: free-tier quota
# behavior on gemini-2.5-flash vs gemini-flash-latest.
GEMINI_CHAT_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-flash-latest:generateContent"
)

SYSTEM_INSTRUCTION = (
    "You are the 'Ask anything' assistant inside MedWay, a pharmacy / "
    "medicine delivery web app. Answer the user's question helpfully and "
    "concisely, in plain text (no markdown headers or tables). You may "
    "discuss general health, medicine, and app-usage topics, but you are "
    "not a doctor: for anything specific to diagnosing, dosing, or "
    "treating one person, briefly remind them to check with a pharmacist "
    "or doctor rather than acting on your answer alone."
)

# Trims a long-running conversation before sending it back to Gemini each
# turn (we're stateless server-side -- the frontend resends prior turns).
MAX_HISTORY_MESSAGES = 12


def _build_contents(message, history):
    contents = []
    for turn in (history or [])[-MAX_HISTORY_MESSAGES:]:
        role = "model" if turn.get("role") == "assistant" else "user"
        text = (turn.get("text") or "").strip()
        if text:
            contents.append({"role": role, "parts": [{"text": text}]})
    contents.append({"role": "user", "parts": [{"text": message}]})
    return contents


def ask_gemini(message, history=None):
    """Returns (reply_text, error_message) -- exactly one of them is set."""
    api_key = getattr(settings, "GEMINI_API_KEY", "")
    if not api_key:
        return None, "Chatbot isn't configured on the server yet (missing GEMINI_API_KEY)."

    message = (message or "").strip()
    if not message:
        return None, "Message is required."

    payload = json.dumps({
        "system_instruction": {"parts": [{"text": SYSTEM_INSTRUCTION}]},
        "contents": _build_contents(message, history),
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 512,
        },
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{GEMINI_CHAT_URL}?key={api_key}",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.load(resp)
        reply = data["candidates"][0]["content"]["parts"][0]["text"]
        return reply.strip(), None
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")[:500]
        logger.warning("Gemini chat API error %s: %s", e.code, body)
        if e.code == 429:
            return None, "We've hit the free chatbot usage limit for now. Please wait a minute and try again."
        return None, "The assistant is temporarily unavailable. Please try again."
    except (urllib.error.URLError, TimeoutError, KeyError, IndexError, json.JSONDecodeError) as e:
        logger.warning("Gemini chat API call failed: %r", e)
        return None, "The assistant is temporarily unavailable. Please try again."