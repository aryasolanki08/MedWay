export function relativeTime(isoString) {
  const then = new Date(isoString).getTime();
  const diffSec = Math.round((Date.now() - then) / 1000);

  if (diffSec < 30) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  return new Date(isoString).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
