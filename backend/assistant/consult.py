"""Turns real-catalog matches into a short spoken-style "doctor consult"
script for the frontend's voice + avatar UI.

Two layers, same as ai_match.py's existing pattern:
  1. build_facts() -- pulls a specific real nearby pharmacy + real price
     per matched salt from the live database. Zero AI involved here.
  2. build_script() -- hands ONLY those facts to an LLM and asks it to
     phrase them as a warm, spoken script. The model is a phrasing layer,
     never a source of medicines, prices, or pharmacies -- it cannot
     mention anything not already in `facts`. Tries Gemini first (free
     tier, but quota-limited to 20 req/day on this project -- see
     ai_match.py), then Grok if a GROK_API_KEY is configured, then falls
     back to a deterministic template built from the same facts --
     always functional, AI is strictly an enhancement.
"""

import json
import logging
import urllib.error
import urllib.request

from django.conf import settings

from pharmacies.models import MedicineStock

logger = logging.getLogger(__name__)

GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-flash-latest:generateContent"
)
GROK_URL = "https://api.x.ai/v1/chat/completions"


def _pharmacy_option_for_salt(salt_group, area):
    """Cheapest branded and cheapest generic in-stock option for this
    salt, preferring the caller's area (falls back to citywide if that
    area has no stock) -- a real pharmacy name/price pair, not an
    estimate.
    """
    medicine_ids = [m["medicine_id"] for m in salt_group["medicines"]]
    stocks = MedicineStock.objects.filter(
        medicine_id__in=medicine_ids, quantity__gt=0
    ).select_related("medicine", "pharmacy")

    if area:
        in_area = stocks.filter(pharmacy__area__iexact=area)
        if in_area.exists():
            stocks = in_area

    def cheapest(is_generic):
        s = stocks.filter(medicine__is_generic=is_generic).order_by("price").first()
        if not s:
            return None
        return {
            "brand_name": s.medicine.brand_name,
            "price": float(s.price),
            "pharmacy_name": s.pharmacy.name,
            "pharmacy_area": s.pharmacy.area or None,
        }

    branded = cheapest(False)
    generic = cheapest(True)
    savings = None
    if branded and generic and branded["price"] > generic["price"]:
        savings = round(branded["price"] - generic["price"], 2)

    if not branded and not generic:
        return None

    return {
        "salt_name": salt_group["salt_name"],
        "branded": branded,
        "generic": generic,
        "savings_rupees": savings,
    }


def build_facts(matches, area):
    """Grounded facts only -- every field here traces back to a real DB
    row. This is the ONLY data the script generator (AI or fallback) is
    allowed to reference.
    """
    facts = []
    for match in matches:
        options = [
            opt for opt in (
                _pharmacy_option_for_salt(g, area) for g in match.get("salt_groups", [])
            ) if opt
        ]
        facts.append({
            "category": match["category"],
            "info": match["info"],
            "options": options,
        })
    return facts


def _fallback_script(query_text, facts):
    lines = []
    if query_text:
        lines.append(f"I hear that you're dealing with: {query_text}.")
    for f in facts:
        lines.append(f["info"])
        for opt in f["options"]:
            if opt["generic"]:
                lines.append(
                    f"For {opt['salt_name']}, {opt['generic']['brand_name']} is available at "
                    f"{opt['generic']['pharmacy_name']} for ₹{opt['generic']['price']:.2f}."
                )
                if opt["savings_rupees"]:
                    lines.append(
                        f"That's ₹{opt['savings_rupees']:.2f} cheaper than the branded option, "
                        f"{opt['branded']['brand_name']} at {opt['branded']['pharmacy_name']} "
                        f"for ₹{opt['branded']['price']:.2f}."
                    )
            elif opt["branded"]:
                lines.append(
                    f"For {opt['salt_name']}, {opt['branded']['brand_name']} is available at "
                    f"{opt['branded']['pharmacy_name']} for ₹{opt['branded']['price']:.2f}."
                )
    if not any(f["options"] for f in facts):
        lines.append(
            "I don't have a specific in-stock medicine to point you to for this right now -- "
            "please check with a nearby pharmacist."
        )
    lines.append(
        "This is general AI-generated guidance from our own catalog data, not a diagnosis -- "
        "please see a real doctor or pharmacist if this is serious or doesn't improve."
    )
    return " ".join(lines)


def _call_gemini(prompt, api_key):
    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 500,
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
    return data["candidates"][0]["content"]["parts"][0]["text"].strip()


def _call_grok(prompt, api_key):
    payload = json.dumps({
        "model": "grok-4",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.4,
        "max_tokens": 500,
    }).encode("utf-8")

    req = urllib.request.Request(
        GROK_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=8) as resp:
        data = json.load(resp)
    return data["choices"][0]["message"]["content"].strip()


def _build_prompt(query_text, facts):
    facts_json = json.dumps(facts, indent=2)
    return (
        "You are voicing a short, warm spoken script for a pharmacy app's AI voice "
        "consult feature, as if a caring doctor is talking directly to the patient. "
        "You may ONLY reference the medicines, prices, and pharmacies listed in the "
        "JSON facts below -- never invent a medicine, price, pharmacy name, or dosage "
        "that isn't in this data. The branded and generic options for the same salt "
        "may be at DIFFERENT pharmacies -- always use each option's own pharmacy_name, "
        "never assume they're the same place. If a category has no 'options', just give "
        "the general caution info for it and tell them to check with a pharmacist.\n\n"
        f'Patient described: "{query_text}"\n\n'
        f"Facts (JSON):\n{facts_json}\n\n"
        "Write 110-170 words of flowing spoken sentences, second person ('you'), no "
        "markdown, no bullet points, no headers. Structure: acknowledge what they "
        "described, give the relevant caution/general info, recommend ONE specific "
        "real medicine with its real pharmacy name and price, mention the generic "
        "alternative and exact rupee savings if one exists, then close with a brief "
        "reminder that this is general AI-generated guidance from the app's own data, "
        "not a diagnosis, and to see a real doctor or pharmacist for anything serious."
    )


def build_script(query_text, facts):
    """Returns (script_text, ai_generated). Tries Gemini first, then Grok
    if configured, phrasing ONLY the given facts as a spoken doctor-style
    script; falls back to a deterministic template built from those same
    facts if every configured provider fails or none is configured.
    """
    prompt = _build_prompt(query_text, facts)

    gemini_key = getattr(settings, "GEMINI_API_KEY", "")
    if gemini_key:
        try:
            text = _call_gemini(prompt, gemini_key)
            if text:
                return text, True
        except urllib.error.HTTPError as e:
            logger.warning("Gemini consult script error %s: %s", e.code, e.read().decode(errors="replace")[:500])
        except (urllib.error.URLError, TimeoutError, KeyError, IndexError, json.JSONDecodeError) as e:
            logger.warning("Gemini consult script call failed: %r", e)

    grok_key = getattr(settings, "GROK_API_KEY", "")
    if grok_key:
        try:
            text = _call_grok(prompt, grok_key)
            if text:
                return text, True
        except urllib.error.HTTPError as e:
            logger.warning("Grok consult script error %s: %s", e.code, e.read().decode(errors="replace")[:500])
        except (urllib.error.URLError, TimeoutError, KeyError, IndexError, json.JSONDecodeError) as e:
            logger.warning("Grok consult script call failed: %r", e)

    return _fallback_script(query_text, facts), False
