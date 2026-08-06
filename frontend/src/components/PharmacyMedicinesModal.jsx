import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, PackageSearch } from "lucide-react";
import client from "../api/client";
import { useToast } from "../context/ToastContext.jsx";

export default function PharmacyMedicinesModal({ pharmacy, onClose }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .get(`/pharmacies/${pharmacy.id}/medicines/`)
      .then((res) => setMedicines(res.data.results))
      .catch(() => toast.error("Couldn't load medicines for this pharmacy."))
      .finally(() => setLoading(false));
  }, [pharmacy.id]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
      }}
      onClick={onClose}
    >
      <div className="card stack" style={{ maxWidth: 460, width: "100%", maxHeight: "80vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div className="row spread" style={{ alignItems: "flex-start" }}>
          <div>
            <h2 style={{ margin: 0 }}>{pharmacy.name}</h2>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>{pharmacy.address}</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></button>
        </div>

        {loading && (
          <div className="stack">
            {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 10 }} />)}
          </div>
        )}

        {!loading && medicines.length === 0 && (
          <div className="empty-state">
            <PackageSearch className="h-7 w-7" />
            <p className="muted" style={{ marginTop: 0 }}>No stock listed for this pharmacy right now.</p>
          </div>
        )}

        {!loading && medicines.length > 0 && (
          <div className="stack" style={{ gap: 6 }}>
            {medicines.map((m) => (
              <div key={m.stock_id} className="row spread" style={{ gap: 8, padding: "8px 0", borderBottom: "1px solid rgb(226 232 240 / 0.6)" }}>
                <div>
                  <strong style={{ fontSize: 14 }}>{m.brand_name}</strong>{" "}
                  <span className="muted" style={{ fontSize: 12 }}>{m.salt_name} · {m.strength}</span>
                  {m.is_generic && <span className="badge teal" style={{ marginLeft: 6 }}>Generic</span>}
                </div>
                <div className="row" style={{ gap: 10, flexShrink: 0 }}>
                  <span style={{ fontWeight: 700, color: "#047857" }}>₹{m.price}</span>
                  <button
                    className="link-btn"
                    onClick={() => navigate(`/search?q=${encodeURIComponent(m.brand_name)}`)}
                  >
                    Compare
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
