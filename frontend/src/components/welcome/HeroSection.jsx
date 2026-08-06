import { useRef } from "react";
import { motion, useTransform } from "framer-motion";
import { Search, UploadCloud, Sparkles, Pill } from "lucide-react";
import useSectionProgress from "./useSectionProgress.js";
import CapsuleOpening from "./CapsuleOpening.jsx";

const TAGS = ["Paracetamol", "Amoxicillin", "Vitamin D3"];

export default function HeroSection({ pageScrollY }) {
  const ref = useRef(null);
  const progress = useSectionProgress(ref, pageScrollY);

  // Whole-hero exit -- fades/scales/lifts out once the capsule has opened
  // and its content has had time to be read, handing off to the next scene.
  const heroOpacity = useTransform(progress, [0, 0.68, 0.92], [1, 1, 0]);
  const heroScale = useTransform(progress, [0.68, 0.92], [1, 0.9]);
  const heroY = useTransform(progress, [0.68, 0.92], [0, -70]);
  const glowX = useTransform(progress, [0, 1], ["-10%", "10%"]);

  // The capsule is the opening beat: idle, then cracks open and its
  // particles burst outward, then it steps aside once the real content
  // has taken over -- pointer-events off it stays out of the way.
  const capsuleLayerOpacity = useTransform(progress, [0, 0.36, 0.46], [1, 1, 0]);
  const capsuleLayerScale = useTransform(progress, [0.36, 0.5], [1, 1.15]);

  // Real content is "released" from the capsule -- it appears right as
  // the capsule finishes cracking and fades in.
  const contentOpacity = useTransform(progress, [0.3, 0.46], [0, 1]);
  const contentY = useTransform(progress, [0.3, 0.46], [36, 0]);

  return (
    <section ref={ref} style={{ height: "230vh" }} className="relative">
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center" style={{ perspective: "1600px" }}>
        <motion.div style={{ opacity: heroOpacity, scale: heroScale, y: heroY }} className="relative w-full h-full flex items-center justify-center px-6">
          {/* Ambient mint/emerald glow blobs */}
          <motion.div
            style={{ x: glowX }}
            className="pointer-events-none absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full blur-3xl opacity-60"
            aria-hidden
          >
            <div className="h-full w-full rounded-full" style={{ background: "radial-gradient(circle, #e6f4ea 0%, transparent 70%)" }} />
          </motion.div>
          <div
            className="pointer-events-none absolute -bottom-32 -right-16 h-[480px] w-[480px] rounded-full blur-3xl opacity-50"
            style={{ background: "radial-gradient(circle, #22c55e 0%, transparent 70%)" }}
            aria-hidden
          />

          {/* Opening beat: the literal capsule cracking open, centered */}
          <motion.div
            style={{ opacity: capsuleLayerOpacity, scale: capsuleLayerScale }}
            className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center"
          >
            <CapsuleOpening progress={progress} />
            <motion.p
              style={{ opacity: useTransform(progress, [0.02, 0.09, 0.28, 0.34], [0, 1, 1, 0]) }}
              className="mt-8 text-xs font-bold uppercase tracking-[0.25em] text-[#16a34a]"
            >
              Opening MedWay
            </motion.p>
          </motion.div>

          {/* Content, released from the capsule */}
          <motion.div style={{ opacity: contentOpacity, y: contentY }} className="relative z-10 w-full max-w-5xl mx-auto grid gap-10 lg:grid-cols-2 items-center">
            {/* Copy */}
            <div className="text-center lg:text-left">
              <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide bg-[#e6f4ea] text-[#166534] mb-6">
                <Sparkles className="h-3.5 w-3.5" /> Real pharmacy stock, real prices
              </span>
              <h1 className="text-[clamp(2rem,4.4vw,3.4rem)] font-extrabold leading-[1.05] tracking-tight text-slate-900">
                Smart Medicine Search, Local Pharmacy Discovery{" "}
                <span className="text-[#22c55e]">&amp; Generic Savings</span>
              </h1>
              <p className="mt-5 text-lg text-slate-600 max-w-xl mx-auto lg:mx-0">
                MedWay bridges the gap between your health needs, local pharmacies, and maximum savings.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-3">
                <a
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#22c55e] px-6 py-3.5 text-sm font-bold text-white shadow-[0_16px_40px_-12px_rgba(34,197,94,0.55)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_20px_48px_-12px_rgba(34,197,94,0.65)]"
                >
                  Get started free
                </a>
                <a
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/70 backdrop-blur px-6 py-3.5 text-sm font-bold text-slate-700 hover:bg-white transition-colors"
                >
                  I have an account
                </a>
              </div>
            </div>

            {/* Floating 3D search + upload dropzone */}
            <div style={{ transformStyle: "preserve-3d" }}>
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ y: { duration: 5, repeat: Infinity, ease: "easeInOut" } }}
                className="mx-auto w-full max-w-sm"
              >
                <div className="rounded-[28px] border border-white/60 bg-white/60 backdrop-blur-xl shadow-[0_30px_60px_-20px_rgba(15,23,42,0.25)] p-6">
                  <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-inner border border-slate-100">
                    <Search className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="text-sm text-slate-400">Search "Paracetamol"...</span>
                    <Pill className="h-4 w-4 text-[#22c55e] ml-auto shrink-0" />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {TAGS.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-[#e6f4ea] text-[#166534] text-xs font-semibold px-3 py-1.5"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    className="mt-5 group cursor-pointer rounded-2xl border-2 border-dashed border-[#22c55e]/40 bg-[#e6f4ea]/50 px-5 py-6 text-center transition-colors hover:border-[#22c55e] hover:bg-[#e6f4ea]"
                  >
                    <UploadCloud className="mx-auto h-6 w-6 text-[#22c55e] transition-transform group-hover:-translate-y-0.5" />
                    <p className="mt-2 text-sm font-bold text-slate-700">Upload Prescription</p>
                    <p className="text-xs text-slate-500 mt-0.5">Drop a photo, we'll find the medicines</p>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
