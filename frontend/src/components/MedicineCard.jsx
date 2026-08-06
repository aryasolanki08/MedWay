import { useState } from "react";
import { TrendingUp } from "lucide-react";
import PriceHistoryChart from "./PriceHistoryChart.jsx";

export default function MedicineCard({ item, onSave, onAddToCart }) {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="stack" style={{ gap: 0 }}>
      <div className="medicine-row">
        <div>
          <div className="name">
            {item.brand_name}{" "}
            {item.is_generic && <span className="badge teal" style={{ marginLeft: 8 }}>Generic</span>}
          </div>
          <div className="meta">
            {item.manufacturer} · {item.strength} · {item.form} · {item.pharmacy_name}
          </div>
        </div>
        <div className="row">
          <div className="distance">
            {item.distance_km != null ? `${item.distance_km} km` : ""}
            <div>{item.quantity} in stock</div>
          </div>
          <div className="price">₹{item.price.toFixed(2)}</div>
          <button
            className="icon-btn"
            title="Price trend"
            aria-label="Show price trend"
            onClick={() => setShowHistory((v) => !v)}
          >
            <TrendingUp className="h-4 w-4" />
          </button>
          {onSave && (
            <button className="btn secondary" onClick={() => onSave(item)}>Save</button>
          )}
          {onAddToCart && (
            <button className="btn" onClick={() => onAddToCart(item)} disabled={item.quantity < 1}>
              Add to cart
            </button>
          )}
        </div>
      </div>
      {showHistory && (
        <div style={{ padding: "0 4px 14px" }}>
          <PriceHistoryChart stockId={item.stock_id} />
        </div>
      )}
    </div>
  );
}
