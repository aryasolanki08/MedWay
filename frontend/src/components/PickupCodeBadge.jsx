import { useState } from "react";
import QRCode from "qrcode";
import { Copy, Check, QrCode } from "lucide-react";
import { useToast } from "../context/ToastContext.jsx";

export default function PickupCodeBadge({ code }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState(null);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Pickup code copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy — select and copy manually.");
    }
  };

  const toggleQr = async () => {
    if (qrUrl) return setQrUrl(null);
    const url = await QRCode.toDataURL(code, { width: 160, margin: 1, color: { dark: "#0f172a" } });
    setQrUrl(url);
  };

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row" style={{ gap: 8 }}>
        <span className="pickup-code">{code}</span>
        <button className="icon-btn" title="Copy code" onClick={copyCode}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
        <button className="icon-btn" title="Show QR" onClick={toggleQr}>
          <QrCode className="h-4 w-4" />
        </button>
      </div>
      {qrUrl && (
        <img src={qrUrl} alt={`QR code for pickup code ${code}`} style={{ width: 120, height: 120, borderRadius: 10, border: "1.5px solid rgb(226 232 240)" }} />
      )}
    </div>
  );
}
