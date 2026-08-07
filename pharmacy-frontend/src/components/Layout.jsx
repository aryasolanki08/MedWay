import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  Receipt,
  Package,
  ShoppingCart,
  History,
  Settings,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  PlusCircle,
  Inbox,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/billing', label: 'Billing / POS', icon: Receipt },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/orders', label: 'Orders', icon: Inbox },
  { to: '/purchases', label: 'Purchases', icon: ShoppingCart },
  { to: '/history', label: 'History', icon: History },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Global F2 keyboard shortcut to trigger Quick Bill
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'F2') {
        if (location.pathname !== '/billing') {
          e.preventDefault();
          navigate('/billing');
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [location.pathname, navigate]);

  const doLogout = () => {
    logout();
    navigate('/login');
  };

  const activeLabel = navItems.find((m) => m.to === location.pathname)?.label || 'MedWay';

  return (
    <div className="app-shell">
      <div className="topbar-wrap">
        <div className="topbar-row">
          <Link to="/dashboard" className="brand-standalone">
            <span className="brand-mark">M</span>
            MedWay <span className="text-brand-500">Medicals</span>
          </Link>

          <header className="topbar">
            <nav className="hidden lg:flex">
              {navItems.map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to} className={location.pathname === to ? 'active' : ''}>
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              ))}
            </nav>

            <div className="row flex items-center shrink-0" style={{ gap: 8 }}>
              {location.pathname !== '/billing' && (
                <button
                  onClick={() => navigate('/billing')}
                  className="hidden sm:flex items-center gap-2 bg-slate-900 dark:bg-slate-950 text-white border border-transparent dark:border-slate-800 hover:bg-slate-800 dark:hover:bg-slate-900 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all duration-150"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Quick Bill</span>
                  <kbd className="hidden md:inline-block bg-slate-800 dark:bg-slate-900 text-[10px] px-1.5 py-0.5 rounded ml-1 font-mono uppercase">
                    F2
                  </kbd>
                </button>
              )}

              <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              <button
                className="icon-btn hidden lg:flex"
                onClick={doLogout}
                aria-label="Log out"
                title={`${user?.user?.username || ''} · Log out`}
              >
                <LogOut className="h-4 w-4" />
              </button>

              <button
                className="icon-btn lg:hidden"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
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
                    className={location.pathname === to ? 'active' : ''}
                    onClick={() => setMenuOpen(false)}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                ))}
                <button onClick={doLogout}>
                  <LogOut className="h-4 w-4" />
                  {user?.user?.username || 'Account'} · Log out
                </button>
              </div>
            )}
          </header>
        </div>
      </div>

      {/* Page header strip */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400 m-0">
          {user?.pharmacy?.name || 'My Pharmacy'}
        </p>
        <h1 className="mt-0.5">{activeLabel}</h1>
      </div>

      <main className="page">{children}</main>
    </div>
  );
};

export default Layout;
