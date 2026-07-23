import { useEffect, useRef, useState } from "react";

// Signature primitive. ✓ = confirmed from user's profile, ? = couldn't verify
// (missing info, not a failure). Animate on mount.
export default function EvidenceChip({ kind = "check", children, delay = 0 }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const isCheck = kind === "check";

  return (
    <span
      ref={ref}
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium leading-none",
        "border transition-transform duration-200 hover:-translate-y-0.5",
        isCheck
          ? "bg-mist text-jade border-emerald/25"
          : "bg-sand text-jade border-gold/40",
        visible ? "sn-animate-chip" : "opacity-0",
      ].join(" ")}
      style={{ animationDelay: `${delay}ms` }}
    >
      {isCheck ? (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M3 8.5l3.2 3.2L13 5"
            stroke="#0E4F3F"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="24"
            style={{ animation: "sn-check-draw 0.5s ease-out 0.15s both" }}
          />
        </svg>
      ) : (
        <span
          className="flex h-3 w-3 items-center justify-center rounded-full bg-gold/25 text-[9px] font-bold text-gold"
          style={{ animation: "sn-pulse-ring 2.2s ease-out infinite" }}
        >
          ?
        </span>
      )}
      <span className="whitespace-nowrap">{children}</span>
    </span>
  );
}