import { useRef } from "react";
import { motion, useTransform } from "framer-motion";
import { MapPin, Clock, Pill, Navigation } from "lucide-react";
import useSectionProgress from "./useSectionProgress.js";

const PHARMACIES = [
  { name: "Wellness Forever - Vastrapur", distance: "1.87 km away", open: true, generic: true, top: "14%", left: "8%", delay: 0 },
  { name: "MedPlus - Memnagar", distance: "2.42 km away", open: true, generic: true, top: "58%", left: "62%", delay: 0.08 },
  { name: "Netmeds Pharmacy - Sarkhej", distance: "3.10 km away", open: false, generic: false, top: "68%", left: "12%", delay: 0.16 },
  { name: "Apollo Pharmacy - Satellite", distance: "4.55 km away", open: true, generic: true, top: "10%", left: "64%", delay: 0.24 },
];

const FILTERS = ["Open Now", "Generic Stock Available", "Within 5km"];

function PharmacyCard({ p, progress }) {
  const appear = useTransform(progress, [0.15 + p.delay, 0.35 + p.delay], [0, 1]);
  const y = useTransform(progress, [0.15 + p.delay, 0.35 + p.delay], [40, 0]);

  return (
    <motion.div
      style={{ opacity: appear, y, top: p.top, left: p.left }}
      className="absolute w-[230px] rounded-2xl border border-white/70 bg-white/85 backdrop-blur-lg shadow-[0_20px_40px_-16px_rgba(15,23,42,0.25)] p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-bold text-slate-800 leading-snug">{p.name}</div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${p.open ? "bg-[#e6f4ea] text-[#166534]" : "bg-rose-50 text-rose-600"}`}>
          {p.open ? "Open" : "Closed"}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
        <Navigation className="h-3 w-3 text-[#22c55e]" /> {p.distance}
      </div>
      {p.generic && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
          <Pill className="h-3 w-3" /> Generic in stock
        </div>
      )}
    </motion.div>
  );
}

export default function DiscoverySection({ pageScrollY }) {
  const ref = useRef(null);
  const progress = useSectionProgress(ref, pageScrollY);

  const opacity = useTransform(progress, [0, 0.1, 0.85, 1], [0, 1, 1, 0]);
  const headlineY = useTransform(progress, [0, 0.15], [40, 0]);
  const mapRotateX = useTransform(progress, [0, 1], [22, 6]);
  const mapScale = useTransform(progress, [0, 0.3], [0.9, 1]);

  return (
    <section ref={ref} style={{ height: "230vh" }} className="relative">
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center" style={{ perspective: "1600px" }}>
        <motion.div style={{ opacity }} className="relative w-full h-full flex flex-col items-center justify-center px-6">
          <motion.div style={{ y: headlineY }} className="text-center mb-8 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide bg-[#e6f4ea] text-[#166534] mb-4">
              <MapPin className="h-3.5 w-3.5" /> Local pharmacy discovery
            </span>
            <h2 className="text-[clamp(1.75rem,3.4vw,2.6rem)] font-extrabold tracking-tight text-slate-900">
              Find Stock Near You in Seconds
            </h2>
          </motion.div>

          {/* 3D perspective map container */}
          <motion.div
            style={{ rotateX: mapRotateX, scale: mapScale, transformStyle: "preserve-3d" }}
            className="relative w-full max-w-3xl h-[380px] rounded-[28px] border border-white/60 overflow-hidden shadow-[0_40px_80px_-30px_rgba(15,23,42,0.35)]"
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(#cbf3d9 1px, transparent 1px), linear-gradient(90deg, #cbf3d9 1px, transparent 1px), radial-gradient(circle at 30% 30%, #f0fdf4, #dcfce7 55%, #bbf7d0)",
                backgroundSize: "36px 36px, 36px 36px, 100% 100%",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-transparent" />

            {PHARMACIES.map((p) => (
              <PharmacyCard key={p.name} p={p} progress={progress} />
            ))}

            {/* "You are here" pin */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="h-4 w-4 rounded-full bg-[#22c55e] ring-4 ring-[#22c55e]/25 animate-pulse" />
            </div>
          </motion.div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {FILTERS.map((f) => (
              <span key={f} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 backdrop-blur px-3.5 py-2 text-xs font-semibold text-slate-700">
                <Clock className="h-3 w-3 text-[#22c55e]" /> {f}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
