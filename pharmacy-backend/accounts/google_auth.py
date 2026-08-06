"""Real "Sign in with Google" -- verifies the ID token Google's own
Identity Services JS library hands back to the frontend, using Google's
public certs (via the google-auth library, not a hand-rolled JWT check).
Never trusts a token without verifying its signature and audience.
Mirrors the customer portal's accounts/google_auth.py; adapted here
because this portal keys Google identity off StaffUser.google_sub
instead of a field on the user model directly (see StaffUser docstring).
"""

from django.conf import settings
from django.contrib.auth.models import User
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token


class GoogleTokenError(Exception):
    pass


def verify_google_token(credential):
    if not settings.GOOGLE_CLIENT_ID:
        raise GoogleTokenError("Google sign-in isn't configured on this server.")
    try:
        payload = google_id_token.verify_oauth2_token(
            credential, google_requests.Request(), settings.GOOGLE_CLIENT_ID
        )
    except ValueError as e:
        raise GoogleTokenError(f"Invalid Google credential: {e}")

    if payload.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        raise GoogleTokenError("Invalid token issuer.")
    if not payload.get("email_verified", False):
        raise GoogleTokenError("Google account email isn't verified.")
    return payload


def unique_username_from_email(email):
    base = (email.split("@")[0] if email else "google_user") or "google_user"
    base = "".join(c for c in base if c.isalnum() or c in "._-") or "google_user"
    username = base
    suffix = 1
    while User.objects.filter(username=username).exists():
        suffix += 1
        username = f"{base}{suffix}"
    return username
