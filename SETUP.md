# Setup (read this first)

MedWay is two independent full-stack portals sharing one landing page:

| Piece | Folder | Runs on |
|---|---|---|
| Landing chooser (static) | `landing/` | any static server, e.g. `:5500` |
| Customer backend (Django) | `backend/` | `:8000` |
| Customer frontend (React) | `frontend/` | `:5173` |
| Pharmacy backend (Django) | `pharmacy-backend/` | `:8001` |
| Pharmacy frontend (React) | `pharmacy-frontend/` | `:5174` |

None of `venv/`, `node_modules/`, `db.sqlite3`, or `.env` are committed to git (see each
folder's `.gitignore`) -- they're either regenerated locally or contain secrets/personal
data that shouldn't be shared via the repo. That means every fresh clone needs the steps
below before anything runs.

## 1. Customer backend

```
cd backend
python -m venv venv
venv\Scripts\activate      (Windows)   or   source venv/bin/activate   (Mac/Linux)
pip install -r requirements.txt
copy .env.example .env     (Windows)   or   cp .env.example .env       (Mac/Linux)
python manage.py migrate
python manage.py seed_demo_data
python manage.py createsuperuser        (optional, for Django admin)
python manage.py runserver 8000
```

`seed_demo_data` populates the medicine/salt catalog and ~36 real Ahmedabad pharmacies
into this database. Without it, search and pharmacy discovery will come back empty.

## 2. Pharmacy backend

```
cd pharmacy-backend
python -m venv venv
venv\Scripts\activate      (Windows)   or   source venv/bin/activate   (Mac/Linux)
pip install -r requirements.txt
copy .env.example .env     (Windows)   or   cp .env.example .env       (Mac/Linux)
python manage.py migrate
python manage.py seed_integration_key
python manage.py runserver 8001
```

`seed_integration_key` prints an API key -- copy it into **both** `.env` files as the
shared secret the two backends use to talk to each other:
- `pharmacy-backend/.env` -> `CUSTOMER_API_KEY=<the printed key>`
- `backend/.env` -> `PHARMACY_API_KEY=<the same key>`

Then, with both backends running, sync the customer catalog into the pharmacy backend
and pull the resulting pharmacy IDs back (order matters):

```
cd backend
python manage.py push_catalog_to_pharmacy
python manage.py sync_pharmacy_data
```

## 3. Customer frontend

```
cd frontend
npm install
copy .env.example .env     (Windows, optional)
npm run dev -- --port 5173
```

## 4. Pharmacy frontend

```
cd pharmacy-frontend
npm install
copy .env.example .env     (Windows, optional)
npm run dev -- --port 5174
```

## 5. Landing chooser

Any static file server pointed at `landing/` works, e.g.:

```
cd landing
python -m http.server 5500
```

Open `http://localhost:5500/` -- it redirects into the customer app's `/welcome` page,
which is the MedWay-wide chooser between the customer and pharmacy portals.

## Optional: API keys

Everything above works with zero API keys -- search, pharmacy discovery, orders, and
the Medicine Info lookup are all fully functional without them. Two features are
AI-enhanced but gracefully degrade without a key:

- `GEMINI_API_KEY` (`backend/.env`) -- free at https://aistudio.google.com/apikey.
  Powers free-text symptom understanding, prescription-photo reading, the "Ask
  anything" chatbot, and the AI voice consult script. Without it, these fall back to
  plain keyword matching / local OCR / a deterministic template respectively.
- `GROK_API_KEY` (`backend/.env`) -- from https://console.x.ai (requires billing, no
  free tier). Used only as a second attempt for the AI voice consult script if Gemini
  fails or hits its quota.
- `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID` -- for "Sign in with Google" on both
  portals. Without it, the Google button shows an honest "not configured" message
  instead of failing silently.

## Troubleshooting

If you see `'vite' is not recognized as an internal or external command`, `npm install`
hasn't been run yet in that particular frontend folder.

If search or "All pharmacies" comes back empty, `seed_demo_data` hasn't been run on
`backend/`, or the two backends haven't been synced (step 2's last two commands).
