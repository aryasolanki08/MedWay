import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SearchX, MapPin } from "lucide-react";
import client from "../api/client";
import MedicineCard from "../components/MedicineCard.jsx";
import PharmacyMap from "../components/PharmacyMap.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { getCurrentPosition } from "../utils/geo.js";
import { AHMEDABAD_AREAS } from "../utils/locations.js";

const AHMEDABAD_FALLBACK = { lat: 23.0225, lng: 72.5714 };

export default function SearchResults() {
  const { user } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const query = params.get("q") || "";

  // Branded shown by default, per product spec -- unless the caller
  // already told us which type they clicked (e.g. a specific medicine
  // card on the Medicine Info page), in which case open on that tab
  // instead of landing on a "not found" empty state.
  const [tab, setTab] = useState(params.get("type") === "generic" ? "generic" : "branded");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);
  // Swiggy-style: default to the user's own area (set at registration/
  // profile) and let them switch to browse a different one -- takes
  // priority over GPS radius when set (see catalog.views.search_medicine).
  const [area, setArea] = useState(user?.area || "");
  const { addItem } = useCart();

  useEffect(() => {
    if (user?.area) setArea(user.area);
  }, [user]);

  useEffect(() => {
    getCurrentPosition()
      .then((pos) => setCoords(pos))
      .catch(() => {
        if (user?.location_lat) {
          setCoords({ lat: user.location_lat, lng: user.location_lng });
        } else {
          setUsingFallback(true);
          setCoords(AHMEDABAD_FALLBACK);
        }
      });
  }, [user]);

  useEffect(() => {
    if (!query) return;
    client.post("/customer/history/", { query }).catch(() => {});
  }, [query]);

  useEffect(() => {
    if (!coords || !query) return;
    setLoading(true);
    client
      .get("/catalog/search/", {
        params: {
          q: query,
          is_generic: tab === "generic",
          lat: coords.lat,
          lng: coords.lng,
          radius_km: 10,
          area,
          avoid_nsaids: user?.avoid_nsaids || false,
        },
      })
      .then((res) => setData(res.data))
      .catch(() => toast.error("Couldn't load results. Please try again."))
      .finally(() => setLoading(false));
  }, [query, tab, coords, area, user]);

  const saveMedicine = (item) => {
    client
      .post("/customer/saved/", { medicine: item.medicine_id })
      .then(() => toast.success(`${item.brand_name} saved`))
      .catch(() => toast.error("Couldn't save that medicine."));
  };

  return (
    <div className="page stack">
      <div>
        <h1>Results for "{query}"</h1>
        {data?.salt && <p className="muted">Matched by active salt: {data.salt}</p>}
      </div>

      <div className="row" style={{ gap: 8, alignItems: "center" }}>
        <MapPin className="h-4 w-4" style={{ flexShrink: 0 }} />
        <select className="input" style={{ width: "auto" }} value={area} onChange={(e) => setArea(e.target.value)}>
          <option value="">All areas (by distance)</option>
          {AHMEDABAD_AREAS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {!area && data?.radius_widened && (
        <div className="disclaimer row" style={{ alignItems: "center", gap: 10 }}>
          <MapPin className="h-4 w-4" style={{ flexShrink: 0 }} />
          <span>No stock within the usual radius, so we widened the search to 50km to find these.</span>
        </div>
      )}

      {!area && usingFallback && (
        <div className="disclaimer row" style={{ alignItems: "center", gap: 10 }}>
          <MapPin className="h-4 w-4" style={{ flexShrink: 0 }} />
          <span>
            We couldn't access your device location and you haven't set one in your profile, so
            distances are based on a default location.{" "}
            <a href="/profile" className="link-btn" style={{ display: "inline" }}>Set your location</a>
          </span>
        </div>
      )}

      <div className="row spread wrap">
        <div className="toggle-group">
          <button className={tab === "branded" ? "active" : ""} onClick={() => setTab("branded")}>Branded</button>
          <button className={tab === "generic" ? "active" : ""} onClick={() => setTab("generic")}>Generic</button>
        </div>
        {data?.potential_savings && (
          <span className="badge gold">Save up to ₹{data.potential_savings} by switching to generic</span>
        )}
      </div>

      {loading && (
        <div className="stack">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton-row">
              <div className="stack" style={{ gap: 8, flex: 1 }}>
                <div className="skeleton" style={{ height: 14, width: "40%" }} />
                <div className="skeleton" style={{ height: 11, width: "65%" }} />
              </div>
              <div className="skeleton" style={{ height: 20, width: 60 }} />
            </div>
          ))}
        </div>
      )}

      {!loading && data?.results?.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <SearchX className="h-8 w-8" />
            <p className="muted" style={{ marginTop: 0 }}>
              No {tab} stock found nearby for this medicine. Try the other tab, or widen your search radius from your profile.
            </p>
          </div>
        </div>
      )}

      {!loading && data?.results?.length > 0 && (
        <>
          <div className="stack">
            {data.results.map((item) => (
              <MedicineCard key={item.stock_id} item={item} onSave={saveMedicine} onAddToCart={addItem} />
            ))}
          </div>
          <div className="card">
            <h2>Map view</h2>
            <PharmacyMap center={coords ? [coords.lat, coords.lng] : null} pharmacies={data.results} />
          </div>
        </>
      )}
    </div>
  );
}
