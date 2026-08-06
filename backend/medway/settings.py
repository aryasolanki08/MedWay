"""
MedWay backend settings.
Customer-side portal: auth, medicine/salt catalog, pharmacy stock & pricing,
search history, saved medicines, and a static (non-diagnostic) info assistant.
"""
import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Load a local .env file if present (optional; safe no-op if python-dotenv
# isn't installed or there's no .env file).
try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / ".env")
except ImportError:
    pass

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-secret-key-change-me")
DEBUG = os.environ.get("DJANGO_DEBUG", "true").lower() == "true"

# Optional: free Google Gemini API key (aistudio.google.com/apikey), used
# for two things, both text/vision-in-classification-out, never medical
# advice generation:
#   1. Medicine Info assistant: understands free-text phrasing ("loose
#      motion") that doesn't literally contain a known keyword. Only ever
#      classifies text into our fixed, pharmacist-reviewed category list.
#   2. Prescription photo reader (catalog/vision_ocr.py): reads text off
#      an uploaded prescription photo. Only ever transcribes what's
#      literally on the page -- never interprets or suggests a medicine.
# Blank means both fall back to non-AI paths (plain keyword matching, and
# local EasyOCR respectively) -- AI is an enhancement, never a dependency.
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

# Optional: Google OAuth 2.0 Client ID (console.cloud.google.com -> APIs &
# Services -> Credentials -> Create OAuth client ID -> Web application) for
# "Sign in with Google". Must match the client_id the frontend initializes
# Google Identity Services with (VITE_GOOGLE_CLIENT_ID). Blank means the
# /api/auth/google/ endpoint returns a clear "not configured" error instead
# of silently accepting unverifiable tokens.
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")

# Pharmacy-side portal integration (pharmacies.management.commands.sync_pharmacy_data
# pulls real inventory from there via /api/auth/integration/export-data/).
# PHARMACY_API_KEY must match an active accounts.APIKey created on that
# portal (see its `seed_integration_key` management command).
PHARMACY_API_BASE_URL = os.environ.get("PHARMACY_API_BASE_URL", "http://127.0.0.1:8001")
PHARMACY_API_KEY = os.environ.get("PHARMACY_API_KEY", "")

# Razorpay test-mode keys for paying for orders.orders.Order (medicine
# delivery orders). Same placeholder-triggers-mock-order convention as the
# pharmacy portal's own subscription checkout (accounts.views on that
# side) -- see orders/views.py.
RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "rzp_test_placeholder_id")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "placeholder_secret")

# Comma-separated list, e.g. "api.medway.example,medway.example". Defaults to "*"
# only while DEBUG is on -- always set this explicitly in production.
_allowed_hosts_env = os.environ.get("DJANGO_ALLOWED_HOSTS", "")
ALLOWED_HOSTS = [h.strip() for h in _allowed_hosts_env.split(",") if h.strip()] or (["*"] if DEBUG else [])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "accounts",
    "catalog",
    "pharmacies",
    "customer",
    "orders",
    "assistant",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "medway.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "medway.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=6),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=14),
    "ROTATE_REFRESH_TOKENS": True,
}

# Dev-friendly CORS. Set DJANGO_CORS_ORIGINS in production, e.g.
# "https://portal.medway.example,https://www.medway.example".
CORS_ALLOW_ALL_ORIGINS = DEBUG
_cors_origins_env = os.environ.get("DJANGO_CORS_ORIGINS", "")
CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_origins_env.split(",") if o.strip()] or [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
