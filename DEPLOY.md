# Deploying MedWay for free

Five pieces, all on free tiers:

| Piece | Host | Notes |
|---|---|---|
| Customer backend | Render (free Web Service) | Sleeps after 15 min idle; ~30-50s cold start on wake |
| Pharmacy backend | Render (free Web Service) | Same |
| Customer DB | Neon (free Postgres) | Persists indefinitely, unlike a sqlite file on Render's ephemeral disk |
| Pharmacy DB | Neon (free Postgres, 2nd project) | Kept separate from the customer DB, matching the federated design |
| Customer frontend | Vercel (free) | Static Vite build |
| Pharmacy frontend | Vercel (free) | Static Vite build |
| Landing page | Vercel (free, 3rd project) | Static HTML, zero build |

The codebase is already prepared for this (Postgres support, Whitenoise static
files, gunicorn, `render.yaml`, `vercel.json`). What's left is account setup
and env vars, done in this order because backend URLs and frontend URLs each
depend on the other.

## 0. Push your latest code

```
git add -A
git commit -m "Prepare for deployment"
git push origin arya
```

(Adjust branch name if deploying from `main` instead.)

## 1. Create two free Neon Postgres databases

1. Sign up at **neon.tech** (free, no card).
2. Create a project named `medway-customer` -- copy its connection string
   (starts `postgresql://...`, includes `?sslmode=require`).
3. Create a **second** project named `medway-pharmacy` -- copy its
   connection string too. (If your Neon account's free tier caps you at
   one project, create the second database on a free Supabase project
   instead -- same idea, different dashboard.)

Keep both connection strings handy -- you'll need each in two places.

## 2. Migrate your existing local data into Neon

You chose to keep your current data (pharmacies, catalog, accounts) rather
than start fresh. Do this once per backend, from your local machine, using
your **already-seeded local sqlite databases**.

### Customer backend (`backend/`)

```
cd backend
venv\Scripts\activate

REM 1. Dump everything from your local sqlite db
python manage.py dumpdata --natural-foreign --natural-primary ^
  -e contenttypes -e auth.permission -e admin.logentry -e sessions.session ^
  -o data_backup.json

REM 2. Point at Neon temporarily (paste your real connection string)
set DATABASE_URL=postgresql://...your-neon-customer-url...

REM 3. Create the schema on Neon, then load your data into it
python manage.py migrate
python manage.py loaddata data_backup.json

REM 4. Unset it so local dev goes back to using sqlite
set DATABASE_URL=
```

### Pharmacy backend (`pharmacy-backend/`)

Same four steps, in `pharmacy-backend/`, using the `medway-pharmacy` Neon
connection string.

Verify each loaded correctly:

```
python manage.py shell -c "from django.contrib.auth import get_user_model; print(get_user_model().objects.count())"
```
(run once with `DATABASE_URL` still set to Neon, before unsetting it)

Delete both `data_backup.json` files afterward if you don't want a plaintext
copy of your user data sitting in the repo folder -- they're gitignored
already but no reason to keep them once loaded.

## 3. Deploy both backends to Render

1. Sign up at **render.com** (free, no card for free tier).
2. **New -> Blueprint**, connect your GitHub repo, pick the branch. Render
   reads `render.yaml` at the repo root and proposes both services
   (`medway-customer-backend`, `medway-pharmacy-backend`) automatically.
3. Before the first deploy finishes, open each service's **Environment**
   tab and fill in the vars marked `sync: false` in `render.yaml`:

   **medway-customer-backend:**
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | your `medway-customer` Neon connection string |
   | `DJANGO_ALLOWED_HOSTS` | leave blank for now, come back after step 3 gives you the URL |
   | `DJANGO_CORS_ORIGINS` | leave blank for now, fill in after step 4 |
   | `DJANGO_CSRF_TRUSTED_ORIGINS` | leave blank for now, same as above |
   | `GEMINI_API_KEY` / `GROK_API_KEY` / `GOOGLE_CLIENT_ID` | copy from your local `backend/.env` |
   | `PHARMACY_API_BASE_URL` | leave blank for now, fill in once you know the pharmacy backend's Render URL |
   | `PHARMACY_API_KEY` | copy from your local `backend/.env` (this already matches the pharmacy backend since it was migrated with your data) |
   | `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | copy from local, or leave as placeholders for mock-mode payments |

   **medway-pharmacy-backend:** same pattern, using the `medway-pharmacy`
   Neon URL, and `CUSTOMER_API_BASE_URL` / `CUSTOMER_API_KEY` instead.

4. Once both services finish deploying, note their URLs, e.g.:
   - `https://medway-customer-backend.onrender.com`
   - `https://medway-pharmacy-backend.onrender.com`

