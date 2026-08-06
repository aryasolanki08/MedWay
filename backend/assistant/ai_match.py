"""Free-text symptom understanding via Google Gemini's free API tier.

This is a CLASSIFIER ONLY: given the user's free-text description, it picks
matching keys from our fixed, pharmacist-reviewed REFERENCE_DATA keyword
list -- e.g. "loose motion" -> "diarrhea". It is never asked to name a
medicine, suggest a dose, or generate any medical advice; the model literally
cannot introduce anything outside the existing keyword list. Every real
medicine shown afterwards still comes from catalog.search_medicine's
salt-pivoted, price-ascending database lookup, same as the rest of the app.

If GEMINI_API_KEY isn't set, or the API call fails for any reason (offline,
rate-limited, bad response), this returns an empty list and the assistant
silently falls back to plain keyword matching -- AI is an enhancement, never
a dependency.
"""

import json
import logging
import re
import time
import urllib.error
import urllib.request

from django.conf import settings

logger = logging.getLogger(__name__)

# gemini-2.5-flash has an unusually tight free-tier quota on this project
# (20 requests/day) and gets exhausted fast during normal use/testing.
# gemini-flash-latest tracks quota separately and has held up better in
# practice -- if this one also starts erroring, check
# https://ai.dev/rate-limit for current usage.
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-flash-latest:generateContent"
)

_JSON_ARRAY_RE = re.compile(r"\[.*\]", re.DOTALL)


def _call_gemini(prompt, api_key):
    # NOTE: thinkingConfig (used to disable "thinking" tokens on
    # gemini-2.5-flash) is deliberately omitted -- gemini-flash-latest
    # currently resolves to a model that 400s on that field, and its
    # "thinking" spend varies per request (seen 0-290+ tokens), so
    # maxOutputTokens needs real headroom above the actual answer size
    # rather than trying to zero thinking out.
    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0,
            "maxOutputTokens": 600,
        },
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{GEMINI_URL}?key={api_key}",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=8) as resp:
        data = json.load(resp)
    return data["candidates"][0]["content"]["parts"][0]["text"]


def ai_match_keywords(text, known_keywords):
    api_key = getattr(settings, "GEMINI_API_KEY", "")
    if not api_key or not text.strip():
        return []

    keyword_list = ", ".join(sorted(known_keywords))
    prompt = (
        "You are a strict text classifier for a pharmacy app. Below is a "
        "FIXED list of allowed category keys. Read the user's description "
        "and return ONLY the keys from this exact list that match what "
        "they're describing. Never invent a key that isn't in the list. "
        "Never output a medicine name, dosage, or any advice -- only keys "
        "from the list. If nothing matches, return an empty array.\n\n"
        f"Allowed keys: {keyword_list}\n\n"
        f'User description: "{text}"\n\n'
        "Respond with ONLY a JSON array of matching keys, nothing else. "
        'Example: ["fever", "headache"]'
    )

    # The free tier for this model is occasionally flaky -- transient 429s,
    # and sometimes (rarely) the model echoes the prompt's keyword list back
    # instead of classifying. Retry the FULL call+parse cycle, not just the
    # network call, so a bad-quality response gets another shot too --
    # cheap, and meaningfully improves reliability for a user-facing feature
    # that would otherwise silently fall back to "no match".
    for attempt in range(2):
        raw = None
        try:
            raw = _call_gemini(prompt, api_key)
        except urllib.error.HTTPError as e:
            logger.warning("Gemini API error %s (attempt %d): %s", e.code, attempt, e.read().decode(errors="replace")[:500])
        except (urllib.error.URLError, TimeoutError, KeyError, IndexError, json.JSONDecodeError) as e:
            logger.warning("Gemini API call failed (attempt %d): %r", attempt, e)

        if raw is not None:
            match = _JSON_ARRAY_RE.search(raw)
            if match:
                try:
                    keys = json.loads(match.group(0))
                except json.JSONDecodeError:
                    keys = None
                if isinstance(keys, list):
                    # Never trust the model's output blindly -- only keep
                    # keys actually in our fixed, reviewed list.
                    return [k for k in keys if isinstance(k, str) and k in known_keywords]
            logger.warning("Gemini response had no usable JSON array (attempt %d): %r", attempt, raw[:300])

        if attempt == 0:
            time.sleep(0.6)

    return []
