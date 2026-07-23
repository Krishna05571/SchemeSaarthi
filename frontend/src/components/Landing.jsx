import { useEffect, useRef, useState } from "react";
import EvidenceChip from "./EvidenceChip.jsx";

// Orbiting SVG nodes — each represents a scheme category matching to
// the profile at the centre. Pure SVG, no deps.
function OrbitField() {
  const nodes = [
    { r: 90,  size: 8,  delay: 0,   label: "MSME" },
    { r: 90,  size: 6,  delay: -8,  label: "Credit" },
    { r: 90,  size: 10, delay: -18, label: "Subsidy" },
    { r: 140, size: 6,  delay: -4,  label: "NGO" },
    { r: 140, size: 8,  delay: -14, label: "Skills" },
    { r: 140, size: 5,  delay: -24, label: "Export" },
    { r: 190, size: 7,  delay: -2,  label: "Grant" },
    { r: 190, size: 5,  delay: -12, label: "Rural" },
    { r: 190, size: 9,  delay: -22, label: "Women" },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="relative h-[440px] w-[440px]">
        {/* concentric rings */}
        {[90, 140, 190].map((r, i) => (
          <div
            key={r}
            className="absolute left-1/2 top-1/2 rounded-full border border-emerald/15"
            style={{
              width: r * 2, height: r * 2,
              transform: "translate(-50%,-50%)",
              borderStyle: i === 1 ? "dashed" : "solid",
            }}
          />
        ))}
        {/* orbiting nodes */}
        {nodes.map((n, i) => (
          <div
            key={i}
            className={i % 2 ? "sn-animate-orbit-reverse" : "sn-animate-orbit"}
            style={{
              position: "absolute",
              inset: 0,
              animationDelay: `${n.delay}s`,
            }}
          >
            <div
              className="absolute left-1/2 top-1/2 flex items-center gap-1.5 rounded-full border border-emerald/30 bg-paper/90 px-2 py-1 shadow-[0_4px_14px_-6px_rgba(14,79,63,0.35)] backdrop-blur"
              style={{ transform: `translate(-50%,-50%) translateX(${n.r}px)` }}
            >
              <span
                className="rounded-full bg-emerald"
                style={{ width: n.size, height: n.size }}
              />
              <span className="font-mono text-[10px] tracking-tight text-jade">
                {n.label}
              </span>
            </div>
          </div>
        ))}
        {/* centre profile node */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-jade to-emerald text-mint shadow-[0_20px_50px_-15px_rgba(14,79,63,0.6)]">
            <span className="font-display text-2xl">You</span>
            <span className="absolute inset-0 rounded-full sn-animate-pulse-ring" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AnimatedHeadline() {
  const line1 = "4,000+ government schemes exist.";
  const line2 = "Let's find the ones";
  const line3 = "you actually qualify for.";
  return (
    <h1 className="font-display text-[42px] font-light leading-[1.05] tracking-tight text-ink sm:text-[64px]">
      <span className="block sn-animate-fade-up" style={{ animationDelay: "80ms" }}>
        {line1}
      </span>
      <span className="block sn-animate-fade-up" style={{ animationDelay: "240ms" }}>
        {line2}
      </span>
      <span
        className="block sn-gradient-text font-semibold italic sn-animate-fade-up"
        style={{ animationDelay: "400ms" }}
      >
        {line3}
      </span>
    </h1>
  );
}

function MagneticButton({ children, onClick }) {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const b = el.getBoundingClientRect();
    const x = e.clientX - (b.left + b.width / 2);
    const y = e.clientY - (b.top + b.height / 2);
    el.style.transform = `translate(${x * 0.18}px, ${y * 0.25}px)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = "translate(0,0)";
  };
  return (
    <button
      onClick={onClick}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="group relative inline-flex items-center justify-center overflow-hidden rounded-2xl bg-ink px-9 py-4 text-sm font-semibold text-paper shadow-[0_20px_50px_-15px_rgba(14,79,63,0.5)] transition-all duration-300 hover:shadow-[0_25px_60px_-15px_rgba(201,162,75,0.55)]"
    >
      <span ref={ref} className="relative z-10 flex items-center gap-2 transition-transform duration-200">
        {children}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-gold/40 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
      <span className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{
        background: "radial-gradient(circle at var(--x,50%) var(--y,50%), rgba(201,162,75,0.35), transparent 60%)",
      }} />
    </button>
  );
}

export default function Landing({ onStart }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section className="relative -mt-12 overflow-hidden">
      {/* Ambient mesh background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute -left-40 top-10 h-[500px] w-[500px] rounded-full opacity-40 blur-3xl sn-animate-blob"
          style={{ background: "radial-gradient(circle, #A8D5C4 0%, transparent 70%)" }}
        />
        <div
          className="absolute -right-32 top-40 h-[480px] w-[480px] rounded-full opacity-30 blur-3xl sn-animate-blob"
          style={{ background: "radial-gradient(circle, #E6D29A 0%, transparent 70%)", animationDelay: "-6s" }}
        />
        <div
          className="absolute left-1/2 top-1/3 h-[520px] w-[520px] -translate-x-1/2 rounded-full opacity-20 blur-3xl sn-animate-blob"
          style={{ background: "radial-gradient(circle, #17876B 0%, transparent 70%)", animationDelay: "-12s" }}
        />
      </div>

      <div className="relative mx-auto grid min-h-[82vh] max-w-6xl grid-cols-1 items-center gap-10 px-6 py-16 lg:grid-cols-[1.1fr_1fr]">
        <div className={mounted ? "sn-animate-fade-in" : "opacity-0"}>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald/30 bg-paper/70 px-3 py-1.5 backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-jade">
              Government scheme discovery, simplified
            </span>
          </div>

          <AnimatedHeadline />

          <p
            className="mt-8 max-w-xl text-[17px] leading-relaxed text-muted sn-animate-fade-up"
            style={{ animationDelay: "560ms" }}
          >
            Answer a few questions about your business or NGO. We match you
            against real eligibility criteria, explain exactly why you qualify,
            and answer follow-up questions grounded in the official scheme text.
          </p>

          <div
            className="mt-8 flex flex-wrap items-center gap-2 sn-animate-fade-up"
            style={{ animationDelay: "720ms" }}
          >
            <EvidenceChip kind="check" delay={800}>Rule-based eligibility</EvidenceChip>
            <EvidenceChip kind="check" delay={900}>Cites official sources</EvidenceChip>
            <EvidenceChip kind="unknown" delay={1000}>Flags what we can't verify</EvidenceChip>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-6 sn-animate-fade-up" style={{ animationDelay: "880ms" }}>
            <MagneticButton onClick={onStart}>Find my schemes</MagneticButton>
            <div className="flex items-center gap-3 text-xs text-muted">
              <div className="flex -space-x-1.5">
                {["#0E4F3F","#17876B","#C9A24B"].map((c) => (
                  <span key={c} className="h-6 w-6 rounded-full border-2 border-paper" style={{ background: c }} />
                ))}
              </div>
              <span>MSMEs · NGOs · Startups across 28 states</span>
            </div>
          </div>
        </div>

        <div className="relative h-[440px] w-full">
          <OrbitField />
        </div>
      </div>

      {/* Trust strip */}
      <div className="relative mx-auto max-w-6xl border-t border-ink/5 px-6 py-6">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            ["4,000+", "schemes indexed"],
            ["28", "states covered"],
            ["0", "fabricated scores"],
            ["100%", "sourced from myScheme.gov.in"],
          ].map(([n, l]) => (
            <div key={l}>
              <div className="font-display text-2xl text-jade">{n}</div>
              <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}