import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, BookmarkCheck, Clock, Ticket, Search, Navigation, XCircle, Trash2, LayoutGrid } from "lucide-react";
import client from "../api/client";
import ConfirmModal from "../components/ConfirmModal.jsx";
import PickupCodeBadge from "../components/PickupCodeBadge.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { relativeTime } from "../utils/relativeTime.js";
import { notifyNotificationsChanged } from "../utils/notificationBus.js";

const STATUS_LABEL = { pending: "Pending Pickup", picked_up: "Picked Up", cancelled: "Cancelled" };
const STATUS_DOT = { pending: "🟡", picked_up: "🟢", cancelled: "🔴" };

const TABS = [
  { key: "all", label: "All Activity", icon: LayoutGrid },
  { key: "saved", label: "Saved Medicines", icon: Bookmark },
  { key: "reservations", label: "Reservations", icon: Ticket },
  { key: "log", label: "Search Log", icon: Clock },
];

export default function History() {
  const navigate = useNavigate();
  const toast = useToast();
  const [history, setHistory] = useState([]);
  const [saved, setSaved] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      client.get("/customer/history/"),
      client.get("/customer/saved/"),
      client.get("/customer/reservations/"),
    ])
      .then(([h, s, r]) => {
        setHistory(h.data.results ?? h.data);
        setSaved(s.data.results ?? s.data);
        setReservations(r.data.results ?? r.data);
      })
      .catch(() => toast.error("Couldn't load your history."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const removeHistory = (id) => {
    client.delete(`/customer/history/${id}/`)
      .then(() => { load(); toast.info("Search removed"); })
      .catch(() => toast.error("Couldn't remove that search."));
  };

  const clearAllHistory = () => {
    client.delete("/customer/history/clear_all/")
      .then(() => { load(); toast.info("Search log cleared"); })
      .catch(() => toast.error("Couldn't clear history."));
  };

  const removeSaved = (id) => {
    client.delete(`/customer/saved/${id}/`)
      .then(() => { load(); toast.info("Medicine removed from saved"); })
      .catch(() => toast.error("Couldn't remove that medicine."));
  };

  const cancelReservation = (id) => {
    client.post(`/customer/reservations/${id}/cancel/`)
      .then(() => { load(); toast.info("Reservation cancelled"); notifyNotificationsChanged(); })
      .catch(() => toast.error("Couldn't cancel that reservation."));
  };

  const pendingCount = useMemo(() => reservations.filter((r) => r.status === "pending").length, [reservations]);

  const directionsUrl = (pharmacy) => `https://www.openstreetmap.org/directions?to=${pharmacy.lat}%2C${pharmacy.lng}`;

  const showSaved = tab === "all" || tab === "saved";
  const showReservations = tab === "all" || tab === "reservations";
  const showLog = tab === "all" || tab === "log";

  if (loading) {
    return (
      <div className="page page-wide stack">
        <div>
          <h1>Activity hub</h1>
          <p className="muted">Saved medicines, reservations, and your search log in one place.</p>
        </div>
        <div className="card stack">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton-row">
              <div className="stack" style={{ gap: 8, flex: 1 }}>
                <div className="skeleton" style={{ height: 14, width: "35%" }} />
                <div className="skeleton" style={{ height: 11, width: "55%" }} />
              </div>
              <div className="skeleton" style={{ height: 32, width: 90 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page page-wide stack" style={{ gap: 22 }}>
      <div>
        <h1>Activity hub</h1>
        <p className="muted">Saved medicines, reservations, and your search log in one place.</p>
      </div>

      <div className="tab-bar">
        {TABS.map(({ key, label, icon: Icon }) => {
          const count = key === "saved" ? saved.length : key === "reservations" ? reservations.length : null;
          return (
            <button key={key} className={`tab-btn${tab === key ? " active" : ""}`} onClick={() => setTab(key)}>
              <Icon className="h-4 w-4" />
              {label}
              {count != null && <span className="count-pill">{count}</span>}
            </button>
          );
        })}
      </div>

      {showReservations && (
        <div className="stack" style={{ gap: 12 }}>
          <div className="section-header">
            <div className="icon-badge"><Ticket className="h-4 w-4" /></div>
            <h2>Reservations{pendingCount > 0 && <span className="muted" style={{ fontWeight: 500, fontSize: 13, marginLeft: 8 }}>{pendingCount} pending</span>}</h2>
          </div>

          {reservations.length === 0 && (
            <div className="card empty-state">
              <Ticket className="h-7 w-7" />
              <p className="muted" style={{ marginTop: 0 }}>No reservations yet. Reserve a medicine from any search result.</p>
            </div>
          )}

          <div className="stack" style={{ gap: 10 }}>
            {reservations.map((r) => (
              <div key={r.id} className={`pass-card status-${r.status}`}>
                <div className="row spread wrap" style={{ gap: 12, alignItems: "flex-start" }}>
                  <div>
                    <div className="row" style={{ gap: 8 }}>
                      <span className="name">{r.stock_detail?.medicine_name}</span>
                      <span className={`status-pill status-${r.status}`}>
                        {STATUS_DOT[r.status]} {STATUS_LABEL[r.status]} at {r.stock_detail?.pharmacy?.name}
                      </span>
                    </div>
                    <div className="meta" style={{ marginTop: 2 }}>
                      Qty {r.quantity} · ₹{r.reserved_price} each · reserved {relativeTime(r.created_at)}
                    </div>

                    {r.status === "pending" && (
                      <div style={{ marginTop: 12 }}>
                        <PickupCodeBadge code={r.pickup_code} />
                      </div>
                    )}
                  </div>

                  {r.status === "pending" && (
                    <div className="row" style={{ gap: 8, flexShrink: 0 }}>
                      <button
                        className="icon-btn"
                        title="Get directions"
                        onClick={() => window.open(directionsUrl(r.stock_detail.pharmacy), "_blank")}
                      >
                        <Navigation className="h-4 w-4" />
                      </button>
                      <button
                        className="btn secondary"
                        style={{ color: "#dc2626", borderColor: "#fecaca" }}
                        onClick={() => setConfirmCancel(r)}
                      >
                        <span className="row" style={{ gap: 6 }}><XCircle className="h-4 w-4" /> Cancel</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showSaved && (
        <div className="stack" style={{ gap: 12 }}>
          <div className="section-header">
            <div className="icon-badge"><Bookmark className="h-4 w-4" /></div>
            <h2>Saved medicines</h2>
          </div>

          {saved.length === 0 && (
            <div className="card empty-state">
              <Bookmark className="h-7 w-7" />
              <p className="muted" style={{ marginTop: 0 }}>Nothing saved yet. Save a medicine from any search result.</p>
            </div>
          )}

          <div className="med-compare-grid">
            {saved.map((s) => {
              const trend = s.price_trend;
              return (
                <div key={s.id} className="med-card">
                  <div className="row spread" style={{ alignItems: "flex-start", gap: 8 }}>
                    <div>
                      <div className="name">{s.medicine_detail?.brand_name}</div>
                      <div className="meta">
                        {s.medicine_detail?.salt_name} · {s.medicine_detail?.strength}
                        {s.medicine_detail?.is_generic && <span className="badge teal" style={{ marginLeft: 6 }}>Generic</span>}
                      </div>
                    </div>
                    <button className="icon-btn" title="Remove from saved" onClick={() => removeSaved(s.id)}>
                      <BookmarkCheck className="h-4 w-4" style={{ color: "#059669" }} />
                    </button>
                  </div>

                  {trend?.change_pct != null && trend.trend !== "flat" ? (
                    <div style={{ marginTop: 10 }}>
                      <span className={`badge ${trend.trend === "down" ? "green" : "gold"}`}>
                        {trend.trend === "down" ? "▼" : "▲"} {Math.abs(trend.change_pct)}% vs last week · best ₹{trend.best_current_price}
                      </span>
                    </div>
                  ) : trend?.best_current_price != null && (
                    <div style={{ marginTop: 10 }}>
                      <span className="badge teal">Best price ₹{trend.best_current_price}</span>
                    </div>
                  )}

                  <button
                    className="btn"
                    style={{ width: "100%", marginTop: 12 }}
                    onClick={() => navigate(`/search?q=${encodeURIComponent(s.medicine_detail?.salt_name || s.medicine_detail?.brand_name)}`)}
                  >
                    Compare Prices
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showLog && (
        <div className="stack" style={{ gap: 12 }}>
          <div className="row spread" style={{ alignItems: "center" }}>
            <div className="section-header" style={{ marginBottom: 0 }}>
              <div className="icon-badge"><Clock className="h-4 w-4" /></div>
              <h2>Search log</h2>
            </div>
            {history.length > 0 && (
              <button className="link-btn row" style={{ gap: 4 }} onClick={() => setConfirmClear(true)}>
                <Trash2 className="h-3.5 w-3.5" /> Clear history
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="card empty-state">
              <Clock className="h-7 w-7" />
              <p className="muted" style={{ marginTop: 0 }}>No searches yet.</p>
            </div>
          ) : (
            <div className="card">
              <div className="timeline">
                {history.map((h) => (
                  <div key={h.id} className="timeline-item">
                    <div className="timeline-dot" />
                    <div className="row spread" style={{ flex: 1, gap: 8 }}>
                      <div>
                        <div className="name">{h.query}</div>
                        <div className="meta">{relativeTime(h.searched_at)}</div>
                      </div>
                      <div className="row" style={{ gap: 4, flexShrink: 0 }}>
                        <button className="icon-btn" title="Search again" onClick={() => navigate(`/search?q=${encodeURIComponent(h.query)}`)}>
                          <Search className="h-3.5 w-3.5" />
                        </button>
                        <button className="link-btn" onClick={() => removeHistory(h.id)} style={{ fontSize: 12 }}>Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {confirmCancel && (
        <ConfirmModal
          title="Cancel this reservation?"
          body={`${confirmCancel.stock_detail?.medicine_name} at ${confirmCancel.stock_detail?.pharmacy?.name} will be released back to stock.`}
          confirmLabel="Cancel reservation"
          onConfirm={() => cancelReservation(confirmCancel.id)}
          onClose={() => setConfirmCancel(null)}
        />
      )}

      {confirmClear && (
        <ConfirmModal
          title="Clear your entire search log?"
          body="This removes all recent searches. Saved medicines and reservations aren't affected."
          confirmLabel="Clear history"
          onConfirm={clearAllHistory}
          onClose={() => setConfirmClear(false)}
        />
      )}
    </div>
  );
}
