import { useEffect, useState } from "react";

export default function Header({ onLogoClick }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={[
        "sticky top-0 z-40 transition-all duration-300",
        scrolled
          ? "bg-paper/75 backdrop-blur-xl border-b border-ink/5 shadow-[0_1px_0_rgba(11,31,28,0.03)]"
          : "bg-transparent border-b border-transparent",
      ].join(" ")}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <button
          onClick={onLogoClick}
          className="group flex items-center gap-3"
          aria-label="Go home"
        >
          <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-jade text-mint shadow-[0_6px_20px_-6px_rgba(14,79,63,0.55)] transition-transform group-hover:-translate-y-0.5">
            <span className="font-mono text-[11px] font-semibold tracking-tight">SN</span>
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-gold/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-[15px] font-semibold text-ink">
              Scheme Navigator
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              India · MSME · NGO
            </span>
          </span>
        </button>
        <span className="hidden items-center gap-2 text-xs text-muted sm:flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald" />
          Grounded in myScheme.gov.in
        </span>
      </div>
    </header>
  );
}