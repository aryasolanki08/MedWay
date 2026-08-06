# MedWay

A pharmacy platform made of two portals that share one landing page and one
inventory dataset:

```
landing/            Zero-build static landing page -- pick Customer or Pharmacy
backend/            Customer portal: Django + DRF API (search, compare, reserve...)
frontend/           Customer portal: React + Vite web app
pharmacy-backend/   Pharmacy portal: Django + DRF API (inventory, billing, purchases...)
pharmacy-frontend/  Pharmacy portal: React + Vite web app
```

The two portals are **independently deployable services with their own
databases** -- there's no shared Django project or shared user table,
because the two apps have genuinely different data models (a pharmacy's
`Medicine` batch/expiry record isn't the same shape as a customer-facing
`Medicine`/`Salt` catalog entry) and different auth needs. What ties them
together:

1. **A common landing page** (`landing/index.html`) that lets a visitor
   choose which portal they want, instead of two disconnected sites.
2. **A one-way data sync** -- the customer backend pulls real inventory
   from the pharmacy backend's REST API and writes it into its own
   `MedicineStock`/`PriceLog` tables, so customer-side search/compare/price
   history reflects real pharmacy stock instead of only seeded demo data.

## Quick start

You'll run 5 things, each in its own terminal.

**1. Customer backend** (port 8000)
```bash
cd backend
python -m venv venv && venv\Scripts\activate   # or: source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo_data   # real Ahmedabad pharmacies -- see "Location data" below
python manage.py runserver
```

**2. Customer frontend** (port 5173)
```bash
cd frontend
npm install
npm run dev
```

**3. Pharmacy backend** (port 8001)
```bash
cd pharmacy-backend
python -m venv venv && venv\Scripts\activate   # or: source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8001
```

**4. Pharmacy frontend** (port 5174)
```bash
cd pharmacy-frontend
npm install
npm run dev
```

**5. Landing page** (port 5175, any static server works)
```bash
npx serve -l 5175 landing
# or: python -m http.server 5175 --directory landing
```

Open `http://localhost:5175` and pick a portal. If you deploy the two
frontends to real domains, link to the landing page with
`?customer=<url>&pharmacy=<url>` to override the local defaults.

## Syncing real pharmacy data into the customer portal

The pharmacy portal already ships an `APIKey`-gated integration endpoint
for exactly this. One-time setup, then re-run the sync any time inventory
changes:

```bash
# 1. On the pharmacy backend -- create (or reuse) an integration API key
cd pharmacy-backend
python manage.py seed_integration_key
# -> prints a key; copy it

# 2. On the customer backend -- point it at the pharmacy backend
cd ../backend
copy .env.example .env      # or: cp .env.example .env
# edit .env: set PHARMACY_API_KEY to the key printed above
# (PHARMACY_API_BASE_URL already defaults to http://127.0.0.1:8001)

# 3. Pull real inventory into the customer portal's MedicineStock/PriceLog
python manage.py sync_pharmacy_data
```

This upserts pharmacies (geocoding new addresses via OpenStreetMap's free
Nominatim API, falling back to a default location if that fails or is
skipped with `--no-geocode`), medicines (grouped by salt composition), and
current stock/price -- logging a new `PriceLog` entry whenever a price
actually changed, so price-drop alerts and trend charts on the customer
side stay meaningful. Safe to re-run on a schedule (cron, etc.) since
everything is matched and updated by name rather than duplicated.

## Seeding the pharmacy portal from the customer portal's demo data

