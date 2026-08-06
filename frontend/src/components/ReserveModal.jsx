import { useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import client from "../api/client";
import { useToast } from "../context/ToastContext.jsx";
import { notifyNotificationsChanged } from "../utils/notificationBus.js";

export default function ReserveModal({ item, onClose }) {
  const toast = useToast();
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(null);

  const submit = () => {
    setSubmitting(true);
    client
      .post("/customer/reservations/", { stock: item.stock_id, quantity })
      .then((res) => { setConfirmed(res.data); notifyNotificationsChanged(); })
      .catch((err) => {
        const msg = err.response?.data?.quantity?.[0] || "Couldn't reserve that medicine.";
        toast.error(msg);
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
      }}
      onClick={onClose}
    >
      <div className="card" style={{ maxWidth: 380, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div className="row spread" style={{ alignItems: "flex-start" }}>
          <h2 style={{ margin: 0 }}>{confirmed ? "Reservation confirmed" : "Reserve for pickup"}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></button>
        </div>

        {!confirmed ? (
          <div className="stack" style={{ marginTop: 14 }}>
            <div>
              <div className="name">{item.brand_name}</div>
              <div className="meta">{item.pharmacy_name} · ₹{item.price.toFixed(2)} each · {item.quantity} in stock</div>
            </div>
            <label className="stack" style={{ gap: 6 }}>
              <span className="muted" style={{ fontSize: 13 }}>Quantity</span>
              <input
                className="input"
                type="number"
                min={1}
                max={item.quantity}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(item.quantity, Number(e.target.value) || 1)))}
              />
            </label>
            <button className="btn" onClick={submit} disabled={submitting}>
              {submitting ? "Reserving..." : `Reserve ${quantity} · ₹${(item.price * quantity).toFixed(2)}`}
            </button>
            <p className="muted" style={{ fontSize: 12, margin: 0 }}>
              This holds the stock at the pharmacy. Pay and collect in person with your pickup code.
            </p>
          </div>
        ) : (
          <div className="stack" style={{ marginTop: 14, alignItems: "center", textAlign: "center" }}>
            <CheckCircle2 className="h-10 w-10" style={{ color: "#16a34a" }} />
            <p className="muted" style={{ margin: 0 }}>
              Show this code at {item.pharmacy_name} to collect your order.
            </p>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: 4 }}>{confirmed.pickup_code}</div>
            <button className="btn secondary" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
