import { useRef } from "react";
import { motion, useTransform } from "framer-motion";
import { Percent } from "lucide-react";
import useSectionProgress from "./useSectionProgress.js";

export default function ComparisonSection({ pageScrollY }) {
  const ref = useRef(null);
  const progress = useSectionProgress(ref, pageScrollY);

  const opacity = useTransform(progress, [0, 0.1, 0.85, 1], [0, 1, 1, 0]);
  const headlineY = useTransform(progress, [0, 0.15], [40, 0]);

  const brandedX = useTransform(progress, [0.15, 0.4], [-160, 0]);
  const brandedOpacity = useTransform(progress, [0.15, 0.4], [0, 1]);
  const genericX = useTransform(progress, [0.15, 0.4], [160, 0]);
  const genericOpacity = useTransform(progress, [0.15, 0.4], [0, 1]);

  const badgeScale = useTransform(progress, [0.4, 0.6], [0, 1]);
  const badgeRotate = useTransform(progress, [0.4, 0.75], [-8, 4]);

  return (
    <section ref={ref} style={{ height: "220vh" }} className="relative">
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center" style={{ perspective: "1600px" }}>
        <motion.div style={{ opacity }} className="relative w-full h-full flex flex-col items-center justify-center px-6">
          <motion.div style={{ y: headlineY }} className="text-center mb-12 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide bg-[#e6f4ea] text-[#166534] mb-4">
              <Percent className="h-3.5 w-3.5" /> Smart OTC &amp; generic comparison
            </span>
            <h2 className="text-[clamp(1.75rem,3.4vw,2.6rem)] font-extrabold tracking-tight text-slate-900">
              Compare Branded vs. Generic Prices
            </h2>
          </motion.div>

          <div className="relative w-full max-w-2xl">
            <div className="grid grid-cols-2 gap-6 sm:gap-10" style={{ perspective: "1200px" }}>
              <motion.div
                style={{ x: brandedX, opacity: brandedOpacity }}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.3)]"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Branded</div>
                <div className="mt-2 text-lg font-extrabold text-slate-900">Calpol</div>
                <div className="text-xs text-slate-500 mb-4">GSK &middot; 500mg</div>
                <div className="text-3xl font-extrabold text-slate-900">₹25.76</div>
              </motion.div>

              <motion.div
                style={{ x: genericX, opacity: genericOpacity }}
                className="rounded-3xl border-2 border-[#22c55e] bg-[#f0fdf4] p-6 shadow-[0_20px_50px_-20px_rgba(34,197,94,0.35)]"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-[#166534]">Generic</div>
                <div className="mt-2 text-lg font-extrabold text-slate-900">Paracetamol IP</div>
                <div className="text-xs text-slate-500 mb-4">Generic Pharma Co &middot; 650mg</div>
                <div className="text-3xl font-extrabold text-[#166534]">₹11.04</div>
              </motion.div>
            </div>

            {/* Floating glowing savings badge, between the two cards */}
            <motion.div
              style={{ scale: badgeScale, rotate: badgeRotate }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-[#22c55e] blur-xl opacity-60" aria-hidden />
                <div className="relative flex flex-col items-center justify-center h-24 w-24 rounded-full bg-gradient-to-br from-[#4ade80] to-[#16a34a] text-white shadow-[0_20px_45px_-10px_rgba(34,197,94,0.7)] ring-4 ring-white">
                  <span className="text-xl font-extrabold leading-none">57%</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide mt-0.5">Save</span>
                </div>
              </div>
            </motion.div>
          </div>

          <p className="mt-10 text-sm text-slate-500 max-w-md text-center">
            Same active salt, always a real brand-name substitute -- never a different drug class.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
