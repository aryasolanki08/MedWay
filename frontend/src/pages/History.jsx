import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, BookmarkCheck, Clock, Search, Trash2, LayoutGrid } from "lucide-react";
import client from "../api/client";
import ConfirmModal from "../components/ConfirmModal.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { relativeTime } from "../utils/relativeTime.js";

const TABS = [
  { key: "all", label: "All Activity", icon: LayoutGrid },
  { key: "saved", label: "Saved Medicines", icon: Bookmark },
  { key: "log", label: "Search Log", icon: Clock },
];

export default function History() {
  const navigate = useNavigate();
  const toast = useToast();
  const [history, setHistory] = useState([]);
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [confirmClear, setConfirmClear] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      client.get("/customer/history/"),
      client.get("/customer/saved/"),
    ])
      .then(([h, s]) => {
        setHistory(h.data.results ?? h.data);
        setSaved(s.data.results ?? s.data);
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

  const showSaved = tab === "all" || tab === "saved";
  const showLog = tab === "all" || tab === "log";

  if (loading) {
    return (
      <div className="page page-wide stack">
        <div>
          <h1>Activity hub</h1>
          <p className="muted">Saved medicines and your search log in one place.</p>
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
        <p className="muted">Saved medicines and your search log in one place.</p>
      </div>

      <div className="tab-bar">
        {TABS.map(({ key, label, icon: Icon }) => {
          const count = key === "saved" ? saved.length : null;
          return (
            <button key={key} className={`tab-btn${tab === key ? " active" : ""}`} onClick={() => setTab(key)}>
              <Icon className="h-4 w-4" />
              {label}
              {count != null && <span className="count-pill">{count}</span>}
            </button>
          );
        })}
      </div>

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

      {confirmClear && (
        <ConfirmModal
          title="Clear your entire search log?"
          body="This removes all recent searches. Saved medicines aren't affected."
          confirmLabel="Clear history"
          onConfirm={clearAllHistory}
          onClose={() => setConfirmClear(false)}
        />
      )}
    </div>
  );
}
