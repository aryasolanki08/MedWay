import { motion, useTransform } from "framer-motion";
import { Search, MapPin, Percent, Pill } from "lucide-react";

// Icons that "spill" out of the capsule as it cracks open -- each one a
// visual shorthand for what MedWay actually does (search, find nearby,
// save money), not decoration for its own sake.
const PARTICLES = [
  { Icon: Search, angle: -55, distance: 150, delay: 0.16, size: 40 },
  { Icon: MapPin, angle: -15, distance: 175, delay: 0.2, size: 34 },
  { Icon: Percent, angle: 25, distance: 160, delay: 0.24, size: 36 },
  { Icon: Pill, angle: 60, distance: 140, delay: 0.19, size: 32 },
];

function Particle({ Icon, angle, distance, delay, size, progress }) {
  const rad = (angle * Math.PI) / 180;
  const tx = Math.cos(rad) * distance;
  const ty = Math.sin(rad) * distance;

  const opacity = useTransform(progress, [delay, delay + 0.08, delay + 0.22, delay + 0.3], [0, 1, 1, 0]);
  const x = useTransform(progress, [delay, delay + 0.22], [0, tx]);
  const y = useTransform(progress, [delay, delay + 0.22], [0, ty]);
  const scale = useTransform(progress, [delay, delay + 0.08, delay + 0.3], [0.3, 1, 0.7]);

  return (
    <motion.div
      style={{ opacity, x, y, scale }}
      className="absolute left-1/2 top-1/2 -ml-[19px] -mt-[19px] flex items-center justify-center rounded-full bg-white shadow-[0_10px_24px_-6px_rgba(15,23,42,0.25)]"
      // eslint-disable-next-line react/forbid-dom-props
    >
      <div className="flex items-center justify-center rounded-full bg-[#e6f4ea]" style={{ width: size, height: size }}>
        <Icon className="h-[45%] w-[45%] text-[#16a34a]" />
      </div>
    </motion.div>
  );
}

/** The literal medicine-capsule visual that cracks open as the hero's
 * scroll progress advances, "releasing" the idea (search/discover/save)
 * before the real UI settles into place. Fully reversible -- closing
 * back up on scroll-up, since it's a direct progress mapping like
 * everything else here, not a one-shot trigger. */
export default function CapsuleOpening({ progress }) {
  // Idle float before opening starts.
  const idleRotate = useTransform(progress, [0, 0.05], [-6, 0]);

  // The crack: halves separate, a light seam glows briefly at the moment
  // they part, then the whole capsule fades once its "contents" are out.
  const topY = useTransform(progress, [0.05, 0.32], [0, -95]);
  const topRotateX = useTransform(progress, [0.05, 0.32], [0, 34]);
  const bottomY = useTransform(progress, [0.05, 0.32], [0, 95]);
  const bottomRotateX = useTransform(progress, [0.05, 0.32], [0, -34]);
  const capsuleOpacity = useTransform(progress, [0.32, 0.48], [1, 0]);
  const capsuleScale = useTransform(progress, [0, 0.05, 0.48], [0.85, 1, 1.12]);

  const seamGlow = useTransform(progress, [0.08, 0.18, 0.34], [0, 1, 0]);
  const seamScale = useTransform(progress, [0.08, 0.3], [0.4, 2.6]);

  return (
    <motion.div
      style={{ opacity: capsuleOpacity, scale: capsuleScale, transformStyle: "preserve-3d" }}
      className="relative flex items-center justify-center"
    >
      {/* Seam burst -- a soft radial flash right as the capsule parts */}
      <motion.div
        style={{ opacity: seamGlow, scale: seamScale }}
        className="pointer-events-none absolute h-16 w-16 rounded-full blur-2xl"
        aria-hidden
      >
        <div className="h-full w-full rounded-full bg-[#4ade80]" />
      </motion.div>

      {PARTICLES.map((p, i) => (
        <Particle key={i} {...p} progress={progress} />
      ))}

      <motion.div style={{ rotate: idleRotate, transformStyle: "preserve-3d" }} className="relative" aria-hidden>
        {/* Ground shadow, breathes as the capsule lifts/opens */}
        <div
          className="absolute left-1/2 -bottom-6 -translate-x-1/2 h-6 w-28 rounded-full blur-md opacity-30 bg-slate-900"
        />

        <div className="relative h-[220px] w-[104px]" style={{ transformStyle: "preserve-3d" }}>
          {/* Top half */}
          <motion.div
            style={{ y: topY, rotateX: topRotateX, transformStyle: "preserve-3d", transformOrigin: "bottom center" }}
            className="absolute inset-x-0 top-0 h-1/2 overflow-hidden rounded-t-full"
          >
            <div
              className="h-[200%] w-full"
              style={{ background: "linear-gradient(155deg, #4ade80 0%, #16a34a 55%, #15803d 100%)" }}
            />
            {/* Gloss highlight */}
            <div
              className="absolute left-[18%] top-[10%] h-[55%] w-[22%] rounded-full opacity-40"
              style={{ background: "linear-gradient(180deg, white, transparent)" }}
            />
          </motion.div>

          {/* Bottom half */}
          <motion.div
            style={{ y: bottomY, rotateX: bottomRotateX, transformStyle: "preserve-3d", transformOrigin: "top center" }}
            className="absolute inset-x-0 bottom-0 h-1/2 overflow-hidden rounded-b-full border border-emerald-100"
          >
            <div
              className="absolute inset-x-0 bottom-0 h-[200%]"
              style={{ background: "linear-gradient(155deg, #f0fdf4 0%, #dcfce7 60%, #bbf7d0 100%)" }}
            />
            <div className="absolute left-[18%] bottom-[10%] h-[45%] w-[20%] rounded-full bg-white opacity-60" />
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
