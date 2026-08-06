import { useEffect, useState } from "react";
import { PackageSearch } from "lucide-react";
import client from "../api/client";
import { useToast } from "../context/ToastContext.jsx";

const STATUS_LABEL = {
  pending_payment: "Awaiting payment",
  paid: "Sent to pharmacy",
  accepted: "Accepted -- preparing",
  rejected: "Rejected by pharmacy",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_DOT = {
  pending_payment: "⚪",
  paid: "🟡",
  accepted: "🟢",
  rejected: "🔴",
  out_for_delivery: "🔵",
  delivered: "✅",
  cancelled: "🔴",
};

export default function Orders() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    client
      .get("/customer/orders/")
      .then((res) => setOrders(res.data.results ?? res.data))
      .catch(() => toast.error("Couldn't load your orders."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // Statuses change on the pharmacy's own timeline (accept/out-for-delivery/
    // delivered), so poll for updates rather than requiring a manual refresh.
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page stack">
      <h1>My Orders</h1>

      {loading && <div className="skeleton-row" />}

      {!loading && orders.length === 0 && (
        <div className="card empty-state">
          <PackageSearch className="h-8 w-8" />
          <p className="muted" style={{ marginTop: 0 }}>
            No orders yet. Search a medicine and add it to cart to order for delivery.
          </p>
        </div>
      )}

      <div className="stack">
        {orders.map((order) => (
          <div key={order.id} className="card stack">
            <div className="row spread" style={{ alignItems: "flex-start" }}>
              <div>
                <div className="name">{order.pharmacy_detail?.name}</div>
                <div className="meta">{order.delivery_address}</div>
              </div>
              <span className="badge">
                {STATUS_DOT[order.status]} {STATUS_LABEL[order.status] || order.status}
              </span>
            </div>
            <div className="stack" style={{ gap: 4 }}>
              {order.items.map((item) => (
                <div key={item.id} className="row spread">
                  <span>{item.medicine_name} x {item.quantity}</span>
                  <span>₹{(item.unit_price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="row spread" style={{ borderTop: "1px solid rgb(226 232 240 / 0.6)", paddingTop: 8 }}>
              <strong>Total</strong>
              <strong>₹{Number(order.total_amount).toFixed(2)}</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
