"""Real "Sign in with Google" -- verifies the ID token Google's own
Identity Services JS library hands back to the frontend, using Google's
public certs (via the google-auth library, not a hand-rolled JWT check).
Never trusts a token without verifying its signature and audience.
"""

from django.conf import settings
from django.contrib.auth import get_user_model
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

User = get_user_model()


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


def get_or_create_google_user(payload):
    """Match by google_sub first (stable, Google-recommended), then by
    email (links an existing password account the first time someone uses
    Google sign-in with the same address), else create a new account.
    """
    sub = payload["sub"]
    email = payload.get("email", "")

    user = User.objects.filter(google_sub=sub).first()
    if user:
        return user, False

    user = User.objects.filter(email=email).first() if email else None
    if user:
        user.google_sub = sub
        user.save(update_fields=["google_sub"])
        return user, False

    username = _unique_username_from_email(email)
    user = User.objects.create(
        username=username,
        email=email,
        first_name=(payload.get("given_name") or "")[:150],
        last_name=(payload.get("family_name") or "")[:150],
        google_sub=sub,
    )
    user.set_unusable_password()  # this account can only sign in via Google
    user.save(update_fields=["password"])
    return user, True


def _unique_username_from_email(email):
    base = (email.split("@")[0] if email else "google_user") or "google_user"
    base = "".join(c for c in base if c.isalnum() or c in "._-") or "google_user"
    username = base
    suffix = 1
    while User.objects.filter(username=username).exists():
        suffix += 1
        username = f"{base}{suffix}"
    return username