A brand-new pharmacy portal starts with an empty inventory (a newly
signed-up pharmacy has no stock until its owner adds some). To give both
portals the same starting data, push the customer portal's own catalog
(`seed_demo_data`'s ~35 Ahmedabad pharmacies, or anything else added there) into the
pharmacy portal, using the same integration endpoint from the opposite
direction:

```bash
cd backend
python manage.py push_catalog_to_pharmacy
```

This uses the same `PHARMACY_API_KEY`/`PHARMACY_API_BASE_URL` as
`sync_pharmacy_data` above (set that up first if you haven't). It skips
any pharmacy whose name already exists on the pharmacy side -- so it
won't push data that got into the customer portal *from* the pharmacy
portal back to where it came from -- making it safe to run once after
setup, or again later if you add more demo data on the customer side.

## Google sign-in (both portals)

Both frontends support "Sign in/up with Google" via Google Identity
Services. It's optional -- leave the client ID unset and both portals fall
back to a plain "not configured" button.

1. In [Google Cloud Console](https://console.cloud.google.com/) -> APIs &
   Services -> Credentials, open your OAuth 2.0 Client ID (or create one)
   and add **all** frontend origins you'll run as "Authorized JavaScript
   origins": `http://localhost:5173` (customer) and `http://localhost:5174`
   (pharmacy). One client ID can cover both portals.
2. Set the same value as `GOOGLE_CLIENT_ID` in `backend/.env` and
   `pharmacy-backend/.env`, and as `VITE_GOOGLE_CLIENT_ID` in
   `frontend/.env` and `pharmacy-frontend/.env`.
3. Restart the dev servers (Vite picks up `.env` changes on restart, not
   HMR).

On the customer side this logs into an existing account or creates one
(`accounts.User.google_sub`). On the pharmacy side, since every account
there is also a pharmacy owner or staff member, one endpoint
(`POST /api/auth/google/`) handles both: signing in an existing
Google-linked account, and -- for a brand-new Google identity -- returning
`{"signup_required": true}` so the Signup page can collect just the
pharmacy's business details (name, license, address, phone, business
email) before creating the account, skipping username/password entirely
since identity already came from Google.

## Location data (Ahmedabad, area-based)

Search and browsing are Swiggy-style: pharmacies, pharmacy signups, and
customer accounts all carry a real City/State/Area (`pharmacies.Pharmacy`,
`accounts.Pharmacy` on the pharmacy side, and `accounts.User` on the
customer side), and search shows "all pharmacies in \<your area\>" by
exact match rather than only a GPS radius. The full area list and each
area's real geocoded coordinates live in `backend/pharmacies/locations.py`
-- mirrored by hand in `pharmacy-backend/accounts/locations.py`,
`frontend/src/utils/locations.js`, and
`pharmacy-frontend/src/utils/locations.js` (static reference data, not
worth a cross-service endpoint). Keep all four in sync if the area list
changes.

`seed_demo_data` seeds real Ahmedabad pharmacies only (Surat and the old
free-text-address demo data have been retired): a handful independently
verified via a live OpenStreetMap Overpass API pull, plus known pharmacy
chains that operate in Ahmedabad (Apollo Pharmacy, MedPlus, Wellness
Forever, Davaindia Generic Pharmacy, Netmeds) placed at each area's real
geocoded centre -- see the file's own comments for exactly which entries
are which. Chain branches are named `"<Chain> - <Area>"` where the same
chain appears in more than one area -- **don't drop the area suffix**,
since `push_catalog_to_pharmacy`/`sync_pharmacy_data` match pharmacies by
name, and same-named branches in different areas would otherwise collapse
into one pharmacy record on the other portal and only one area could ever
receive orders for that chain.

Registering a customer or signing up a pharmacy now requires an `area`
(validated against the shared list); a customer's `location_lat`/`lng`
auto-fills from the area's coordinates unless they set a precise address
in Profile.

**Resetting all data** (e.g. to reseed after changing the area list) is a
full wipe, not a partial one -- there's no seed data left over from
before this feature, since sample pharmacies with free-text-only
addresses can't be safely retrofitted with real areas:

```bash
# Both backends -- deletes ALL users, pharmacies, orders, everything
cd backend && python manage.py flush --no-input
cd ../pharmacy-backend && python manage.py flush --no-input

# Reseed + reconnect the two portals (see sections above/below)
cd ../backend && python manage.py seed_demo_data
cd ../pharmacy-backend && python manage.py seed_integration_key   # new key -- update BOTH .env files
cd ../backend && python manage.py push_catalog_to_pharmacy
python manage.py sync_pharmacy_data   # backfills backend_id, needed for order routing
```

## Prepaid home-delivery orders

Customers add medicines to a cart (one pharmacy at a time), pay upfront via
Razorpay, and only then does the pharmacy see the order -- in a live
"Incoming Orders" inbox where they accept (auto-generates a real
`billing.Bill` and reserves stock) or reject it, then move it through
out-for-delivery -> delivered. This is a **live bridge**, not a batch sync
like the two commands above: payment confirmation on the customer backend
immediately webhooks the pharmacy backend, and every status change the
pharmacy makes webhooks back to the customer, both authenticated with the
same shared key (`PHARMACY_API_KEY` / `CUSTOMER_API_KEY` -- one value, set
on both sides).

Setup, in addition to the sync setup above:

```bash
# pharmacy-backend/.env
CUSTOMER_API_BASE_URL=http://127.0.0.1:8000
CUSTOMER_API_KEY=<same value as PHARMACY_API_KEY in backend/.env>

# backend/.env -- reuses PHARMACY_API_KEY/PHARMACY_API_BASE_URL, already set
# up above. Optionally add real Razorpay test keys (RAZORPAY_KEY_ID /
# RAZORPAY_KEY_SECRET); left as placeholders, checkout falls back to a
# mock "pay" confirmation dialog instead of the real Razorpay modal.
```

Order routing depends on `pharmacies.Pharmacy.backend_id` (the matching
pharmacy-backend `Pharmacy.id`), which `sync_pharmacy_data` now sets
automatically. If you added pharmacies before this feature existed,
re-run `python manage.py sync_pharmacy_data` once to backfill it --
otherwise a pharmacy without `backend_id` can't receive orders.

The old pickup flow (`customer.Reservation`, pickup codes) is untouched on
the backend -- just no longer linked from the search results UI, which now
shows "Add to cart" instead of "Reserve".

## What's in each portal

**Customer portal** (`backend/`, `frontend/`) -- search medicines, compare
real prices across nearby pharmacies, order for prepaid home delivery,
prescription OCR upload, price-history charts and drop alerts, pharmacy
reviews and a store locator, an analytics dashboard, and a rule-based
medicine-info assistant. See `backend/README.md` and `frontend/README.md`
for endpoint/page-level detail and the product decisions behind the
"alternative medicine" and info-assistant logic.

**Pharmacy portal** (`pharmacy-backend/`, `pharmacy-frontend/`) -- staff
accounts scoped to one pharmacy, an incoming-orders inbox, inventory
management with batch/expiry tracking, billing, purchase orders, and sales
analytics. See `pharmacy-frontend/README.md` for page-level detail.
