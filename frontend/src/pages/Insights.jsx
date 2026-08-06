import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, AreaChart, Area,
} from "recharts";
import { Search, Bookmark, PiggyBank, Download, Lightbulb, TrendingUp, TrendingDown, Package, IndianRupee } from "lucide-react";
import client from "../api/client";
import { useToast } from "../context/ToastContext.jsx";

const RANGES = [
  { key: "7d", label: "Last 7 Days" },
  { key: "30d", label: "30 Days" },
  { key: "ytd", label: "Year to Date" },
  { key: "custom", label: "Custom" },
];

// Fixed categorical sequence -- assigned by position, never re-cycled or
// reassigned when the filtered set changes, so a category's color stays
// stable across range changes.
const CATEGORY_COLORS = ["#059669", "#14b8a6", "#0ea5e9", "#f59e0b", "#8b5cf6", "#f43f5e", "#94a3b8"];

function Sparkline({ series, color, dataKey = "count" }) {
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={series} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#spark-${color})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function BarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 12, boxShadow: "0 4px 12px rgba(15,23,42,0.08)" }}>
      <div style={{ fontWeight: 700, marginBottom: 2 }}>{p.name}</div>
      <div>{p.count} search{p.count === 1 ? "" : "es"} · {p.share_pct}% of total</div>
    </div>
  );
}

