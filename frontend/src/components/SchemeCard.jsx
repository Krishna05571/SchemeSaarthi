import { useRef, useState } from "react";
import EvidenceChip from "./EvidenceChip.jsx";
import MatchStrengthRing from "./MatchStrengthRing.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

function strengthLabel(s, t) {
  // s is match_strength — an integer count of confirmed criteria, not a 0-1 probability.
  if (typeof s !== "number") return { text: t("possible_match"), color: "#17876B" };
  if (s >= 4) return { text: t("strong_match"), color: "#C9A24B" };
  if (s >= 2) return { text: t("good_match"), color: "#0E4F3F" };
  return { text: t("possible_match"), color: "#17876B" };
}

export default function SchemeCard({ scheme, onSelect, index = 0 }) {
  const { t, translateCriteria } = useLanguage();
  const ref = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const b = el.getBoundingClientRect();
    const px = (e.clientX - b.left) / b.width - 0.5;
    const py = (e.clientY - b.top) / b.height - 0.5;
    setTilt({ x: -py * 4, y: px * 6 });
  };
  const onLeave = () => setTilt({ x: 0, y: 0 });

  const reasons = scheme.reasons || [];
  const unverified = scheme.unverified_criteria || [];
  const previewChips = 4;

  return (
    <article
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="group sn-tilt-card sn-animate-fade-up relative overflow-hidden rounded-2xl border border-ink/6 bg-card shadow-[0_8px_28px_-16px_rgba(11,31,28,0.25)] hover:shadow-[0_25px_60px_-25px_rgba(14,79,63,0.4)]"
      style={{
        transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        animationDelay: `${index * 80}ms`,
      }}
    >
      {/* Persona accent stripe */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-jade via-emerald to-gold" />

      <div className="p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {scheme.persona && (
              <span className="mb-2 inline-block rounded-full bg-mist px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-jade">
                {scheme.persona}
              </span>
            )}
            <h3 className="font-display text-xl leading-snug text-ink">
              {scheme.scheme_name}
            </h3>
          </div>
          <div className="shrink-0">
            <MatchStrengthRing score={scheme.match_strength} showLabel={false} />
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            {t("why_match")}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {reasons.slice(0, expanded ? undefined : previewChips).map((r, i) => (
              <EvidenceChip key={`r-${i}`} kind="check" delay={i * 60}>
                {translateCriteria(r)}
              </EvidenceChip>
            ))}
            {unverified.slice(0, expanded ? undefined : Math.max(0, previewChips - reasons.length)).map((r, i) => (
              <EvidenceChip key={`u-${i}`} kind="unknown" delay={(reasons.length + i) * 60}>
                {translateCriteria(r)}
              </EvidenceChip>
            ))}
            {(reasons.length + unverified.length) > previewChips && !expanded && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
                className="rounded-full border border-dashed border-emerald/40 px-2.5 py-1 text-xs font-medium text-emerald hover:bg-mist"
              >
                {t("more_chips", { count: reasons.length + unverified.length - previewChips })}
              </button>
            )}
          </div>
        </div>

        {scheme.benefits_md && (
          <p className="mb-5 line-clamp-2 text-sm leading-relaxed text-muted">
            {String(scheme.benefits_md).replace(/[#*_>`]/g, "").slice(0, 180)}…
          </p>
        )}

        <div className="flex items-center justify-between border-t border-ink/5 pt-4">
          {(() => {
            const l = strengthLabel(scheme.match_strength, t);
            return (
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: l.color }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: l.color }} />
                {l.text}
              </span>
            );
          })()}
          <button
            type="button"
            onClick={() => onSelect?.(scheme)}
            className="group/btn inline-flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-xs font-semibold text-paper transition-all hover:bg-jade"
          >
            {t("btn_view_details")}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="transition-transform group-hover/btn:translate-x-0.5">
              <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Corner glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gold/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
    </article>
  );
}

// Hide the zero-size ring visual — trick to render only the label
// (MatchStrengthRing with size={0} still lays out; keep it simple by
// letting it render tiny — visually clipped by the flex row above.)