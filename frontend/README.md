# MedWay frontend (customer portal)

React + Vite customer-facing app: login/register, a bento-grid dashboard,
branded/generic price comparison with price-history charts, a real store
locator, prescription-photo upload, reservations, pharmacy reviews, an
analytics dashboard, and an AI-assisted (optional) medicine-info assistant.

## Setup

```bash
npm install
npm run dev
```

Runs at `http://localhost:5173`. Expects the backend API at
`http://127.0.0.1:8000/api` (see `src/api/client.js` -- change `API_BASE` if
your backend runs elsewhere).

## Pages

| Route | Purpose |
|---|---|
| `/login`, `/register` | Auth -- icon-leading inputs, real "Remember me" (session vs. persistent token storage), password show/hide |
| `/` | Dashboard: floating hero search with quick-filter tags, a bento grid (prescription upload + quick actions), nearby-pharmacy map with a "you are here" marker |
| `/search?q=...` | Branded/generic toggle, price-ascending compare list, expandable 30-day price chart per result, savings badge, reserve-for-pickup, map |
| `/pharmacies` | Split-screen store locator: searchable/filterable sidebar (open now, 24/7, generic in stock, top rated, within 5km) + map with custom emerald pin markers |
| `/assistant` | Symptom -> real medicines from the catalog (not canned text), real usage info sourced from openFDA, optional AI-assisted free-text matching, always shown with a disclaimer |
| `/insights` | Analytics: date-range filter (7d/30d/YTD/custom), real trend badges vs. the previous period, sparklines, most-searched + category charts, CSV export, a computed savings recommendation |
| `/history` | Activity hub (tabbed): saved medicines with price-trend pills, reservations as an "order pass" (pickup code with copy/QR, cancel with confirm modal), search log as a timeline |
| `/profile` | Phone, location (used as the primary coordinate source on the Dashboard when set), and an opt-in filter (not a recommendation) to hide NSAID results |

## Notes

- **Auth tokens**: `src/utils/tokenStorage.js` is the single source of
  truth -- persistent (`localStorage`) if "Remember me" is checked,
  session-only (`sessionStorage`) otherwise. Don't read `medway_access` /
  `medway_refresh` directly from `localStorage` elsewhere; go through that
  module (or `client.js`, which already does).
- **Never fabricate UI state.** Badges like "Open Now," "Generic in
  stock," and price-trend arrows all reflect real fields from the API.
  "Continue with Google" and "Forgot password" are visually present but
  intentionally show an honest "not configured yet" toast instead of
  pretending to work, since there's no OAuth/reset flow behind them.
- **Design system**: Tailwind v4, deep-emerald palette (`--color-brand-*`
  in `src/styles.css`), glassmorphism cards, bento grids, custom Leaflet
  `divIcon` markers. When adding a `::before`/`::after` rule, don't put a
  `dark:` variant inside it directly -- Tailwind v4 generates an invalid
  selector; write a separate `.dark .foo::before { ... }` rule instead.
- The "Medicine info" page intentionally never ranks or recommends a
  specific product -- it surfaces category-level information plus real,
  price-ascending catalog options, and always shows the disclaimer text
  returned by the API.
