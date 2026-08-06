import { AlertTriangle } from "lucide-react";

export default function ConfirmModal({ title, body, confirmLabel = "Confirm", danger = true, onConfirm, onClose }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16,
      }}
      onClick={onClose}
    >
      <div className="card stack" style={{ maxWidth: 360, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
          <div className="icon-badge" style={danger ? { background: "rgb(254 226 226)", color: "#dc2626" } : undefined}>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>{title}</h2>
            <p className="muted" style={{ margin: 0, marginTop: 4, fontSize: 13 }}>{body}</p>
          </div>
        </div>
        <div className="row" style={{ gap: 8, marginTop: 4 }}>
          <button className="btn secondary" style={{ flex: 1 }} onClick={onClose}>Never mind</button>
          <button
            className="btn"
            style={{ flex: 1, background: danger ? "#dc2626" : undefined, boxShadow: "none" }}
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
