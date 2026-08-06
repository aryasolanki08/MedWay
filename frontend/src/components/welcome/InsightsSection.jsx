import { useRef } from "react";
import { motion, useTransform } from "framer-motion";
import { TrendingUp, Package, IndianRupee, Search } from "lucide-react";
import Counter from "./Counter.jsx";
import useSectionProgress from "./useSectionProgress.js";

const STATS = [
  { icon: IndianRupee, label: "Potential Savings", target: 62.56, decimals: 2, prefix: "₹", color: "#22c55e" },
  { icon: Package, label: "Orders Delivered", target: 1, decimals: 0, prefix: "", color: "#0ea5e9" },
  { icon: Search, label: "Searches Tracked", target: 4, decimals: 0, prefix: "", color: "#8b5cf6" },
];

export default function InsightsSection({ pageScrollY }) {
  const ref = useRef(null);
  const progress = useSectionProgress(ref, pageScrollY);

  const opacity = useTransform(progress, [0, 0.1, 0.85, 1], [0, 1, 1, 0]);
  const headlineY = useTransform(progress, [0, 0.15], [40, 0]);
  const dashRotateX = useTransform(progress, [0, 1], [16, 2]);
  const dashScale = useTransform(progress, [0, 0.3], [0.92, 1]);

  return (
    <section ref={ref} style={{ height: "200vh" }} className="relative">
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center" style={{ perspective: "1600px" }}>
        <motion.div style={{ opacity }} className="relative w-full h-full flex flex-col items-center justify-center px-6">
          <motion.div style={{ y: headlineY }} className="text-center mb-10 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide bg-[#e6f4ea] text-[#166534] mb-4">
              <TrendingUp className="h-3.5 w-3.5" /> Savings &amp; order insights
            </span>
            <h2 className="text-[clamp(1.75rem,3.4vw,2.6rem)] font-extrabold tracking-tight text-slate-900">
              Track Your Health Savings Automatically
            </h2>
          </motion.div>

          <motion.div
            style={{ rotateX: dashRotateX, scale: dashScale, transformStyle: "preserve-3d" }}
            className="w-full max-w-3xl rounded-[28px] border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_40px_80px_-30px_rgba(15,23,42,0.35)] p-6 sm:p-8"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              {STATS.map((s, i) => (
                <div key={s.label} className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${s.color}1a`, color: s.color }}
                  >
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">
                    <Counter
                      progress={progress}
                      range={[0.2 + i * 0.08, 0.55 + i * 0.08]}
                      target={s.target}
                      decimals={s.decimals}
                      prefix={s.prefix}
                    />
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs text-slate-400 text-center">
              Every figure here is computed from your real search and order history -- nothing estimated.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
