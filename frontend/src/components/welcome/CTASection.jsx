import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";

export default function CTASection() {
  return (
    <section className="relative py-28 sm:py-36 px-6">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: "linear-gradient(180deg, #f8fafc 0%, #ecfdf5 60%, #dcfce7 100%)" }}
        aria-hidden
      />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-3xl mx-auto text-center"
      >
        <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide bg-white/80 text-[#166534] mb-6 shadow-sm">
          <ShieldCheck className="h-3.5 w-3.5" /> Real stock. Real prices. Real savings.
        </span>
        <h2 className="text-[clamp(2rem,4.6vw,3.2rem)] font-extrabold tracking-tight text-slate-900 leading-[1.1]">
          Your next prescription,{" "}
          <span className="text-[#22c55e]">for less.</span>
        </h2>
        <p className="mt-5 text-lg text-slate-600 max-w-xl mx-auto">
          Search, compare, and order from real nearby pharmacies -- all in one place.
        </p>
        <div className="mt-9">
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2.5 rounded-2xl bg-[#22c55e] px-8 py-4 text-base font-bold text-white shadow-[0_20px_50px_-14px_rgba(34,197,94,0.6)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_24px_56px_-14px_rgba(34,197,94,0.7)]"
          >
            Enter MedWay Dashboard
            <ArrowRight className="h-4.5 w-4.5" />
          </a>
        </div>
        <p className="mt-4 text-xs text-slate-400">Free to join &middot; No card required</p>
      </motion.div>

      <footer className="mt-24 border-t border-slate-200/70 pt-8 max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
        <div className="flex items-center gap-2 font-bold text-slate-700">
          <span className="h-6 w-6 rounded-lg bg-[#22c55e] text-white flex items-center justify-center text-xs">M</span>
          MedWay
        </div>
        <p>&copy; {new Date().getFullYear()} MedWay. Not a substitute for professional medical advice.</p>
      </footer>
    </section>
  );
}
