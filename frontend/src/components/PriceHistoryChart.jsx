import { useEffect, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import client from "../api/client";

export default function PriceHistoryChart({ stockId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    client
      .get(`/pharmacies/stock/${stockId}/price-history/`)
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [stockId]);

  if (loading) return <div className="skeleton" style={{ height: 160, width: "100%", borderRadius: 12 }} />;
  if (error || !data) return <p className="muted">Couldn't load price history.</p>;

  const points = data.history.map((h) => ({ ...h, label: h.date.slice(5) }));
  const trendUp = data.change_pct != null && data.change_pct > 0;
  const trendDown = data.change_pct != null && data.change_pct < 0;

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row spread wrap" style={{ alignItems: "baseline" }}>
        <div className="muted" style={{ fontSize: 13 }}>
          30-day price at {data.pharmacy_name} · min ₹{data.min_price} · max ₹{data.max_price}
        </div>
        {data.change_pct != null && (
          <span className={`badge ${trendDown ? "green" : trendUp ? "red" : "teal"}`}>
            {trendDown ? "▼" : trendUp ? "▲" : "–"} {Math.abs(data.change_pct)}% over 30 days
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={points} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={5} />
          <YAxis tick={{ fontSize: 11 }} domain={["dataMin - 2", "dataMax + 2"]} />
          <Tooltip
            formatter={(value) => [`₹${value}`, "Price"]}
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
          />
          <Line type="monotone" dataKey="price" stroke="#16a34a" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
