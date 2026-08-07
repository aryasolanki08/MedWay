import { useEffect, useRef, useState } from "react";
import { Stethoscope, Play, Pause, Square } from "lucide-react";

/** Lip-sync-free "AI doctor" avatar: a simple animated character whose
 * voice waveform bars move while speech is playing, using the browser's
 * built-in SpeechSynthesis -- no per-request cost, no third-party video
 * API. Not a real talking-head video; a deliberate, honest stand-in for
 * one given the free-tier constraint.
 */
export default function DoctorAvatar({ text, autoPlay = false }) {
  const [state, setState] = useState("idle"); // idle | speaking | paused | unsupported
  const utteranceRef = useRef(null);

  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (!supported) {
      setState("unsupported");
      return;
    }
    return () => window.speechSynthesis.cancel();
  }, [supported]);

  useEffect(() => {
    if (!supported || !text) return;
    window.speechSynthesis.cancel();
    setState("idle");
    if (autoPlay) play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const play = () => {
    if (!supported || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.98;
    utterance.pitch = 1;
    utterance.onstart = () => setState("speaking");
    utterance.onend = () => setState("idle");
    utterance.onerror = () => setState("idle");
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const pauseOrResume = () => {
    if (!supported) return;
    if (state === "speaking") {
      window.speechSynthesis.pause();
      setState("paused");
    } else if (state === "paused") {
      window.speechSynthesis.resume();
      setState("speaking");
    }
  };

  const stop = () => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setState("idle");
  };

  const speaking = state === "speaking";

  return (
    <div className="row" style={{ gap: 16, alignItems: "center" }}>
      <div
        style={{
          position: "relative",
          width: 64,
          height: 64,
          borderRadius: "9999px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(155deg, #4ade80 0%, #16a34a 100%)",
          boxShadow: speaking
            ? "0 0 0 6px rgba(34,197,94,0.18), 0 0 0 12px rgba(34,197,94,0.08)"
            : "0 8px 20px -8px rgba(15,23,42,0.35)",
          transition: "box-shadow 0.3s ease",
        }}
      >
        <Stethoscope className="h-7 w-7" style={{ color: "white" }} />
        {speaking && (
          <span
            style={{
              position: "absolute",
              inset: -6,
              borderRadius: "9999px",
              border: "2px solid #22c55e",
              animation: "medway-avatar-pulse 1.6s ease-out infinite",
            }}
          />
        )}
      </div>

      <div className="stack" style={{ gap: 8, flex: 1, minWidth: 0 }}>
        <div className="row" style={{ gap: 3, height: 20, alignItems: "flex-end" }} aria-hidden>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              style={{
                width: 3,
                borderRadius: 2,
                background: "#22c55e",
                height: speaking ? undefined : 4,
                opacity: speaking ? 1 : 0.35,
                animation: speaking ? `medway-avatar-bar 0.9s ease-in-out ${i * 0.09}s infinite` : "none",
              }}
            />
          ))}
        </div>

        {!supported ? (
          <p className="muted" style={{ margin: 0, fontSize: 12 }}>
            Voice playback isn't supported in this browser -- read the script below instead.
          </p>
        ) : (
          <div className="row" style={{ gap: 8 }}>
            {state === "idle" && (
              <button type="button" className="btn secondary" style={{ padding: "6px 12px" }} onClick={play} disabled={!text}>
                <span className="row" style={{ gap: 6 }}><Play className="h-3.5 w-3.5" /> Play voice consult</span>
              </button>
            )}
            {(state === "speaking" || state === "paused") && (
              <>
                <button type="button" className="btn secondary" style={{ padding: "6px 12px" }} onClick={pauseOrResume}>
                  <span className="row" style={{ gap: 6 }}>
                    {state === "speaking" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    {state === "speaking" ? "Pause" : "Resume"}
                  </span>
                </button>
                <button type="button" className="btn secondary" style={{ padding: "6px 12px" }} onClick={stop}>
                  <span className="row" style={{ gap: 6 }}><Square className="h-3.5 w-3.5" /> Stop</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes medway-avatar-pulse {
          0% { transform: scale(0.94); opacity: 0.9; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        @keyframes medway-avatar-bar {
          0%, 100% { height: 4px; }
          50% { height: 20px; }
        }
      `}</style>
    </div>
  );
}
