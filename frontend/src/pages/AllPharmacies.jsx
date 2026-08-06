import { useEffect, useState } from "react";
import { Star, MapPin, Phone, Search, Navigation, Pill } from "lucide-react";
import client from "../api/client";
import PharmacyMap from "../components/PharmacyMap.jsx";
import PharmacyReviewModal from "../components/PharmacyReviewModal.jsx";
import PharmacyMedicinesModal from "../components/PharmacyMedicinesModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { getCurrentPosition } from "../utils/geo.js";
import { AHMEDABAD_AREAS } from "../utils/locations.js";

const AHMEDABAD_FALLBACK = { lat: 23.0225, lng: 72.5714 };

const SORTS = [
  { key: "distance", label: "Nearest" },
  { key: "rating", label: "Top rated" },
  { key: "name", label: "Name" },
];

const FILTERS = [
  { key: "open_now", label: "Open Now" },
  { key: "is_24_7", label: "24/7" },
  { key: "has_generic", label: "Generic Stock Available" },
  { key: "top_rated", label: "Top Rated (4.5+)" },
  { key: "within_5km", label: "Within 5 km" },
];

export default function AllPharmacies() {
  const { user } = useAuth();
  const toast = useToast();
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("distance");
  const [coords, setCoords] = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [viewingMedicines, setViewingMedicines] = useState(null);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [hovered, setHovered] = useState(null);
  // Swiggy-style: default to the user's own area, switchable -- see
  // SearchResults.jsx for the same pattern.
  const [area, setArea] = useState(user?.area || "");

  useEffect(() => {
    if (user?.area) setArea(user.area);
  }, [user]);

  useEffect(() => {
    getCurrentPosition()
      .then((pos) => setCoords(pos))
      .catch(() => setCoords(AHMEDABAD_FALLBACK));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { sort };
    if (coords) { params.lat = coords.lat; params.lng = coords.lng; }
    if (search.trim()) params.q = search.trim();
    if (area) params.area = area;
    if (activeFilters.has("open_now")) params.open_now = "true";
    if (activeFilters.has("is_24_7")) params.is_24_7 = "true";
    if (activeFilters.has("has_generic")) params.has_generic = "true";
    if (activeFilters.has("top_rated")) params.min_rating = "4.5";
    if (activeFilters.has("within_5km")) params.radius_km = "5";

    const timeout = setTimeout(() => {
      client
        .get("/pharmacies/all/", { params })
        .then((res) => setPharmacies(res.data.results))
        .catch(() => toast.error("Couldn't load pharmacies."))
        .finally(() => setLoading(false));
    }, search ? 300 : 0);
    return () => clearTimeout(timeout);
  }, [sort, coords, search, area, activeFilters]);

  const toggleFilter = (key) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const directionsUrl = (p) => `https://www.openstreetmap.org/directions?to=${p.lat}%2C${p.lng}`;

  return (
    <div className="page page-wide stack" style={{ gap: 20 }}>
      <div>
        <h1>All pharmacies</h1>
        <p className="muted">Every pharmacy in the network, across Ahmedabad.</p>
      </div>

      <div className="stack" style={{ gap: 12 }}>
        <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
          <div className="input" style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 14px", flex: 1, minWidth: 220 }}>
            <Search className="h-4 w-4" style={{ color: "#94a3b8", flexShrink: 0 }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pharmacy by name or address..."
              style={{ border: 0, outline: "none", background: "transparent", width: "100%", padding: "10px 0", fontSize: 15, color: "inherit" }}
            />
          </div>
          <select className="input" style={{ width: "auto" }} value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">All areas</option>
            {AHMEDABAD_AREAS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <div className="filter-bar">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`filter-pill${activeFilters.has(f.key) ? " active" : ""}`}
              onClick={() => toggleFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="toggle-group">
          {SORTS.map((s) => (
            <button key={s.key} className={sort === s.key ? "active" : ""} onClick={() => setSort(s.key)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="locator-shell">
        <div className="locator-sidebar">
          {loading ? (
            <div className="stack">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="skeleton-row">
                  <div className="stack" style={{ gap: 8, flex: 1 }}>
                    <div className="skeleton" style={{ height: 14, width: "40%" }} />
                    <div className="skeleton" style={{ height: 11, width: "65%" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : pharmacies.length === 0 ? (
            <div className="card empty-state">
              <MapPin className="h-7 w-7" />
              <p className="muted" style={{ marginTop: 0 }}>No pharmacies match these filters. Try clearing a few.</p>
            </div>
          ) : (
            <div className="locator-list">
              {pharmacies.map((p) => (
                <div
                  key={p.id}
                  className={`pharmacy-card${hovered === p.id ? " active" : ""}`}
                  onMouseEnter={() => setHovered(p.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <div className="row spread" style={{ alignItems: "flex-start" }}>
                    <div>
                      <div className="name">{p.name}</div>
                      <div className="meta row" style={{ gap: 4, display: "inline-flex", marginTop: 2 }}>
                        <MapPin className="h-3.5 w-3.5" style={{ flexShrink: 0 }} />
                        <span>{p.address}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pc-badges">
                    {p.distance_km != null && (
                      <span className="pc-badge distance">⚡ {p.distance_km} km</span>
                    )}
                    {p.is_open === true && <span className="pc-badge open">🟢 {p.is_24_7 ? "Open 24/7" : "Open Now"}</span>}
                    {p.is_open === false && <span className="pc-badge closed">🔴 Closed {p.hours_label ? `· ${p.hours_label}` : ""}</span>}
                    {p.avg_rating != null ? (
                      <span className="pc-badge rating">
                        <Star className="h-3 w-3" fill="currentColor" /> {p.avg_rating.toFixed(1)} ({p.review_count}+ reviews)
                      </span>
                    ) : (
                      <span className="pc-badge generic">No reviews yet</span>
                    )}
                    {p.has_generic_stock && (
                      <span className="pc-badge generic"><Pill className="h-3 w-3" /> Generic substitutes in stock</span>
                    )}
                    {p.phone && (
                      <span className="pc-badge generic"><Phone className="h-3 w-3" />{p.phone}</span>
                    )}
                  </div>

                  <div className="row" style={{ gap: 8, marginTop: 12 }}>
                    <button className="btn" style={{ flex: 1, fontSize: 14, padding: "9px 14px" }} onClick={() => setViewingMedicines(p)}>
                      View Medicines
                    </button>
                    <button className="icon-btn" title="Directions" onClick={() => window.open(directionsUrl(p), "_blank")}>
                      <Navigation className="h-4 w-4" />
                    </button>
                    <button className="btn secondary" style={{ fontSize: 14, padding: "9px 14px" }} onClick={() => setReviewing(p)}>
                      Rate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="locator-map-pane">
          <div className="card" style={{ padding: 8 }}>
            {!loading && pharmacies.length > 0 && (
              <PharmacyMap
                center={coords ? [coords.lat, coords.lng] : null}
                pharmacies={pharmacies}
                fitToMarkers
                customPins
                activeId={hovered}
                height={620}
              />
            )}
          </div>
        </div>
      </div>

      {reviewing && <PharmacyReviewModal pharmacy={reviewing} onClose={() => setReviewing(null)} />}
      {viewingMedicines && <PharmacyMedicinesModal pharmacy={viewingMedicines} onClose={() => setViewingMedicines(null)} />}
    </div>
  );
}
