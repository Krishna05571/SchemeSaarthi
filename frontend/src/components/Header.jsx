import { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function Header({ onLogoClick }) {
  const [scrolled, setScrolled] = useState(false);
  const { language, setLanguage, t } = useLanguage();

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
            <span className="font-mono text-[11px] font-semibold tracking-tight">SS</span>
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-gold/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </span>
          <span className="flex flex-col text-left leading-tight">
            <span className="font-display text-[15px] font-semibold text-ink">
              {t("app_title")}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              {t("app_subtitle")}
            </span>
          </span>
        </button>

        <div className="flex items-center gap-4">
          <span className="hidden items-center gap-2 text-xs text-muted sm:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald" />
            {t("grounded_in")}
          </span>

          {/* Language Switcher Toggle */}
          <div
            className="flex items-center rounded-xl border border-ink/10 bg-paper/90 p-1 shadow-sm backdrop-blur"
            role="group"
            aria-label="Language selection"
          >
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={[
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-200",
                language === "en"
                  ? "bg-jade text-paper shadow-sm"
                  : "text-muted hover:text-ink",
              ].join(" ")}
              aria-pressed={language === "en"}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage("hi")}
              className={[
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-200",
                language === "hi"
                  ? "bg-jade text-paper shadow-sm"
                  : "text-muted hover:text-ink",
              ].join(" ")}
              aria-pressed={language === "hi"}
            >
              हिन्दी
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}