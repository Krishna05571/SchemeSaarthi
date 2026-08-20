import { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";

// Categorical, never a percentage. Ring visualisation is for feel only —
// the label ("Strong / Good / Possible match") is the source of truth.
// NOTE: `score` here is match_strength — an integer count of confirmed
// eligibility criteria from the rule engine, NOT a normalized 0-1 probability.
function classify(score, t) {
  if (typeof score !== "number") return { label: t("possible_match"), tier: 1 };
  if (score >= 4) return { label: t("strong_match"), tier: 3 };
  if (score >= 2) return { label: t("good_match"), tier: 2 };
  return { label: t("possible_match"), tier: 1 };
}

const TIER_ARC = { 1: 0.34, 2: 0.66, 3: 1 };
const TIER_COLOR = { 1: "#17876B", 2: "#0E4F3F", 3: "#C9A24B" };

export default function MatchStrengthRing({ score, size = 64, showLabel = true }) {
  const { t } = useLanguage();
  const { label, tier } = classify(score, t);
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const target = c * TIER_ARC[tier];
  const [dash, setDash] = useState(c);

  useEffect(() => {
    const t = setTimeout(() => setDash(c - target), 60);
    return () => clearTimeout(t);
  }, [target, c]);

  return (
    <div className="flex items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke="rgba(11,31,28,0.08)" strokeWidth={stroke}
          />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={TIER_COLOR[tier]} strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={dash}
            style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.2,0.7,0.2,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-xs font-semibold text-ink">
            {tier === 3 ? "S" : tier === 2 ? "G" : "P"}
          </span>
        </div>
      </div>
      {showLabel && (
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: TIER_COLOR[tier] }}
        >
          {label}
        </span>
      )}
    </div>
  );
}