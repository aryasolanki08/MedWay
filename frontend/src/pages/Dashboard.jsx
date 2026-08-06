import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Stethoscope, History, User, Search, MapPinOff, MapPin, ChevronRight } from "lucide-react";
import client from "../api/client";
import PharmacyMap from "../components/PharmacyMap.jsx";
import PrescriptionUpload from "../components/PrescriptionUpload.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { getCurrentPosition } from "../utils/geo.js";

const AHMEDABAD_FALLBACK = { lat: 23.0225, lng: 72.5714 };

const POPULAR_SEARCHES = ["Paracetamol", "Amoxicillin", "Vitamin D3", "Cetirizine", "Pantoprazole"];

const QUICK_ACTIONS = [
  { to: "/assistant", icon: Stethoscope, title: "Medicine info", desc: "Describe a symptom for general OTC category information." },
  { to: "/history", icon: History, title: "Search history", desc: "Revisit medicines you've looked up before." },
  { to: "/profile", icon: User, title: "Profile & location", desc: "Update your saved location for accurate distances." },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [coords, setCoords] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [pharmacies, setPharmacies] = useState([]);
  const [loadingPharmacies, setLoadingPharmacies] = useState(true);
  const [radiusWidened, setRadiusWidened] = useState(false);

  useEffect(() => {
    if (!user) return;
    // The profile location is a deliberate choice the user made (e.g. set to
    // their home or a city they're shopping for), so it takes priority over
    // live device GPS when it's set -- otherwise fall back to GPS, then a
    // hardcoded default.
    if (user.location_lat) {
      setCoords({ lat: user.location_lat, lng: user.location_lng });
      return;
    }
    getCurrentPosition()
      .then((pos) => setCoords(pos))
      .catch(() => {
        setUsingFallback(true);
        setCoords(AHMEDABAD_FALLBACK);
      });
  }, [user]);

  useEffect(() => {
    if (!coords) return;
    setLoadingPharmacies(true);
    client
      .get("/pharmacies/nearby/", { params: { lat: coords.lat, lng: coords.lng, radius_km: 8 } })
      .then((res) => { setPharmacies(res.data.results); setRadiusWidened(res.data.radius_widened); })
      .catch(() => { setPharmacies([]); toast.error("Couldn't load nearby pharmacies."); })
      .finally(() => setLoadingPharmacies(false));
  }, [coords]);

  useEffect(() => {
    if (query.trim().length < 2) return setSuggestions([]);
    const timeout = setTimeout(() => {
      client.get("/catalog/autocomplete/", { params: { q: query } })
        .then((res) => setSuggestions(res.data.suggestions))
        .catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  const runSearch = (q) => {
    const term = q ?? query;
    if (!term.trim()) return;
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <div className="page page-wide stack" style={{ gap: 28 }}>
      <div>
        <h1>{user?.username ? `Welcome back, ${user.username}` : "Find your medicine"}</h1>
        <p className="muted">Compare branded and generic prices at pharmacies near you.</p>
      </div>

      {usingFallback && (
        <div className="disclaimer row" style={{ alignItems: "center", gap: 10 }}>
          <MapPin className="h-4 w-4" style={{ flexShrink: 0 }} />
          <span>
            We couldn't access your device location and you haven't set one in your profile, so
            we're showing a default location.{" "}
            <a href="/profile" className="link-btn" style={{ display: "inline" }}>Set your location</a> for
            accurate results.
          </span>
        </div>
      )}

      <div className="hero-search">
        <div className="section-eyebrow">Search the catalog</div>
        <h2 style={{ fontSize: 22, marginBottom: 14 }}>What medicine are you looking for?</h2>
        <div className="row">
          <input
            className="input"
            placeholder="Search medicine name, e.g. Paracetamol or Dolo 650"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
          />
          <button className="btn" onClick={() => runSearch()}>
            <span className="row" style={{ gap: 6 }}><Search className="h-4 w-4" /> Search</span>
          </button>
        </div>

        {suggestions.length > 0 ? (
          <div className="stack" style={{ marginTop: 10, gap: 2 }}>
            {suggestions.map((s) => (
              <button key={s} className="link-btn" style={{ textAlign: "left", padding: "6px 0" }} onClick={() => runSearch(s)}>
                {s}
              </button>
            ))}
          </div>
        ) : (
          <div className="search-tags">
            <span className="tag-label">Popular:</span>
            {POPULAR_SEARCHES.map((term) => (
              <button key={term} className="search-tag" onClick={() => runSearch(term)}>
                {term}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bento-grid">
        <div className="bento-span-7">
          <PrescriptionUpload />
        </div>

        <div className="bento-span-5 bento-col">
          {QUICK_ACTIONS.map(({ to, icon: Icon, title, desc }) => (
            <a key={to} className="dash-tile" href={to}>
              <div className="card row spread" style={{ alignItems: "flex-start" }}>
                <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
                  <div className="icon-badge"><Icon className="h-5 w-5" /></div>
                  <div>
                    <h2 style={{ fontSize: 15, marginBottom: 3 }}>{title}</h2>
                    <p className="muted" style={{ marginTop: 0 }}>{desc}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-700" style={{ flexShrink: 0, marginTop: 4 }} />
              </div>
            </a>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <div className="icon-badge"><MapPin className="h-4 w-4" /></div>
          <h2>Pharmacies near you</h2>
        </div>
        {radiusWidened && !loadingPharmacies && pharmacies.length > 0 && (
          <p className="muted" style={{ marginBottom: 12 }}>None within the usual radius, so this widens the search to 50km.</p>
        )}
        {loadingPharmacies ? (
          <div className="skeleton" style={{ height: 320, width: "100%", borderRadius: 12 }} />
        ) : pharmacies.length === 0 ? (
          <div className="empty-state">
            <MapPinOff className="h-7 w-7" />
            <p className="muted" style={{ marginTop: 0 }}>
              No pharmacies found nearby yet. If this is a fresh setup, make sure the backend has
              been seeded (<code>python manage.py seed_demo_data</code>).
            </p>
          </div>
        ) : (
          <PharmacyMap center={coords ? [coords.lat, coords.lng] : null} pharmacies={pharmacies} />
        )}
      </div>
    </div>
  );
}
