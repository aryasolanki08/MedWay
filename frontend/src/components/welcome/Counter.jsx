import { useEffect, useState } from "react";
import { useTransform, useMotionValueEvent } from "framer-motion";

/** Renders a number that counts (and reverses) as `progress` moves across
 * `range`, e.g. scroll-linked. `decimals` controls display precision;
 * `prefix`/`suffix` wrap the formatted value (₹, %, etc.). */
export default function Counter({ progress, range, target, decimals = 0, prefix = "", suffix = "" }) {
  const value = useTransform(progress, range, [0, target]);
  const [display, setDisplay] = useState("0");

  useMotionValueEvent(value, "change", (v) => {
    setDisplay(v.toFixed(decimals));
  });

  useEffect(() => {
    setDisplay((0).toFixed(decimals));
  }, [decimals]);

  return (
    <span>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
