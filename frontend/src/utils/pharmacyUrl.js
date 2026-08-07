// Overridable at deploy time via ?pharmacy=<url> (forwarded by the
// landing/ redirect shim) or VITE_PHARMACY_URL, falling back to the
// pharmacy-frontend dev port -- same override pattern the old static
// landing/index.html chooser used.
export function pharmacyPortalUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("pharmacy") || import.meta.env.VITE_PHARMACY_URL || "http://localhost:5174";
}
