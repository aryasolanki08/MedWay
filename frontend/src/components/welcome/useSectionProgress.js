import { useLayoutEffect, useState } from "react";
import { useTransform } from "framer-motion";

/**
 * Derives a section's own 0->1 scroll progress from a single shared,
 * page-level raw-pixel scroll MotionValue (`pageScrollY`, from
 * `useScroll()` in Welcome.jsx) rather than each section calling its own
 * `useScroll({ target: ref })`.
 *
 * Framer Motion's per-target `useScroll` (v12/v13) turned out to only
 * track the FIRST mounted instance correctly when several are used in
 * the same tree -- every subsequent instance stayed frozen at its
 * progress=0 output no matter how far the page scrolled (confirmed by
 * swapping section order: whichever section rendered first tracked
 * correctly, all others didn't). Deriving progress from one shared
 * whole-page scroll value sidesteps that entirely, and is what the
 * fixed scroll-progress bar already relies on successfully.
 */
export default function useSectionProgress(ref, pageScrollY) {
  const [bounds, setBounds] = useState(null);

  useLayoutEffect(() => {
    function measure() {
      if (ref.current) {
        setBounds({ top: ref.current.offsetTop, height: ref.current.offsetHeight });
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [ref]);

  const top = bounds?.top ?? 0;
  const height = bounds?.height || 1;
  return useTransform(pageScrollY, [top, top + height], [0, 1]);
}
