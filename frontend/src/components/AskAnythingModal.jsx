import { useEffect, useRef, useState } from "react";
import { X, Send, MessageCircle, Loader2 } from "lucide-react";
import client from "../api/client.js";

export default function AskAnythingModal({ onClose }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! Ask me anything — about MedWay, medicines, or anything else." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setError("");
    const history = messages.map(({ role, text }) => ({ role, text }));
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await client.post("/assistant/chat/", { message: text, history });
      setMessages((m) => [...m, { role: "assistant", text: data.reply }]);
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: 420, width: "100%", height: 560, display: "flex",
          flexDirection: "column", padding: 0, overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="row"
          style={{
            justifyContent: "space-between", padding: "14px 16px",
            borderBottom: "1px solid rgba(148,163,184,0.25)",
          }}
        >
          <div className="row" style={{ gap: 8 }}>
            <div className="icon-badge">
              <MessageCircle className="h-4 w-4" />
            </div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Ask anything</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                background: m.role === "user" ? "#2563eb" : "rgba(148,163,184,0.15)",
                color: m.role === "user" ? "#fff" : "inherit",
                padding: "8px 12px",
                borderRadius: 14,
                maxWidth: "80%",
                fontSize: 14,
                whiteSpace: "pre-wrap",
                lineHeight: 1.4,
              }}
            >
              {m.text}
            </div>
          ))}

          {loading && (
            <div className="row" style={{ gap: 6, alignSelf: "flex-start" }}>
              <Loader2 className="h-4 w-4" style={{ animation: "spin 1s linear infinite" }} />
              <span className="muted" style={{ fontSize: 13 }}>Thinking…</span>
            </div>
          )}

          {error && (
            <div style={{ color: "#dc2626", fontSize: 13 }}>{error}</div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="row" style={{ gap: 8, padding: 12, borderTop: "1px solid rgba(148,163,184,0.25)" }}>
          <input
            ref={inputRef}
            className="input"
            style={{ flex: 1 }}
            placeholder="Type your question…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={loading}
          />
          <button
            className="btn"
            style={{ boxShadow: "none", paddingLeft: 14, paddingRight: 14 }}
            onClick={send}
            disabled={loading || !input.trim()}
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
