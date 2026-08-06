# MedWay backend (customer portal)

Django + DRF API: auth, salt-based generic matching, pharmacy stock/price
search, price history & trend alerts, prescription-photo OCR, pharmacy
reservations, pharmacy reviews, search history, saved medicines, spending
insights, and a medicine-info assistant backed by real drug-label data.

## Setup

```bash
python -m venv venv
source venv/bin/activate        # venv\Scripts\activate on Windows
pip install -r requirements.txt   # pulls in easyocr + its own deps (torch, opencv, Pillow, ...)

python manage.py migrate
python manage.py createsuperuser
python manage.py seed_demo_data     # real Indian medicine catalog + real/curated pharmacies
python manage.py fetch_salt_info    # optional: pulls real usage text from openFDA's free API
python manage.py runserver
```

Copy `.env.example` to `.env` for local secrets. Everything has a safe dev
default except `GEMINI_API_KEY`, which is optional -- without it, the
assistant still works via plain keyword matching, it just skips the
free-text AI classification step (see below).

API base: `http://127.0.0.1:8000/api/`

## Seeded demo data

`seed_demo_data` is not placeholder data -- it's a real Indian medicine
catalog and a mix of real + curated pharmacies:

- **26 salts / 67 branded+generic medicines** with MRP-grounded pricing
  (Dolo 650, Augmentin 625, Telma 40, Shelcal 500, etc.)
- **32 pharmacies** across Ahmedabad and Surat: some hand-curated from real
  store listings (Apollo Pharmacy, Ashok Medical & General Store, ...),
  some pulled live from OpenStreetMap's free Overpass API
- **30 days of price history per stock item** (12,000+ points), so
  price-trend charts and drop alerts have real data to work with
- **Real-ish opening hours** (a few independently confirmed via OSM tags,
  the rest a realistic default) -- "open now" is computed live from these,
  never a hardcoded badge

Re-running the command is idempotent (safe to run again after a fresh
migrate).

## Key endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/auth/register/` | POST | Create account, returns JWT pair |
| `/api/auth/login/` | POST | Login, returns JWT pair |
| `/api/auth/refresh/` | POST | Refresh access token |
| `/api/auth/profile/` | GET/PATCH | Current user profile (location, phone, NSAID filter) |
| `/api/catalog/search/?q=..&is_generic=&lat=&lng=&radius_km=` | GET | Salt-matched search, branded/generic split, price-ascending. Auto-widens radius (10km -> 50km -> unlimited) rather than returning empty. |
| `/api/catalog/autocomplete/?q=para` | GET | Search-bar suggestions |
| `/api/catalog/prescription-ocr/` | POST (multipart `image`) | EasyOCR reads a prescription photo, fuzzy-matches text against the real catalog -- a search shortcut only, never diagnostic |
| `/api/pharmacies/nearby/?lat=&lng=&radius_km=` | GET | Nearby pharmacies, same auto-widen behavior |
| `/api/pharmacies/all/?q=&sort=&open_now=&is_24_7=&has_generic=&min_rating=&radius_km=` | GET | Full directory with real, composable filters |
| `/api/pharmacies/<id>/medicines/` | GET | Real in-stock medicines at one pharmacy |
| `/api/pharmacies/stock/<id>/price-history/` | GET | 30-day price history + trend for one stock item |
| `/api/pharmacies/reviews/` | GET/POST | Pharmacy ratings (never medicine ratings) -- one per user, resubmitting updates it |
| `/api/customer/history/` | GET/POST/DELETE | Search history; `DELETE /clear_all/` bulk-clears it |
| `/api/customer/saved/` | GET/POST/DELETE | Saved/bookmarked medicines, with live price-trend |
| `/api/customer/reservations/` | GET/POST | Reserve stock for pickup (atomic, decrements real quantity); `/cancel/` restores it |
| `/api/customer/insights/?range=7d\|30d\|ytd\|custom` | GET | Search patterns, category breakdown, real generic-savings total, period-over-period trend, daily sparkline series, a computed savings recommendation |
| `/api/customer/notifications/` | GET | Live-computed feed (price drops on saved medicines, pending reservations) -- not a stored log |
| `/api/assistant/query/` | POST `{"symptom": "..."}` | Matches free text against a reviewed keyword list (optionally AI-assisted, see below), returns real medicines + real usage info for the matched category |

## The assistant: real data on both ends

- **Medicines shown are real**: resolved live against the catalog database
  (actual brand/generic options, actual current cheapest price), not a
  canned list. `assistant/reference_data.py` only maps keywords -> Salt
  names + safety framing text.
- **Usage info is real**: pulled from openFDA's free public drug-label API
  via `catalog fetch_salt_info`, stored on `Salt.usage_purpose` /
  `usage_info`. Salts with no clean OTC match (e.g. no single-ingredient
  FDA label) are left blank rather than showing a bad match -- see the
  quality filter in that command for why (it rejects multi-ingredient
  homeopathic-combo noise in openFDA's dataset).
- **Free-text understanding is optionally AI-assisted**: if `GEMINI_API_KEY`
  is set, `assistant/ai_match.py` classifies text like "loose motion" that
  doesn't literally contain a known keyword. The model is a **classifier
  only** -- it can only return keys from the existing reviewed list, never
  a medicine name or advice, and any failure silently falls back to plain
  keyword matching.

## Design notes (read before extending)

- **Salt is the pivot for "alternatives."** `catalog.search_medicine` only
  ever compares `Medicine` rows sharing the same `Salt`. Do not add
  cross-salt "alternative" matching (e.g. suggesting Ibuprofen for a
  Paracetamol search) -- that's a clinical judgment out of scope for this
  platform, and it's flagged explicitly in the code comments.
- **Sorting is price-only, ascending.** There is no "best to worst
  medicine" ranking anywhere in this codebase, intentionally. Pharmacy
  *ratings* exist (`PharmacyReview`), but they rate the business, never a
  medicine.
- **The assistant is rule-based**, driven by `assistant/reference_data.py`
  plus real catalog/openFDA data as above. Extend it by adding dictionary
  entries reviewed by a pharmacist, not by wiring in a model trained to
  output "what to take."
- **Never fabricate a status.** "Open now," "24/7," and "generic in stock"
  badges are all computed from real stored fields (`pharmacies/utils.py`),
  not hardcoded -- if you add a similar badge, follow that pattern.
- `MedicineStock`/`PriceLog` are written by the pharmacy-side portal you've
  already built; wire this app to the same database (or expose a small
  internal sync endpoint) rather than duplicating pharmacy data entry.
