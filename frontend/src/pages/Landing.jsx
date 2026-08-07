import { useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext.jsx";
import { pharmacyPortalUrl } from "../utils/pharmacyUrl.js";
import {
  Search, MapPin, Percent, Mic, Package, BarChart3, UploadCloud,
  Sun, Moon, ArrowRight, ChevronDown, ChevronUp,
  ShieldCheck, Pill, Store,
} from "lucide-react";

const FEATURES = [
  {
    icon: Search,
    title: "Search & Compare Instantly",
    text: "Look up any medicine by brand or salt name and see every branded and generic option, sorted by real, live price -- never a guess.",
  },
  {
    icon: MapPin,
    title: "Local Pharmacy Discovery",
    text: "Pick your area in Ahmedabad and see exactly which nearby real pharmacies have it in stock right now, Swiggy-style.",
  },
  {
    icon: UploadCloud,
    title: "Prescription Photo Upload",
    text: "Drop a photo of your prescription and we'll read the medicine names off it and match them against the catalog for you.",
  },
  {
    icon: Mic,
    title: "AI Voice Consult",
    text: "Describe a symptom and hear a short spoken summary -- caution info, a real nearby medicine, and exact generic savings in ₹.",
  },
  {
    icon: Package,
    title: "Order Tracking & Delivery",
    text: "Order from one pharmacy or several at once, and track every order from placed to delivered in one place.",
  },
  {
    icon: BarChart3,
    title: "Savings Insights",
    text: "See exactly how much you've spent, what you've ordered most, and how much switching to generics has actually saved you.",
  },
];

const STEPS = [
  { n: "01", title: "Search", text: "Type a medicine name or upload a prescription photo." },
  { n: "02", title: "Compare", text: "See branded vs. generic prices at real nearby pharmacies." },
  { n: "03", title: "Order", text: "Order for home delivery and track it until it arrives." },
];

const FAQS = [
  {
    q: "Is the medicine advice a real diagnosis?",
    a: "No. Medicine Info and the AI voice consult give general OTC category information grounded in our real catalog data -- never a diagnosis or prescription. Always check with a pharmacist or doctor, especially for anything persistent, severe, or dosage-specific.",
  },
  {
    q: "Are the prices and pharmacies real?",
    a: "Yes. Every price, pharmacy name, and stock quantity you see comes live from the pharmacy portal's own database -- not estimated or simulated.",
  },
  {
    q: "Which areas are covered right now?",
    a: "MedWay currently covers pharmacies across Ahmedabad, Gujarat -- pick your area (like Vastrapur, Satellite, or Bodakdev) at signup or from your profile to see what's stocked nearby.",
  },
  {
    q: "How does generic savings work?",
    a: "For every salt (active ingredient), we show the cheapest branded option next to the cheapest generic option side by side, so the savings are always a real, computed ₹ amount -- not a marketing estimate.",
  },
  {
    q: "Can I order from more than one pharmacy at once?",
    a: "Yes -- add medicines from different pharmacies to your cart and they're routed to each pharmacy separately, so you're never stuck getting everything from just one store.",
  },
];

export default function Landing() {
  const { theme, toggleTheme } = useTheme();
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* HEADER */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-slate-950/70 border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="icon-badge font-bold">M</span>
            <span className="font-bold text-lg text-slate-900 dark:text-white tracking-wide">MedWay</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">How it works</a>
            <a href="#faq" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="icon-btn"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link to="/login" className="text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 font-semibold text-sm transition-colors px-2">
              Log in
            </Link>
            <Link
              to="/register"
              className="rounded-full bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-5 py-2.5 shadow-sm shadow-brand-500/20 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden pt-16 pb-24 md:pt-20 md:pb-28">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] aspect-square rounded-full bg-brand-500/10 dark:bg-brand-500/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[45%] aspect-square rounded-full bg-teal-500/10 dark:bg-indigo-500/5 blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-brand-100/80 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-900/30 text-brand-700 dark:text-brand-400 text-xs font-semibold tracking-wide">
              <span aria-hidden>&#10022;</span>
              <span>Real pharmacy stock, real prices</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-white leading-[1.1] tracking-tight">
              Find your medicine{" "}
              <span className="bg-gradient-to-r from-brand-500 to-teal-400 bg-clip-text text-transparent">for less.</span>
            </h1>

            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
              Search any medicine, compare real branded vs. generic prices across pharmacies near you in
              Ahmedabad, and order for delivery -- all backed by live pharmacy data, not estimates.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link to="/register" className="btn text-center">
                <span className="row" style={{ gap: 8, justifyContent: "center" }}>
                  Get started free <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
              <Link to="/login" className="btn secondary text-center">I have an account</Link>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200 dark:border-slate-900/60 max-w-lg">
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">32</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Areas covered in Ahmedabad</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">Up to 57%</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Savings on generics</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">Live</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Real-time pharmacy stock</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative flex justify-center">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-brand-500 to-teal-500 opacity-10 dark:opacity-5 blur-2xl -z-10" />
            <div
              className="w-full max-w-sm rounded-[28px] border border-white/60 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6"
              style={{ boxShadow: "0 20px 60px -15px rgba(15,23,42,0.12)" }}
            >
              <div className="flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-950 px-4 py-3 shadow-inner border border-slate-100 dark:border-slate-800">
                <Search className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="text-sm text-slate-400">Search "Paracetamol"...</span>
                <Pill className="h-4 w-4 text-brand-500 ml-auto shrink-0" />
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                  <div className="row spread">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Branded</div>
                      <div className="font-bold text-slate-900 dark:text-white">Calpol</div>
                    </div>
                    <div className="text-lg font-extrabold text-slate-900 dark:text-white">&#8377;25.76</div>
                  </div>
                </div>
                <div className="rounded-2xl border-2 border-brand-500 bg-brand-50/60 dark:bg-brand-950/20 p-4">
                  <div className="row spread">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">Generic</div>
                      <div className="font-bold text-slate-900 dark:text-white">Paracetamol IP</div>
                    </div>
                    <div className="text-lg font-extrabold text-brand-700 dark:text-brand-400">&#8377;11.04</div>
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-500 text-white text-xs font-bold px-2.5 py-1">
                    <Percent className="h-3 w-3" /> Save 57%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 bg-slate-50 dark:bg-slate-900 border-y border-slate-200/50 dark:border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <h2 className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest">Everything you need</h2>
            <p className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white">
              One app for finding, comparing, and ordering medicine.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="group p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:hover:bg-slate-900 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(15,23,42,0.06)]"
                style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}
              >
                <div className="h-12 w-12 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <h2 className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest">Simple, in three steps</h2>
            <p className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white">
              From symptom to doorstep.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.n} className="relative overflow-hidden p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-3 -right-1 text-8xl font-black text-brand-100 dark:text-brand-950 select-none"
                >
                  {s.n}
                </span>
                <div className="relative">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{s.title}</h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{s.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="py-20 bg-brand-600 text-white relative overflow-hidden">
        <div className="absolute top-[-50%] right-[-20%] w-[60%] aspect-square rounded-full bg-white/10 blur-[120px] pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8 relative">
          <h2 className="text-3xl md:text-5xl font-black leading-tight text-white">
            Ready to stop overpaying for medicine?
          </h2>
          <p className="text-sm md:text-base text-brand-100 max-w-xl mx-auto leading-relaxed">
            Create an account in under a minute -- free, no card required.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-[#0F172A] hover:bg-slate-800 text-white font-bold px-8 py-4 rounded-xl shadow-lg transition-all duration-200 text-sm group"
          >
            <span>Get Started Now</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-white dark:bg-slate-950">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest">Frequently Asked Questions</h2>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-white">Have questions? We have answers.</p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-6 text-left outline-none"
                    aria-expanded={isOpen}
                  >
                    <span className="font-bold text-sm text-slate-900 dark:text-white pr-4">{faq.q}</span>
                    <span className="h-8 w-8 rounded-lg bg-white dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </span>
                  </button>
                  <div
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      isOpen ? "max-h-[240px] border-t border-slate-200/70 dark:border-slate-800" : "max-h-0"
                    }`}
                  >
                    <p className="p-6 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{faq.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 pt-16 pb-8 text-xs">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-8 pb-12 border-b border-slate-800">
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="icon-badge">M</span>
              <span className="font-bold text-base text-white tracking-wide">MedWay</span>
            </div>
            <p className="leading-relaxed max-w-sm">
              Search, compare, and order real medicine from real nearby pharmacies -- with honest,
              data-backed generic savings. Not a substitute for professional medical advice.
            </p>
          </div>

          <div className="md:col-span-3 space-y-4">
            <h4 className="font-bold text-white uppercase tracking-wider text-[10px]">Product</h4>
            <ul className="space-y-2">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How it works</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">FAQs</a></li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-4">
            <h4 className="font-bold text-white uppercase tracking-wider text-[10px]">More</h4>
            <ul className="space-y-2">
              <li>
                <a href="/welcome" className="hover:text-white transition-colors inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" /> See the full MedWay experience
                </a>
              </li>
              <li>
                <a href={pharmacyPortalUrl()} className="hover:text-white transition-colors inline-flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5" /> Own a pharmacy? List your store
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-slate-500">
          <p>&copy; {new Date().getFullYear()} MedWay. Not a substitute for professional medical advice.</p>
        </div>
      </footer>
    </div>
  );
}
