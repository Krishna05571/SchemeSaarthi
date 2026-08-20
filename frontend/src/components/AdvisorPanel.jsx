import ReactMarkdown from "react-markdown";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function AdvisorPanel({ recommendation, sources }) {
  const { t } = useLanguage();
  if (!recommendation) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald/25 bg-gradient-to-br from-mist via-paper to-sand p-6 shadow-[0_15px_40px_-20px_rgba(14,79,63,0.35)]">
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gold/15 blur-3xl" />
      <div className="relative">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-jade text-mint">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2l2.4 5 5.6.8-4 4 1 5.6L12 15l-5 2.4 1-5.6-4-4 5.6-.8L12 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
            </svg>
          </span>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald">
              {t("advisor_rec")}
            </div>
            <div className="font-display text-lg text-ink">{t("guidance_title")}</div>
          </div>
        </div>

        <div className="prose prose-sm max-w-none text-ink prose-p:text-ink/85 prose-strong:text-jade">
          <ReactMarkdown>{recommendation}</ReactMarkdown>
        </div>

        {sources && sources.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink/5 pt-4">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">{t("sources")}</span>
            {sources.map((s, i) => {
              // Backend returns sources as plain scheme-name strings, not URLs —
              // render as a plain label, not a link.
              const label = typeof s === "string" ? s : s.title || s.url || "Source";
              return (
                <span
                  key={i}
                  className="rounded-full border border-ink/10 bg-paper px-2.5 py-1 text-[11px] font-medium text-jade"
                >
                  {label}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}