import { useRef, useState } from "react";
import { uploadDocument } from "../api.js";

export default function DocumentUpload({ onExtracted }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | parsing | done | error
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleFile = async (f) => {
    setFile(f);
    setStatus("parsing");
    setError(null);
    try {
      const data = await uploadDocument(f);
      onExtracted?.(data.extracted || data);
      setStatus("done");
    } catch (e) {
      setError(e.message);
      setStatus("error");
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-px flex-1 bg-ink/10" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          Optional shortcut
        </span>
        <div className="h-px flex-1 bg-ink/10" />
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={[
          "relative cursor-pointer overflow-hidden rounded-2xl p-6 transition-all",
          "bg-paper",
          dragging
            ? "shadow-[0_20px_60px_-20px_rgba(23,135,107,0.5)] scale-[1.01]"
            : "hover:shadow-[0_15px_40px_-20px_rgba(14,79,63,0.35)]",
        ].join(" ")}
        style={{
          backgroundImage: dragging
            ? "linear-gradient(90deg, #17876B 0%, #C9A24B 50%, #17876B 100%)"
            : "linear-gradient(90deg, rgba(23,135,107,0.35) 0%, rgba(201,162,75,0.35) 50%, rgba(23,135,107,0.35) 100%)",
          backgroundSize: "200% 100%",
          padding: "1.5px",
          animation: "sn-border-flow 6s linear infinite",
        }}
      >
        <div className="rounded-[calc(1rem-1px)] bg-paper p-6">
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,image/*"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          {status === "idle" && (
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mist text-jade">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-ink">
                  Drop a registration document to auto-fill
                </div>
                <div className="text-xs text-muted">
                  Udyam certificate, NGO Darpan, PAN, or any registration PDF. We extract the fields.
                </div>
              </div>
              <span className="rounded-lg border border-ink/10 bg-paper px-3 py-1.5 text-[11px] font-medium text-jade">
                Browse
              </span>
            </div>
          )}

          {status === "parsing" && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-jade">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald/30 border-t-emerald" />
                Reading <span className="font-mono">{file?.name}</span>…
              </div>
              <div className="space-y-2">
                {[70, 45, 60].map((w, i) => (
                  <div key={i} className="h-3 overflow-hidden rounded-full bg-mist">
                    <div className="h-full sn-shimmer-bg" style={{ width: `${w}%` }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {status === "done" && (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald/15 text-emerald">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-ink">Extracted — form pre-filled below</div>
                <div className="text-xs text-muted">{file?.name} · review and adjust as needed</div>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral/10 text-coral">!</div>
              <div>
                <div className="text-sm font-semibold text-coral">Couldn't parse this file</div>
                <div className="text-xs text-muted">{error} — you can fill the form manually below.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}