export default function Insights() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  useEffect(() => {
    if (range === "custom" && (!customStart || !customEnd)) return;
    setLoading(true);
    const params = { range };
    if (range === "custom") { params.start = customStart; params.end = customEnd; }
    client.get("/customer/insights/", { params })
      .then((res) => setData(res.data))
      .catch(() => toast.error("Couldn't load insights."))
      .finally(() => setLoading(false));
  }, [range, customStart, customEnd]);

  const exportReport = () => {
    if (!data) return;
    const lines = [
      `MedWay Insights Report`,
      `Period,${data.period_start} to ${data.period_end}`,
      `Total Searches,${data.total_searches}`,
      `Saved Medicines,${data.saved_medicines_count}`,
      `Potential Generic Savings,₹${data.generic_savings_potential}`,
      `Orders Placed,${data.total_orders_placed}`,
      `Orders Delivered,${data.delivered_orders_count}`,
      `Total Spent (Delivered Orders),₹${data.total_spent}`,
      ``,
      `Most Ordered,Quantity`,
      ...data.most_ordered.map((m) => `${m.medicine_name},${m.quantity}`),
      ``,
      `Most Searched,Count,Share %`,
      ...data.most_searched.map((m) => `${m.query},${m.count},${m.share_pct}`),
      ``,
      `Category,Count,Share %`,
      ...data.category_breakdown.map((c) => `${c.category},${c.count},${c.share_pct}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medway-insights-${data.period_start}-to-${data.period_end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  };

  const mostSearched = useMemo(
    () => (data?.most_searched || []).map((m) => ({ name: m.query, count: m.count, share_pct: m.share_pct })),
    [data]
  );
  const categories = useMemo(
    () => (data?.category_breakdown || []).map((c, i) => ({ name: c.category, value: c.count, share_pct: c.share_pct, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] })),
    [data]
  );
  const mostOrdered = useMemo(
    () => (data?.most_ordered || []).map((m) => ({ name: m.medicine_name, count: m.quantity })),
    [data]
  );

  return (
    <div className="page page-wide stack" style={{ gap: 22 }}>
      <div className="row spread wrap" style={{ gap: 12 }}>
        <div>
          <h1>Your insights</h1>
          <p className="muted">Search patterns, real order spend, and generic-switch savings, based on your activity.</p>
        </div>
        <button className="icon-btn" onClick={exportReport} title="Export Report" disabled={!data}>
          <span className="row" style={{ gap: 6, fontSize: 13, fontWeight: 600 }}>
            <Download className="h-4 w-4" /> Export
          </span>
        </button>
      </div>

      <div className="stack" style={{ gap: 10 }}>
        <div className="filter-bar">
          {RANGES.map((r) => (
            <button key={r.key} className={`filter-pill${range === r.key ? " active" : ""}`} onClick={() => setRange(r.key)}>
              {r.label}
            </button>
          ))}
        </div>
        {range === "custom" && (
          <div className="row" style={{ gap: 10 }}>
            <input type="date" className="input" style={{ maxWidth: 180 }} value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            <span className="muted">to</span>
            <input type="date" className="input" style={{ maxWidth: 180 }} value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
          </div>
        )}
      </div>

      {loading && <div className="skeleton" style={{ height: 300, width: "100%", borderRadius: 16 }} />}

      {!loading && (!data || (data.total_searches === 0 && data.total_orders_placed === 0)) && (
        <div className="card empty-state">
          <Search className="h-7 w-7" />
          <p className="muted" style={{ marginTop: 0 }}>
            No searches or orders in this period. Once you look up a few medicines or place an
            order, this page fills in with your patterns, spend, and potential savings.
          </p>
        </div>
      )}

      {!loading && data && (data.total_searches > 0 || data.total_orders_placed > 0) && (
        <>
          <div className="bento-grid">
            <div className="bento-span-7">
              <div className="bento-feature" style={{ minHeight: 150 }}>
                <div className="section-eyebrow" style={{ color: "rgb(255 255 255 / 0.8)" }}>Potential generic savings</div>
                <div className="row spread" style={{ alignItems: "flex-end", flex: 1 }}>
                  <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1 }}>₹{data.generic_savings_potential}</div>
                  {data.generic_savings_trend_pct != null && (
                    <span
                      className="row"
                      style={{
                        gap: 4, fontSize: 13, fontWeight: 700, padding: "5px 10px", borderRadius: 999,
                        background: "rgb(255 255 255 / 0.16)",
                      }}
                    >
                      {data.generic_savings_trend_pct >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      {Math.abs(data.generic_savings_trend_pct)}% vs previous period
                    </span>
                  )}
                </div>
                <p style={{ color: "rgb(255 255 255 / 0.75)", fontSize: 13, margin: 0, marginTop: 8 }}>
                  If you always picked the cheapest generic for what you searched this period.
                </p>
              </div>
            </div>

            <div className="bento-span-5 bento-col">
              <div className="card" style={{ flex: 1 }}>
                <div className="row spread" style={{ alignItems: "flex-start" }}>
                  <div>
                    <div className="muted" style={{ fontSize: 13 }}>Total searches</div>
                    <div style={{ fontSize: 26, fontWeight: 800 }}>{data.total_searches}</div>
                  </div>
                  <div className="icon-badge"><Search className="h-4 w-4" /></div>
                </div>
                <Sparkline series={data.daily_search_series} color="#059669" />
              </div>
              <div className="card" style={{ flex: 1 }}>
                <div className="row spread" style={{ alignItems: "flex-start" }}>
                  <div>
                    <div className="muted" style={{ fontSize: 13 }}>Saved medicines</div>
                    <div style={{ fontSize: 26, fontWeight: 800 }}>{data.saved_medicines_count}</div>
                  </div>
                  <div className="icon-badge"><Bookmark className="h-4 w-4" /></div>
                </div>
                <Sparkline series={data.daily_saved_series} color="#0ea5e9" />
              </div>
            </div>
          </div>

          <div className="bento-grid">
            <div className="bento-span-7">
              <div className="bento-feature" style={{ minHeight: 150, background: "linear-gradient(135deg, #0ea5e9, #0369a1)" }}>
                <div className="section-eyebrow" style={{ color: "rgb(255 255 255 / 0.8)" }}>Spent on delivered orders</div>
                <div className="row spread" style={{ alignItems: "flex-end", flex: 1 }}>
                  <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1 }}>₹{data.total_spent}</div>
                  {data.spend_trend_pct != null && (
                    <span
                      className="row"
                      style={{
                        gap: 4, fontSize: 13, fontWeight: 700, padding: "5px 10px", borderRadius: 999,
                        background: "rgb(255 255 255 / 0.16)",
                      }}
                    >
                      {data.spend_trend_pct >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      {Math.abs(data.spend_trend_pct)}% vs previous period
                    </span>
                  )}
                </div>
                <p style={{ color: "rgb(255 255 255 / 0.75)", fontSize: 13, margin: 0, marginTop: 8 }}>
                  Real total across {data.delivered_orders_count} order{data.delivered_orders_count === 1 ? "" : "s"} actually delivered this period.
                </p>
              </div>
            </div>

            <div className="bento-span-5 bento-col">
              <div className="card" style={{ flex: 1 }}>
                <div className="row spread" style={{ alignItems: "flex-start" }}>
                  <div>
                    <div className="muted" style={{ fontSize: 13 }}>Orders placed</div>
                    <div style={{ fontSize: 26, fontWeight: 800 }}>{data.total_orders_placed}</div>
                  </div>
                  <div className="icon-badge"><Package className="h-4 w-4" /></div>
                </div>
                <Sparkline series={data.daily_spend_series} color="#0ea5e9" dataKey="amount" />
              </div>
              <div className="card" style={{ flex: 1 }}>
                <div className="row spread" style={{ alignItems: "flex-start" }}>
                  <div>
                    <div className="muted" style={{ fontSize: 13 }}>Orders delivered</div>
                    <div style={{ fontSize: 26, fontWeight: 800 }}>{data.delivered_orders_count}</div>
                  </div>
                  <div className="icon-badge"><IndianRupee className="h-4 w-4" /></div>
                </div>
                <Sparkline series={data.daily_spend_series} color="#059669" dataKey="amount" />
              </div>
            </div>
          </div>

          {mostOrdered.length > 0 && (
            <div className="card">
              <h2>Most ordered</h2>
              <ResponsiveContainer width="100%" height={Math.max(120, mostOrdered.length * 46)}>
                <BarChart data={mostOrdered} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => [`${value} unit${value === 1 ? "" : "s"}`, "Ordered"]} />
                  <Bar dataKey="count" fill="#0ea5e9" radius={[999, 999, 999, 999]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="bento-grid">
            <div className="bento-span-7">
              <div className="card" style={{ height: "100%" }}>
                <h2>Most searched</h2>
                <ResponsiveContainer width="100%" height={Math.max(160, mostSearched.length * 46)}>
                  <BarChart data={mostSearched} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<BarTooltip />} cursor={{ fill: "rgba(16,185,129,0.06)" }} />
                    <Bar dataKey="count" fill="#059669" radius={[999, 999, 999, 999]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bento-span-5">
              <div className="card" style={{ height: "100%" }}>
                <h2>By category</h2>
                {categories.length === 0 ? (
                  <p className="muted">No categorized searches yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={categories} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2} stroke="none">
                        {categories.map((c) => <Cell key={c.name} fill={c.color} />)}
                      </Pie>
                      <Tooltip formatter={(value, name, entry) => [`${value} (${entry.payload.share_pct}%)`, name]} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {data.top_insight && (
            <div className="card" style={{ background: "linear-gradient(135deg, rgb(236 253 245 / 0.7), rgb(255 255 255))", border: "1.5px solid rgb(16 185 129 / 0.3)" }}>
              <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
                <div className="icon-badge"><Lightbulb className="h-5 w-5" /></div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
                  <strong>Insight:</strong> "{data.top_insight.top_query}" is your most searched term
                  ({data.top_insight.search_count} search{data.top_insight.search_count === 1 ? "" : "es"}).
                  Switching to generic <strong>{data.top_insight.generic_brand_name}</strong>
                  {data.top_insight.generic_strength && ` (${data.top_insight.generic_strength})`} can save you
                  up to <strong>₹{data.top_insight.savings_amount}</strong> on your next order.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
