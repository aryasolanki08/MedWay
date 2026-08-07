import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Stethoscope, History, User, LogOut, Sun, Moon, Menu, X, BarChart3, Store, Package, ShoppingCart, MessageCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import NotificationBell from "./NotificationBell.jsx";
import AskAnythingModal from "./AskAnythingModal.jsx";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pharmacies", label: "All pharmacies", icon: Store },
  { to: "/assistant", label: "Medicine info", icon: Stethoscope },
  { to: "/insights", label: "Insights", icon: BarChart3 },
  { to: "/orders", label: "My Orders", icon: Package },
  { to: "/history", label: "History", icon: History },
  { to: "/profile", label: "Profile", icon: User },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { count } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);

  const doLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="topbar-wrap">
      <div className="topbar-row">
        <Link to="/" className="brand-standalone">
          <span className="brand-mark">M</span>
          MedWay
        </Link>

        <header className="topbar">
          <nav className="hidden xl:flex">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className={location.pathname === to ? "active" : ""}>
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          <div className="row shrink-0" style={{ gap: 8 }}>
            <Link to="/checkout" className="icon-btn" aria-label="Cart" style={{ position: "relative" }}>
              <ShoppingCart className="h-4 w-4" />
              {count > 0 && (
                <span
                  className="badge gold"
                  style={{ position: "absolute", top: -6, right: -6, fontSize: 10, padding: "1px 5px", lineHeight: 1.4 }}
                >
                  {count}
                </span>
              )}
            </Link>
            <NotificationBell />
            <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              className="icon-btn hidden xl:flex"
              onClick={doLogout}
              aria-label="Log out"
              title={`${user?.username} · Log out`}
            >
              <LogOut className="h-4 w-4" />
            </button>
            <button
              className="icon-btn xl:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>

          {menuOpen && (
            <div className="mobile-menu">
              {navItems.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={location.pathname === to ? "active" : ""}
                  onClick={() => setMenuOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
              <button onClick={doLogout}>
                <LogOut className="h-4 w-4" />
                {user?.username} · Log out
              </button>
            </div>
          )}
        </header>
      </div>

      <button
        className="ask-fab"
        onClick={() => setAskOpen(true)}
        aria-label="Ask anything"
        title="Ask anything"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {askOpen && <AskAnythingModal onClose={() => setAskOpen(false)} />}
    </div>
  );
}
