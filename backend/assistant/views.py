from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from . import consult
from .matching import match_symptom
from .reference_data import DISCLAIMER


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def assistant_query(request):
    """Looks up the user's free-text symptom description against a static,
    pharmacist-reviewable reference table, then resolves each matched
    category's salts against the REAL catalog database -- actual brand/
    generic medicines and their actual current cheapest price, not a
    canned list. This intentionally does NOT call a trained model to
    "decide" what a user should take -- it returns general category
    information plus real available options, a disclaimer, and a
    nearby-help CTA.
    """
    text = (request.data.get("symptom") or "").strip().lower()
    if not text:
        return Response({"detail": "symptom text is required"}, status=400)

    matches = match_symptom(text)

    if not matches:
        matches = [{
            "category": "General",
            "info": (
                "We don't have specific information for this in our "
                "reference list. Please consult a pharmacist or doctor."
            ),
            "salt_groups": [],
        }]

    return Response(
        {
            "query": request.data.get("symptom", "").strip(),
            "matches": matches,
            "disclaimer": DISCLAIMER,
            "find_help_cta": "/api/pharmacies/nearby/",
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def assistant_consult(request):
    """Same real-catalog grounding as assistant_query, but additionally
    picks a specific real nearby pharmacy per matched salt (in the
    caller's area when known) and asks an LLM to turn those grounded
    facts into a short, warm, spoken-style script -- for the frontend to
    read aloud over an animated avatar. The model is never given room to
    invent a medicine, price, or pharmacy; see consult.build_script.
    """
    text = (request.data.get("symptom") or "").strip().lower()
    if not text:
        return Response({"detail": "symptom text is required"}, status=400)

    area = (request.data.get("area") or getattr(request.user, "area", "") or "").strip()

    matches = match_symptom(text)
    facts = consult.build_facts(matches, area)
    script, ai_generated = consult.build_script(request.data.get("symptom", "").strip(), facts)

    return Response(
        {
            "query": request.data.get("symptom", "").strip(),
            "script": script,
            "ai_generated": ai_generated,
            "facts": facts,
            "disclaimer": DISCLAIMER,
        }
    )
