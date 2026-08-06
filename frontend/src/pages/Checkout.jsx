import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ShoppingBag, Trash2 } from "lucide-react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { loadRazorpayScript } from "../utils/razorpay.js";

export default function Checkout() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { pharmacyId, pharmacyName, items, total, updateQuantity, removeItem, clear } = useCart();

  const [address, setAddress] = useState(user?.location_label || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [placing, setPlacing] = useState(false);

  const payForOrder = async () => {
    if (!address.trim() || !phone.trim()) {
      toast.error("Add a delivery address and phone number.");
      return;
    }
    setPlacing(true);
    try {
      const { data: order } = await client.post("/customer/orders/", {
        pharmacy: pharmacyId,
        delivery_address: address,
        delivery_phone: phone,
        items: items.map((i) => ({ stock: i.stock_id, quantity: i.quantity })),
      });

      const { data: payment } = await client.post(`/customer/orders/${order.id}/create_payment/`);

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Failed to load Razorpay SDK. Check your connection.");
        setPlacing(false);
        return;
      }

      const verify = async (response) => {
        try {
          await client.post(`/customer/orders/${order.id}/verify_payment/`, {
            razorpay_order_id: response.razorpay_order_id || payment.order_id,
            razorpay_payment_id: response.razorpay_payment_id || `pay_mock_${Math.random().toString(36).slice(2, 11)}`,
            razorpay_signature: response.razorpay_signature || "mock_signature",
          });
          clear();
          toast.success("Order placed! The pharmacy has been notified.");
          navigate("/orders");
        } catch {
          toast.error("Payment verification failed. Your order is unpaid -- try again from My Orders.");
        } finally {
          setPlacing(false);
        }
      };

      const options = {
        key: payment.key_id,
        amount: payment.amount,
        currency: payment.currency,
        name: "MedWay",
        description: `Order from ${pharmacyName}`,
        order_id: payment.is_mock ? undefined : payment.order_id,
        handler: verify,
        prefill: {
          name: user?.username || "",
          email: user?.email || "",
          contact: phone,
        },
        theme: { color: "#10b981" },
      };

      if (payment.is_mock) {
        if (window.confirm(`[TEST MODE] Pay ₹${(payment.amount / 100).toFixed(2)} to ${pharmacyName}?`)) {
          verify({ razorpay_order_id: payment.order_id });
        } else {
          setPlacing(false);
        }
      } else {
        new window.Razorpay(options).open();
        setPlacing(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.items || err.response?.data?.detail || "Couldn't place your order.");
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="page stack">
        <div className="card empty-state">
          <ShoppingBag className="h-8 w-8" />
          <p className="muted" style={{ marginTop: 0 }}>
            Your cart is empty. Search for a medicine and add it to cart to order for delivery.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page stack">
      <h1>Checkout</h1>

      <div className="card stack">
        <div className="row spread">
          <h2 style={{ margin: 0 }}>Order from {pharmacyName}</h2>
          <button className="icon-btn" title="Clear cart" onClick={clear} aria-label="Clear cart">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {items.map((item) => (
          <div key={item.stock_id} className="row spread" style={{ alignItems: "center" }}>
            <div>
              <div className="name">{item.brand_name}</div>
              <div className="meta">₹{item.price.toFixed(2)} each</div>
            </div>
            <div className="row" style={{ gap: 8, alignItems: "center" }}>
              <input
                className="input"
                type="number"
                min={1}
                max={item.maxQuantity}
                value={item.quantity}
                onChange={(e) => updateQuantity(item.stock_id, Number(e.target.value) || 1)}
                style={{ width: 70 }}
              />
              <span style={{ minWidth: 70, textAlign: "right" }}>
                ₹{(item.price * item.quantity).toFixed(2)}
              </span>
              <button className="icon-btn" onClick={() => removeItem(item.stock_id)} aria-label="Remove">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        <div className="row spread" style={{ borderTop: "1px solid rgb(226 232 240 / 0.6)", paddingTop: 10 }}>
          <strong>Total</strong>
          <strong>₹{total.toFixed(2)}</strong>
        </div>
      </div>

      <div className="card stack">
        <h2>Delivery details</h2>
        <label className="stack" style={{ gap: 6 }}>
          <span className="muted" style={{ fontSize: 13 }}>Delivery address</span>
          <textarea
            className="input"
            rows={3}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Flat / street / area / city"
          />
        </label>
        <label className="stack" style={{ gap: 6 }}>
          <span className="muted" style={{ fontSize: 13 }}>Phone number</span>
          <input
            className="input"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="For the delivery rider to reach you"
          />
        </label>
        <button className="btn" onClick={payForOrder} disabled={placing}>
          {placing ? "Processing..." : (
            <>
              <CheckCircle2 className="h-4 w-4" /> Pay ₹{total.toFixed(2)} & place order
            </>
          )}
        </button>
        <p className="muted" style={{ fontSize: 12, margin: 0 }}>
          Payment is required upfront -- the pharmacy only sees your order once payment clears, and can accept or reject it.
        </p>
      </div>
    </div>
  );
}
