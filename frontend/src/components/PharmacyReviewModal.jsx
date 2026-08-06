import { useEffect, useState } from "react";
import { X, Star } from "lucide-react";
import client from "../api/client";
import { useToast } from "../context/ToastContext.jsx";

function StarPicker({ value, onChange }) {
  return (
    <div className="row" style={{ gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          style={{ background: "none", border: 0, cursor: "pointer", padding: 2 }}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          <Star
            className="h-6 w-6"
            style={{ color: n <= value ? "#f59e0b" : "#cbd5e1" }}
            fill={n <= value ? "#f59e0b" : "none"}
          />
        </button>
      ))}
    </div>
  );
}

export default function PharmacyReviewModal({ pharmacy, onClose }) {
  const toast = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    client
      .get("/pharmacies/reviews/", { params: { pharmacy: pharmacy.id } })
      .then((res) => setReviews(res.data.results ?? res.data))
      .catch(() => toast.error("Couldn't load reviews."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [pharmacy.id]);

  const submit = () => {
    setSubmitting(true);
    client
      .post("/pharmacies/reviews/", { pharmacy: pharmacy.id, rating, comment })
      .then(() => { toast.success("Review submitted"); setComment(""); load(); })
      .catch(() => toast.error("Couldn't submit review."))
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
      <div className="card stack" style={{ maxWidth: 420, width: "100%", maxHeight: "80vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div className="row spread" style={{ alignItems: "flex-start" }}>
          <div>
            <h2 style={{ margin: 0 }}>{pharmacy.name}</h2>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>{pharmacy.address}</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></button>
        </div>

        <div className="stack" style={{ gap: 8, borderTop: "1px solid var(--border, #e2e8f0)", paddingTop: 12 }}>
          <span className="muted" style={{ fontSize: 13 }}>Your rating</span>
          <StarPicker value={rating} onChange={setRating} />
          <textarea
            className="input"
            rows={2}
            placeholder="Optional: share your experience"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button className="btn" onClick={submit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit review"}
          </button>
        </div>

        <div className="stack" style={{ gap: 10, borderTop: "1px solid var(--border, #e2e8f0)", paddingTop: 12 }}>
          <span className="muted" style={{ fontSize: 13 }}>
            {reviews.length > 0 ? `${reviews.length} review${reviews.length > 1 ? "s" : ""}` : "No reviews yet"}
          </span>
          {loading && <div className="skeleton" style={{ height: 60, width: "100%", borderRadius: 8 }} />}
          {!loading && reviews.map((r) => (
            <div key={r.id} className="stack" style={{ gap: 2 }}>
              <div className="row" style={{ gap: 6 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className="h-3.5 w-3.5" style={{ color: n <= r.rating ? "#f59e0b" : "#cbd5e1" }} fill={n <= r.rating ? "#f59e0b" : "none"} />
                ))}
                <span className="muted" style={{ fontSize: 12 }}>{r.username}</span>
              </div>
              {r.comment && <p style={{ margin: 0, fontSize: 13 }}>{r.comment}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
