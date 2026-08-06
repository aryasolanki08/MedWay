import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, TrendingDown, Ticket } from "lucide-react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import { onNotificationsChanged } from "../utils/notificationBus.js";

const ICONS = { price_drop: TrendingDown, reservation: Ticket };

function seenKey(username) {
  return `medway_notifications_seen_${username || "anon"}`;
}

function loadSeenIds(username) {
  try {
    return new Set(JSON.parse(localStorage.getItem(seenKey(username)) || "[]"));
  } catch {
    return new Set();
  }
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [seenIds, setSeenIds] = useState(() => loadSeenIds(user?.username));
  const ref = useRef(null);

  const load = () => {
    client.get("/customer/notifications/").then((res) => setItems(res.data.results)).catch(() => {});
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    const unsubscribe = onNotificationsChanged(load);
    return () => { clearInterval(interval); unsubscribe(); };
  }, []);

  // Re-scope "seen" tracking if the logged-in user changes (e.g. logout/login
  // as someone else on the same browser) so one account's read state never
  // leaks into another's.
  useEffect(() => {
    setSeenIds(loadSeenIds(user?.username));
  }, [user?.username]);

  useEffect(() => {
    const onClickOutside = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const unreadCount = items.filter((item) => !seenIds.has(item.id)).length;

  const markAllSeen = () => {
    const next = new Set(seenIds);
    items.forEach((item) => next.add(item.id));
    setSeenIds(next);
    localStorage.setItem(seenKey(user?.username), JSON.stringify([...next]));
  };

  const toggleOpen = () => {
    setOpen((v) => {
      const next = !v;
      if (next) markAllSeen();
      return next;
    });
  };

  const goTo = (item) => {
    setOpen(false);
    navigate(item.type === "reservation" ? "/history" : "/history");
  };

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button className="icon-btn" onClick={toggleOpen} aria-label="Notifications">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute", top: -4, right: -4, background: "#dc2626", color: "white",
              borderRadius: 9999, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16,
              display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px",
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="card stack"
          style={{
            position: "absolute", right: 0, top: "calc(100% + 8px)", width: 320, maxHeight: 400,
            overflowY: "auto", zIndex: 40, gap: 10,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 15 }}>Notifications</h2>
          {items.length === 0 && <p className="muted" style={{ margin: 0, fontSize: 13 }}>Nothing new.</p>}
          {items.map((item) => {
            const Icon = ICONS[item.type] || Bell;
            return (
              <button
                key={item.id}
                onClick={() => goTo(item)}
                className="row"
                style={{
                  gap: 10, alignItems: "flex-start", textAlign: "left", background: "none",
                  border: 0, padding: 0, cursor: "pointer", color: "inherit",
                }}
              >
                <div className="icon-btn" style={{ pointerEvents: "none", flexShrink: 0 }}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{item.title}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{item.body}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
