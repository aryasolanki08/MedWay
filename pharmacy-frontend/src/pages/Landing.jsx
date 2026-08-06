import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Activity,
  Plus,
  Minus,
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sun,
  Moon,
  Sparkles,
  TrendingUp,
  Package,
  Receipt,
  Users,
  Shield,
  Clock,
  Printer,
  FileText,
  DollarSign
} from 'lucide-react';

const Landing = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(null);

  // Billing Simulator State
  const initialMedicines = [
    { id: '1', name: 'Amoxicillin 500mg', category: 'Antibiotic', price: 12.50, qty: 2 },
    { id: '2', name: 'Paracetamol 650mg', category: 'Analgesic', price: 4.20, qty: 3 },
    { id: '3', name: 'Atorvastatin 20mg', category: 'Cardiology', price: 24.00, qty: 1 },
    { id: '4', name: 'Metformin 500mg', category: 'Antidiabetic', price: 8.90, qty: 0 },
    { id: '5', name: 'Vitamin C 1000mg', category: 'Supplements', price: 6.00, qty: 4 },
  ];

  const [simulatorItems, setSimulatorItems] = useState(initialMedicines);
  const [discountPercent, setDiscountPercent] = useState(10);
  const [taxPercent, setTaxPercent] = useState(8);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // FAQ Data
  const faqs = [
    {
      q: "What makes MedWay Medicals different from other pharmacy management systems?",
      a: "MedWay Medicals is built with a dual focus: blazing-fast operations and smart clinical assistance. With our F2 hotkey quick billing, intelligent inventory restocking predictions, and multi-role safety checkpoints, we minimize wait times for patients while reducing pharmacy audit errors by up to 92%."
    },
    {
      q: "Can I manage multiple pharmacy branches under a single account?",
      a: "Yes! Our Enterprise tier supports full multi-branch consolidation. You can sync inventories, share supplier sheets, transfer stock between locations, and view aggregated analytics from a unified organization dashboard."
    },
    {
      q: "Is there support for barcoding and barcode scanners?",
      a: "Absolutely. MedWay integrates with standard USB/Bluetooth barcode scanners. You can scan barcodes directly in the POS billing interface to instantly add items, and batch print barcode labels for incoming inventories."
    },
    {
      q: "How does the low-stock and expiry warning system work?",
      a: "The platform monitors batch numbers and expiry dates automatically. Low-stock limits can be custom-set per product. The system sends visual alerts on the dashboard and weekly email digests listing batches expiring within 30/60/90 days."
    },
    {
      q: "Is my pharmacy data secure and backed up?",
      a: "We prioritize security. All data is encrypted both in transit and at rest using banking-grade AES-256 protocols. Daily automated backups are stored across redundant cloud regions, ensuring 99.99% data availability."
    }
  ];

  // Simulator helper functions
  const handleQtyChange = (id, change) => {
    setSimulatorItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const newQty = Math.max(0, item.qty + change);
          return { ...item, qty: newQty };
        }
        return item;
      })
    );
  };

  const getSubtotal = () => {
    return simulatorItems.reduce((acc, item) => acc + (item.price * item.qty), 0);
  };

  const getDiscountValue = () => {
    return (getSubtotal() * discountPercent) / 100;
  };

  const getTaxValue = () => {
    return ((getSubtotal() - getDiscountValue()) * taxPercent) / 100;
  };

  const getTotal = () => {
    return getSubtotal() - getDiscountValue() + getTaxValue();
  };

  const activeItems = simulatorItems.filter(item => item.qty > 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200 font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* 1. HEADER / NAVBAR */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-slate-950/70 border-b border-slate-200/50 dark:border-slate-800/50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-emerald-500/20">
              M
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-wide">
                MedWay
              </span>
              <span className="text-emerald-500 font-bold text-lg ml-0.5">Medicals</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-emerald-500 transition-colors">Features</a>
            <a href="#simulator" className="hover:text-emerald-500 transition-colors">POS Simulator</a>
            <a href="#pricing" className="hover:text-emerald-500 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-emerald-500 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Auth Buttons */}
            {user ? (
              <Link
                to="/dashboard"
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all duration-200 shadow-md shadow-emerald-500/10 flex items-center gap-1.5"
              >
                <span>Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-slate-600 dark:text-slate-300 hover:text-emerald-500 dark:hover:text-emerald-400 font-semibold text-sm transition-colors px-3 py-2"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="btn"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-24 md:pt-20 md:pb-32">
        {/* Colorful background lights */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] aspect-square rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[45%] aspect-square rounded-full bg-teal-500/10 dark:bg-indigo-500/5 blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6">
            
            {/* Sparkle Badge */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-100/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold tracking-wide animate-pulse">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Pharmacy Management, Redefined</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-white leading-[1.1] tracking-tight">
              Empower Your <span className="bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">Pharmacy</span>,
              <br />Simplify Patient Care.
            </h1>

            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
              MedWay Medicals is the modern billing, smart inventory, and clinical POS platform designed specifically for community pharmacies, clinics, and medical retail stores. Make your workflows fast, compliant, and intuitive.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-2">
              <Link
                to={user ? "/dashboard" : "/signup"}
                className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-center px-8 py-4 rounded-xl shadow-lg shadow-emerald-500/15 hover:shadow-emerald-500/25 transition-all duration-200 flex items-center justify-center gap-2 group"
              >
                <span>{user ? "Go to Dashboard" : "Start Free Trial"}</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#simulator"
                className="w-full sm:w-auto border border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold px-8 py-4 rounded-xl text-center transition-colors flex items-center justify-center gap-2"
              >
                <span>Try Live POS Demo</span>
              </a>
            </div>

            {/* Quick trust metrics */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200 dark:border-slate-900/60 w-full max-w-lg">
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">99.99%</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Server Uptime</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">&lt; 3 Secs</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">POS Checkout Time</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">HIPAA</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Compliant Design</p>
              </div>
            </div>

          </div>

          {/* Right Hero Side - Stylish Interactive Card Preview */}
          <div className="lg:col-span-5 relative mt-6 lg:mt-0 flex justify-center">
            {/* Visual background rings */}
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 opacity-10 dark:opacity-5 blur-2xl -z-10" />

            <div className="w-full max-w-[420px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 relative overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">analytics_widget.json</span>
              </div>

              {/* Mock Dashboard metrics */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">Today's Revenue</h3>
                    <p className="text-2xl font-extrabold text-slate-955 dark:text-white mt-1">₹4,850.25</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>

                {/* Simulated Chart preview */}
                <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500">Inventory Status</span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded">Good</span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>Optimal Stock</span>
                        <span>82%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: '82%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>Low Stock Items</span>
                        <span>4 Warnings</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: '25%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dynamic alert item card */}
                <div className="flex items-center gap-3 p-3 rounded-xl border border-rose-100 dark:border-rose-950/20 bg-rose-50/50 dark:bg-rose-950/10">
                  <div className="h-2 w-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-rose-700 dark:text-rose-400 truncate">Expiration Alert</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Paracetamol Batch #4928 expires soon (12 days)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. KEY FEATURES SECTION */}
      <section id="features" className="py-20 bg-white dark:bg-slate-900 border-y border-slate-200/50 dark:border-slate-800/50 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <h2 className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Built for Modern Medicine Retailers</h2>
            <p className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white">
              Say goodbye to legacy lag. Say hello to MedWay.
            </p>
            <p className="text-slate-500 dark:text-slate-400">
              We provide clinical intelligence combined with seamless retail capabilities to ensure your business operations never miss a beat.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-white dark:bg-slate-950 dark:hover:bg-slate-900 transition-all duration-300 hover:shadow-xl hover:shadow-slate-100 dark:hover:shadow-black/20 hover:-translate-y-1">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Receipt className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Instant POS & F2 Quick Bill</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Billing designed for peak pharmacy hours. Press F2 to instantly open POS billing, scan items, apply smart discounts, auto-calculate tax, and print custom layout templates.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-white dark:bg-slate-950 dark:hover:bg-slate-900 transition-all duration-300 hover:shadow-xl hover:shadow-slate-100 dark:hover:shadow-black/20 hover:-translate-y-1">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Package className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Automated Expiry & Stock Controls</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Stay compliant. Automatic notifications highlight low-stock products, highlight batch levels, and scan expiration dates to avoid selling expired pharmaceuticals.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-white dark:bg-slate-950 dark:hover:bg-slate-900 transition-all duration-300 hover:shadow-xl hover:shadow-slate-100 dark:hover:shadow-black/20 hover:-translate-y-1">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Intelligent Sales Insights</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Optimize your purchase power. Interactive analytics graphs demonstrate top selling medicines, daily margin metrics, vendor transaction ledgers, and revenue trends.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-white dark:bg-slate-950 dark:hover:bg-slate-900 transition-all duration-300 hover:shadow-xl hover:shadow-slate-100 dark:hover:shadow-black/20 hover:-translate-y-1">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Pharmacist & Staff Security Roles</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Control who edits margins or handles stock sheets. Separate login profiles allow customized view accesses for pharmacy owners, cashiers, and medical administrators.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-white dark:bg-slate-950 dark:hover:bg-slate-900 transition-all duration-300 hover:shadow-xl hover:shadow-slate-100 dark:hover:shadow-black/20 hover:-translate-y-1">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Automated Cloud Ledger Backups</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Never lose transaction history. Secure real-time cloud integrations record database backups continuously, ensuring you stay HIPAA, WHO, and local-governance compliant.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-white dark:bg-slate-950 dark:hover:bg-slate-900 transition-all duration-300 hover:shadow-xl hover:shadow-slate-100 dark:hover:shadow-black/20 hover:-translate-y-1">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Quick Reorder Sheets</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Accelerate restock workflows. Automatically generate list orders for low stock batches, group them by suppliers in a click, and track incoming invoice shipments easily.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. POS SIMULATOR WIDGET (INTERACTIVE DEMO) */}
      <section id="simulator" className="py-20 relative">
        <div className="absolute top-[20%] right-[-5%] w-[40%] aspect-square rounded-full bg-teal-500/5 dark:bg-emerald-500/5 blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold tracking-wide">
              <span>Interactive Demonstration</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white">
              Try the POS billing interface yourself.
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              Interactive simulator to demonstrate how billing works inside MedWay. Click quantities, adjust rates, and preview a mock-printed billing invoice instantly.
            </p>
          </div>

          {/* Interactive Simulator Shell */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl p-6 lg:p-8">
            
            {/* Products Selector - LHS */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">Medicines Catalog</h3>
                <p className="text-xs text-slate-500">Add medicines to stock-out list by adjusting quantity</p>
              </div>

              <div className="space-y-3">
                {simulatorItems.map(item => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                      item.qty > 0
                        ? 'border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/10'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-sm text-slate-900 dark:text-white">{item.name}</p>
                      <span className="text-[11px] font-bold text-slate-400 bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded uppercase tracking-wider">{item.category}</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <p className="font-bold text-slate-900 dark:text-white text-sm">₹{item.price.toFixed(2)}</p>
                      
                      <div className="flex items-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-1 gap-1">
                        <button
                          onClick={() => handleQtyChange(item.id, -1)}
                          disabled={item.qty === 0}
                          className="h-7 w-7 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold text-slate-850 dark:text-white">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => handleQtyChange(item.id, 1)}
                          className="h-7 w-7 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Invoice calculation summary - RHS */}
            <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 pt-6 lg:pt-0 lg:pl-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-emerald-500" />
                    <span>POS Terminal</span>
                  </h3>
                  <span className="text-[10px] text-emerald-500 font-bold bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded tracking-wide animate-pulse">
                    Live Calculator
                  </span>
                </div>

                {/* Items in bill List */}
                <div className="py-4 min-h-[160px] max-h-[220px] overflow-y-auto space-y-2.5">
                  {activeItems.length === 0 ? (
                    <div className="h-32 flex flex-col items-center justify-center text-center">
                      <FileText className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2 animate-bounce" />
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Your bill is empty</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-0.5">Click + on items to populate the bill</p>
                    </div>
                  ) : (
                    activeItems.map(item => (
                      <div key={item.id} className="flex justify-between text-xs items-center">
                        <div className="min-w-0 flex-1 pr-4">
                          <p className="font-bold text-slate-850 dark:text-slate-200 truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {item.qty} × ₹{item.price.toFixed(2)}
                          </p>
                        </div>
                        <p className="font-bold text-slate-800 dark:text-slate-300 shrink-0">
                          ₹{(item.qty * item.price).toFixed(2)}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Controls (Discount & Tax options) */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Discount (%)</label>
                    <select
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Number(e.target.value))}
                      className="w-full text-xs font-semibold p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 outline-none focus:border-emerald-500 transition-colors"
                    >
                      <option value={0}>0% (None)</option>
                      <option value={5}>5%</option>
                      <option value={10}>10% (Loyalty)</option>
                      <option value={15}>15% (Staff)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">GST/TAX (%)</label>
                    <select
                      value={taxPercent}
                      onChange={(e) => setTaxPercent(Number(e.target.value))}
                      className="w-full text-xs font-semibold p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 outline-none focus:border-emerald-500 transition-colors"
                    >
                      <option value={0}>0%</option>
                      <option value={5}>5%</option>
                      <option value={8}>8% (Standard)</option>
                      <option value={12}>12% (Clinical)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Calculations Block */}
              <div className="pt-6 mt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex justify-between text-xs text-slate-500 font-semibold">
                  <span>Subtotal:</span>
                  <span>₹{getSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 font-semibold">
                  <span>Discount ({discountPercent}%):</span>
                  <span className="text-rose-600 dark:text-rose-400">-₹{getDiscountValue().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 font-semibold">
                  <span>Tax ({taxPercent}%):</span>
                  <span>+₹{getTaxValue().toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold pt-2 border-t border-dashed border-slate-200 dark:border-slate-800">
                  <span className="text-slate-900 dark:text-white">Amount Payable:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-lg">₹{getTotal().toFixed(2)}</span>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => setShowInvoiceModal(true)}
                    disabled={activeItems.length === 0}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl text-sm transition-all duration-200 shadow-md shadow-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Printer className="h-4.5 w-4.5" />
                    <span>Print Mock Invoice</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. STATS SECTION */}
      <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
        {/* Lights background */}
        <div className="absolute top-[-50%] left-[-20%] w-[60%] aspect-square rounded-full bg-emerald-500/20 blur-[150px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <p className="text-4xl md:text-5xl font-black text-emerald-400">12,000+</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Pharmacies</p>
            </div>
            <div className="space-y-2">
              <p className="text-4xl md:text-5xl font-black text-emerald-400">1.8M+</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Invoices Processed</p>
            </div>
            <div className="space-y-2">
              <p className="text-4xl md:text-5xl font-black text-emerald-400">$34M+</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Transacted Value</p>
            </div>
            <div className="space-y-2">
              <p className="text-4xl md:text-5xl font-black text-emerald-400">99.99%</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ledger Availability</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. PRICING PLANS */}
      <section id="pricing" className="py-20 bg-white dark:bg-slate-900 border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <h2 className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Simple & Transparent Pricing</h2>
            <p className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white">
              Choose the layout that grows with your pharmacy.
            </p>
            <p className="text-slate-500 dark:text-slate-400">
              No hidden fees. Free tier with standard features, simple scaling models for clinics & multi-site pharmacy networks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto">
            {/* Plan 1 - Free */}
            <div className="flex flex-col justify-between p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Solo Starter</h3>
                <p className="text-xs text-slate-400 dark:text-slate-505 mt-1">Perfect for local single-chemist shops</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">₹0</span>
                  <span className="text-xs text-slate-505">/ forever</span>
                </div>
                
                <ul className="mt-8 space-y-3.5 text-xs text-slate-650 dark:text-slate-450">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Up to 150 items catalog</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>F2 Standard POS billing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Basic inventory tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Single user login</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4">
                <Link
                  to={user ? "/dashboard" : "/signup"}
                  className="w-full block bg-white dark:bg-slate-900 border border-slate-350 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-center font-semibold py-2.5 rounded-xl text-xs transition-colors"
                >
                  {user ? "Go to Dashboard" : "Sign Up Free"}
                </Link>
              </div>
            </div>

            {/* Plan 2 - Professional (Popular) */}
            <div className="flex flex-col justify-between p-8 rounded-2xl border-2 border-emerald-500 bg-white dark:bg-slate-900 shadow-xl relative">
              <span className="absolute top-0 right-6 -translate-y-1/2 bg-emerald-500 text-white font-bold text-[9px] uppercase px-3 py-1 rounded-full tracking-wider shadow">
                Most Popular
              </span>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Smart Pharmacy</h3>
                <p className="text-xs text-slate-450 dark:text-slate-505 mt-1">For growing pharmacies & medical clinics</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">₹3,200</span>
                  <span className="text-xs text-slate-505">/ month</span>
                </div>
                
                <ul className="mt-8 space-y-3.5 text-xs text-slate-650 dark:text-slate-400">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-slate-850 dark:text-slate-300">Unlimited items catalog</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>F2 POS with barcode integration</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-slate-850 dark:text-slate-300">Expiry & low stock automated alerts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Purchase orders & supplier history</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Up to 5 staff accounts (multi-role)</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4">
                <Link
                  to={user ? "/dashboard" : "/signup"}
                  className="w-full block bg-emerald-500 hover:bg-emerald-600 text-white text-center font-bold py-3 rounded-xl text-xs transition-colors shadow-md shadow-emerald-500/15"
                >
                  {user ? "Go to Dashboard" : "Start 14-Day Free Trial"}
                </Link>
              </div>
            </div>

            {/* Plan 3 - Enterprise */}
            <div className="flex flex-col justify-between p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Clinic Network</h3>
                <p className="text-xs text-slate-400 dark:text-slate-505 mt-1">Multi-branch pharmacy consolidated ledger</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">₹7,300</span>
                  <span className="text-xs text-slate-505">/ month</span>
                </div>
                
                <ul className="mt-8 space-y-3.5 text-xs text-slate-650 dark:text-slate-450">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-slate-850 dark:text-slate-300">Consolidated multi-branch sync</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Internal stock transfers between sites</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Advanced margin & compliance analytics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Unlimited staff accounts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-slate-850 dark:text-slate-300">Dedicated 24/7 account manager</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-4">
                <a
                  href="mailto:sales@medwaymedicals.com?subject=Enterprise Inquiry"
                  className="w-full block bg-white dark:bg-slate-900 border border-slate-350 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-center font-semibold py-2.5 rounded-xl text-xs transition-colors"
                >
                  Contact Sales
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FAQ SECTION */}
      <section id="faq" className="py-20 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Frequently Asked Questions</h2>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
              Have questions? We have answers.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm transition-all duration-300"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-6 text-left outline-none"
                    aria-expanded={isOpen}
                  >
                    <span className="font-bold text-sm text-slate-900 dark:text-white pr-4">
                      {faq.q}
                    </span>
                    <span className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </span>
                  </button>

                  <div
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      isOpen ? 'max-h-[200px] border-t border-slate-100 dark:border-slate-800' : 'max-h-0'
                    }`}
                  >
                    <p className="p-6 text-xs leading-relaxed text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/40">
                      {faq.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. CALL TO ACTION BANNER */}
      <section className="py-20 bg-gradient-to-br from-emerald-600 to-teal-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div className="absolute top-[-50%] right-[-20%] w-[60%] aspect-square rounded-full bg-white/10 blur-[120px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-6 text-center space-y-8 relative">
          <h2 className="text-3xl md:text-5xl font-black leading-tight">
            Ready to upgrade your pharmacy workspace?
          </h2>
          <p className="text-sm md:text-base text-emerald-100 max-w-xl mx-auto leading-relaxed">
            Create an account in less than 2 minutes. Try all premium capabilities free for 14 days. No credit card required.
          </p>

          <div className="pt-2">
            <Link
              to={user ? "/dashboard" : "/signup"}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-955 text-white font-bold px-8 py-4 rounded-xl shadow-lg transition-all duration-200 text-sm group"
            >
              <span>{user ? "Go to Dashboard" : "Get Started Now"}</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 pt-16 pb-8 text-xs">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-8 pb-12 border-b border-slate-800">
          
          <div className="md:col-span-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                M
              </div>
              <span className="font-bold text-base text-white tracking-wide">
                MedWay <span className="text-emerald-500 font-bold ml-0.5">Medicals</span>
              </span>
            </div>
            <p className="leading-relaxed max-w-sm">
              Next-generation clinical POS & billing software built specifically for independent chemists, multi-site pharmacy networks, and medical distributors.
            </p>
          </div>

          <div className="md:col-span-2 space-y-4">
            <h4 className="font-bold text-white uppercase tracking-wider text-[10px]">Product</h4>
            <ul className="space-y-2">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#simulator" className="hover:text-white transition-colors">POS Demo</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing Options</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">FAQs</a></li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-4">
            <h4 className="font-bold text-white uppercase tracking-wider text-[10px]">Company</h4>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-4">
            <h4 className="font-bold text-white uppercase tracking-wider text-[10px]">Join Our Newsletter</h4>
            <p className="leading-relaxed">Get monthly clinical updates, regulatory compliance notifications, and new features lists.</p>
            <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-emerald-500 text-xs"
              />
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-lg transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-slate-500">
          <p>© {new Date().getFullYear()} MedWay Medicals Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-400">Twitter</a>
            <a href="#" className="hover:text-slate-400">LinkedIn</a>
            <a href="#" className="hover:text-slate-400">GitHub</a>
          </div>
        </div>
      </footer>

      {/* 10. MOCK INVOICE MODAL (Triggered by Simulator) */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-[420px] rounded-2xl shadow-2xl overflow-hidden flex flex-col justify-between animate-slide-up">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Printer className="h-4.5 w-4.5 text-emerald-500" />
                <span>Invoice Thermal Preview</span>
              </h3>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-505 dark:text-slate-400 transition-colors text-xs font-semibold px-2.5"
              >
                Close
              </button>
            </div>

            {/* Receipt Content Wrapper (Mimics real printing receipt layout) */}
            <div className="p-6 bg-slate-50 dark:bg-slate-950 flex-1 overflow-y-auto">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-[10px] text-slate-700 dark:text-slate-300 space-y-4 shadow">
                
                {/* Pharmacy Header */}
                <div className="text-center space-y-1">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">MedWay Pharmacy</h4>
                  <p>128 Healthcare Avenue, Suite A</p>
                  <p>Tel: +1 (555) 902-1200</p>
                  <p>GSTIN: 27AAGCM4928M1Z0</p>
                </div>

                <div className="border-t border-dashed border-slate-200 dark:border-slate-800 pt-2 space-y-1">
                  <p>Date: {new Date().toLocaleDateString()}  Time: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  <p>Bill No: MW-SIM-{Math.floor(100000 + Math.random() * 900000)}</p>
                  <p>Cashier: Guest Pharmacist</p>
                  <p>Cust: Walk-in Patient</p>
                </div>

                {/* Items List */}
                <div className="border-t border-dashed border-slate-200 dark:border-slate-800 pt-2">
                  <div className="flex justify-between font-bold border-b border-dashed border-slate-200 dark:border-slate-800 pb-1 mb-1">
                    <span className="w-1/2">Item Name</span>
                    <span className="w-1/6 text-center">Qty</span>
                    <span className="w-1/6 text-right">Price</span>
                    <span className="w-1/6 text-right">Total</span>
                  </div>
                  <div className="space-y-1">
                    {activeItems.map(item => (
                      <div key={item.id} className="flex justify-between">
                        <span className="w-1/2 truncate pr-1">{item.name}</span>
                        <span className="w-1/6 text-center">{item.qty}</span>
                        <span className="w-1/6 text-right">₹{item.price.toFixed(2)}</span>
                        <span className="w-1/6 text-right font-bold">₹{(item.qty * item.price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals Block */}
                <div className="border-t border-dashed border-slate-200 dark:border-slate-800 pt-2 space-y-1 text-right">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Subtotal:</span>
                    <span>₹{getSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Discount ({discountPercent}%):</span>
                    <span>-₹{getDiscountValue().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">GST ({taxPercent}%):</span>
                    <span>+₹{getTaxValue().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 dark:text-white text-xs pt-1 border-t border-dashed border-slate-200 dark:border-slate-800">
                    <span>Grand Total:</span>
                    <span>₹{getTotal().toFixed(2)}</span>
                  </div>
                </div>

                {/* Footer and Mock barcode */}
                <div className="border-t border-dashed border-slate-200 dark:border-slate-800 pt-4 text-center space-y-3">
                  <p className="italic">Thank you for visiting! Get well soon.</p>
                  
                  {/* Mock Barcode Graphic */}
                  <div className="flex flex-col items-center gap-1 mt-2">
                    <div className="flex items-center gap-0.5 h-6 opacity-80">
                      {[1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 1, 4].map((width, i) => (
                        <div
                          key={i}
                          className="bg-slate-800 dark:bg-slate-200 h-full"
                          style={{ width: `${width}px` }}
                        />
                      ))}
                    </div>
                    <span className="text-[7px] text-slate-450 tracking-[2px] font-mono">MW-SIMULATOR-POS-BILL</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Print Confirmation Buttons */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button
                onClick={() => {
                  alert("This is a demo POS terminal. In the full application, this triggers an immediate thermal/pdf printer sequence.");
                  setShowInvoiceModal(false);
                }}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs transition-colors text-center"
              >
                Confirm Print
              </button>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold py-2.5 rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Landing;