5. Go back into each service's env vars and fill in what you skipped:
   - `DJANGO_ALLOWED_HOSTS` -> that service's own hostname, e.g.
     `medway-customer-backend.onrender.com` (no `https://`, no trailing slash)
   - `DJANGO_CSRF_TRUSTED_ORIGINS` -> that service's own full URL with
     `https://`, e.g. `https://medway-customer-backend.onrender.com`
   - Customer backend's `PHARMACY_API_BASE_URL` -> the pharmacy backend's
     Render URL
   - Pharmacy backend's `CUSTOMER_API_BASE_URL` -> the customer backend's
     Render URL
   - Leave `DJANGO_CORS_ORIGINS` for step 5, after the frontends exist.

   Each save triggers a redeploy.

## 4. Deploy both frontends + the landing page to Vercel

1. Sign up at **vercel.com** (free, connect your GitHub).
2. **Add New -> Project**, import the repo three separate times, each with
   a different **Root Directory**:

   | Project | Root Directory | Framework |
   |---|---|---|
   | medway-customer | `frontend` | Vite (auto-detected) |
   | medway-pharmacy | `pharmacy-frontend` | Vite (auto-detected) |
   | medway-landing | `landing` | Other / no build command |

3. Before deploying each Vite project, set its env vars (Project Settings
   -> Environment Variables):

   **medway-customer:**
   - `VITE_API_BASE` = `https://medway-customer-backend.onrender.com/api`
   - `VITE_GOOGLE_CLIENT_ID` = same value as the backend's `GOOGLE_CLIENT_ID`
   - `VITE_PHARMACY_URL` = `https://medway-pharmacy.vercel.app` (fill in
     after the pharmacy project's URL is known -- redeploy once you have it)

   **medway-pharmacy:**
   - `VITE_API_BASE` = `https://medway-pharmacy-backend.onrender.com`
   - `VITE_GOOGLE_CLIENT_ID` = same value

4. Deploy all three. Note the resulting URLs, e.g.:
   - `https://medway-customer.vercel.app`
   - `https://medway-pharmacy.vercel.app`
   - `https://medway-landing.vercel.app`

## 5. Close the loop: update backend CORS with the real frontend URLs

Back in Render, for each backend service, set:

- `DJANGO_CORS_ORIGINS` -> the frontend URL(s) that call it, e.g. customer
  backend gets `https://medway-customer.vercel.app`, pharmacy backend gets
  `https://medway-pharmacy.vercel.app`

Save (triggers redeploy).

## 6. Update Google OAuth (if you're using "Sign in with Google")

In **console.cloud.google.com** -> APIs & Services -> Credentials -> your
OAuth Client ID -> Authorized JavaScript origins, add:
- `https://medway-customer.vercel.app`
- `https://medway-pharmacy.vercel.app`

## 7. Point the landing page at the real URLs

Open the deployed `medway-landing` project's `index.html` in the repo (or
edit `landing/index.html` and redeploy) so the default `customerUrl`
matches your real customer frontend URL instead of `localhost:5173`, and
so `CTASection.jsx`'s pharmacy link / `VITE_PHARMACY_URL` matches your
real pharmacy frontend URL instead of `localhost:5174`.

## 8. Smoke test

- Visit the landing URL -> redirects into `/welcome`.
- `/welcome`'s "I'm a Customer" / "I'm a Pharmacy" buttons land on the
  right deployed apps.
- Register or log in on each portal.
- Search a medicine on the customer side -- confirms its backend can
  reach its Neon DB.
- Place a test order and confirm it shows up on the pharmacy side --
  confirms the two backends can reach each other over their real URLs
  (`PHARMACY_API_BASE_URL` / `CUSTOMER_API_BASE_URL`).

## Known free-tier limitations

- **Cold starts**: Render free services sleep after 15 minutes idle. The
  first request after a while takes 30-50s while it wakes up -- normal,
  not a bug.
- **EasyOCR is excluded** from `backend/requirements.txt` (see the comment
  there) since it pulls in ~1-2GB of ML dependencies that free build tiers
  can't handle. Prescription photo reading still works as long as
  `GEMINI_API_KEY` is set -- it's the primary path anyway.
- **Neon/Supabase free Postgres** has storage and compute-hour caps well
  beyond what a demo project needs, but check current limits on their
  pricing pages if this grows into real usage.
