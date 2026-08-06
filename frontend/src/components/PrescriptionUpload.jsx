import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UploadCloud, Loader2, ScanLine } from "lucide-react";
import client from "../api/client";
import { useToast } from "../context/ToastContext.jsx";

export default function PrescriptionUpload() {
  const navigate = useNavigate();
  const toast = useToast();
  const fileInput = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const pickFile = () => fileInput.current?.click();

  const handleFile = (file) => {
    if (!file || !file.type?.startsWith("image/")) return;
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setUploading(true);

    const form = new FormData();
    form.append("image", file);

    client
      .post("/catalog/prescription-ocr/", form, { headers: { "Content-Type": "multipart/form-data" } })
      .then((res) => setResult(res.data))
      .catch(() => toast.error("Couldn't read that prescription. Try a clearer, well-lit photo."))
      .finally(() => setUploading(false));
  };

  const onFileChange = (e) => {
    handleFile(e.target.files?.[0]);
    e.target.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="bento-feature">
      <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
        <div className="icon-badge on-dark"><ScanLine className="h-5 w-5" /></div>
        <div>
          <h2 style={{ color: "white", marginBottom: 3 }}>Upload a prescription</h2>
          <p style={{ color: "rgb(255 255 255 / 0.75)", fontSize: 13, margin: 0, lineHeight: 1.5 }}>
            We'll read the medicine names off the photo and let you search prices for them.
            This doesn't diagnose or recommend anything — it's just a faster way to search.
          </p>
        </div>
      </div>

      <div
        className={`dropzone${dragActive ? " drag-active" : ""}`}
        onClick={pickFile}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
      >
        {uploading ? (
          <>
            <Loader2 className="h-6 w-6" style={{ color: "white", animation: "spin 1s linear infinite" }} />
            <span style={{ color: "white", fontSize: 13, fontWeight: 500 }}>Reading prescription...</span>
          </>
        ) : (
          <>
            <UploadCloud className="h-7 w-7" style={{ color: "rgb(255 255 255 / 0.85)" }} />
            <span style={{ color: "white", fontSize: 14, fontWeight: 600 }}>
              Drop a photo here, or use the button below
            </span>
            <button
              type="button"
              className="btn"
              style={{ background: "white", color: "#047857", marginTop: 6 }}
              onClick={(e) => { e.stopPropagation(); pickFile(); }}
            >
              <span className="row" style={{ gap: 6 }}><UploadCloud className="h-4 w-4" /> Upload photo</span>
            </button>
            <span style={{ color: "rgb(255 255 255 / 0.6)", fontSize: 12 }}>JPG or PNG, up to 8MB</span>
          </>
        )}
        <input ref={fileInput} type="file" accept="image/*" onChange={onFileChange} style={{ display: "none" }} />
      </div>

      {previewUrl && (
        <div className="row" style={{ marginTop: 16, gap: 12, alignItems: "flex-start" }}>
          <img
            src={previewUrl}
            alt="Uploaded prescription"
            style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 10, border: "1.5px solid rgb(255 255 255 / 0.3)", flexShrink: 0 }}
          />
          <div className="stack" style={{ gap: 8, flex: 1 }}>
            {!uploading && result && result.matches.length === 0 && (
              <div style={{ color: "rgb(255 255 255 / 0.75)", fontSize: 13 }}>
                Couldn't confidently match any medicine names. Try a clearer photo, or search manually above.
              </div>
            )}

            {!uploading && result && result.matches.length > 0 && (
              <>
                <div style={{ color: "rgb(255 255 255 / 0.7)", fontSize: 12 }}>
                  Found {result.matches.length} possible match{result.matches.length > 1 ? "es" : ""}:
                </div>
                <div className="stack" style={{ gap: 8 }}>
                  {result.matches.map((m) => (
                    <div key={m.medicine_id} className="row spread" style={{ gap: 8, background: "rgb(255 255 255 / 0.08)", borderRadius: 12, padding: "10px 12px" }}>
                      <div>
                        <strong style={{ color: "white", fontSize: 14 }}>{m.brand_name}</strong>{" "}
                        <span style={{ color: "rgb(255 255 255 / 0.65)", fontSize: 12 }}>
                          {m.salt_name} · {m.strength}
                        </span>
                        {m.is_generic && <span className="badge teal" style={{ marginLeft: 6 }}>Generic</span>}
                      </div>
                      <button
                        className="btn"
                        style={{ background: "white", color: "#047857", flexShrink: 0 }}
                        onClick={() => navigate(`/search?q=${encodeURIComponent(m.brand_name)}`)}
                      >
                        Search
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
