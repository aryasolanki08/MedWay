import { motion, useScroll, useSpring } from "framer-motion";
import { pharmacyPortalUrl } from "../utils/pharmacyUrl.js";
import HeroSection from "../components/welcome/HeroSection.jsx";
import DiscoverySection from "../components/welcome/DiscoverySection.jsx";
import ComparisonSection from "../components/welcome/ComparisonSection.jsx";
import InsightsSection from "../components/welcome/InsightsSection.jsx";
import CTASection from "../components/welcome/CTASection.jsx";

export default function Welcome() {
  // One shared page-level scroll subscription, passed down to every
  // section (see useSectionProgress.js) instead of each section calling
  // its own useScroll({ target }) -- Framer Motion's per-target tracking
  // only kept the first-mounted instance reactive in testing.
  const { scrollY, scrollYProgress } = useScroll();
  // A touch of spring smoothing on the progress bar only -- the section
  // choreography itself stays a direct 1:1 scroll mapping (no smoothing)
  // so it never feels laggy or disconnected from the scrollbar.
  const barScale = useSpring(scrollYProgress, { stiffness: 300, damping: 40, restDelta: 0.001 });

  return (
    <div className="bg-white">
      <motion.div
        style={{ scaleX: barScale }}
        className="fixed top-0 left-0 right-0 h-1 origin-left bg-[#22c55e] z-50"
      />

      <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 sm:px-10 py-4">
        <a href="/welcome" className="flex items-center gap-2 font-extrabold text-slate-900">
          <span className="h-8 w-8 rounded-xl bg-[#22c55e] text-white flex items-center justify-center text-sm shadow-[0_8px_20px_-6px_rgba(34,197,94,0.6)]">
            M
          </span>
          MedWay
        </a>
        <nav className="flex items-center gap-3">
          <a
            href={pharmacyPortalUrl()}
            className="hidden sm:inline text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors px-3 py-2"
          >
            Pharmacy portal
          </a>
          <a href="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors px-3 py-2">
            Log in
          </a>
          <a
            href="/register"
            className="text-sm font-bold text-white bg-[#22c55e] rounded-xl px-4 py-2.5 shadow-[0_10px_24px_-8px_rgba(34,197,94,0.6)] hover:-translate-y-0.5 transition-transform"
          >
            Get started
          </a>
        </nav>
      </header>

      <main>
        <HeroSection pageScrollY={scrollY} />
        <DiscoverySection pageScrollY={scrollY} />
        <ComparisonSection pageScrollY={scrollY} />
        <InsightsSection pageScrollY={scrollY} />
        <CTASection />
      </main>
    </div>
  );
}
