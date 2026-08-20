import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import EvidenceChip from "./EvidenceChip.jsx";
import MatchStrengthRing from "./MatchStrengthRing.jsx";
import ChatWidget from "./ChatWidget.jsx";
import { getSchemeDetail } from "../api.js";
import { useLanguage } from "../context/LanguageContext.jsx";

const mdClass =
  "prose prose-sm max-w-none text-ink prose-headings:font-display prose-headings:text-ink prose-p:text-ink/85 prose-p:leading-relaxed prose-p:mb-4 prose-a:text-emerald prose-strong:text-jade prose-li:my-1";

const SECTION_ICONS = {
  about: "◆",
  benefits: "★",
  eligibility: "✓",
  documents: "▤",
  application: "→",
};

// Collapses long text to a preview with a fade-out + "Read more" toggle.
// Nothing is removed — full text is always one click away.
function CollapsibleText({ children, previewChars = 320 }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const text = typeof children === "string" ? children : "";
  const isLong = text.length > previewChars;

  if (!isLong) {
    return (
      <div className={mdClass}>
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div>
      <div className={`${mdClass} relative`} style={!expanded ? { maxHeight: "6.5rem", overflow: "hidden" } : undefined}>
        <ReactMarkdown>{text}</ReactMarkdown>
        {!expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-paper to-transparent" />
        )}
      </div>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="mt-2 text-xs font-semibold uppercase tracking-wider text-emerald hover:text-jade"
      >
        {expanded ? t("show_less") : t("read_full")}
      </button>
    </div>
  );
}

function Section({ iconKey, title, children }) {
  return (
    <section className="mb-8 max-w-[640px]">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mist text-xs text-jade">
          {SECTION_ICONS[iconKey] || "•"}
        </span>
        <h3 className="font-display text-base text-jade">{title}</h3>
      </div>
      <CollapsibleText>{children}</CollapsibleText>
    </section>
  );
}

export default function SchemeDetail({ scheme, onBack }) {
  const { t, translateCriteria } = useLanguage();
  const [full, setFull] = useState(scheme);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (scheme?.slug && !scheme.description_md) {
      setLoading(true);
      getSchemeDetail(scheme.slug)
        .then((data) => setFull({ ...scheme, ...data }))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [scheme?.slug]);

  const s = full || scheme;
  const reasons = s.reasons || [];
  const unverified = s.unverified_criteria || [];
  const registrations = s.registration_required || [];

  const applicationText = useMemo(() => {
    if (!s.application_process) return null;
    return typeof s.application_process === "string"
      ? s.application_process
      : JSON.stringify(s.application_process);
  }, [s.application_process]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-emerald hover:text-jade"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        {t("btn_back")}
      </button>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_340px]">
        {/* Main column */}
        <div className="min-w-0">
          {s.persona && (
            <span className="mb-3 inline-block rounded-full bg-mist px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-jade">
              {s.persona}
            </span>
          )}
          <h1 className="mb-4 max-w-[640px] font-display text-4xl leading-tight text-ink sm:text-5xl">
            {s.scheme_name}
          </h1>

          {s.description_md && (
            <div className="mb-8 max-w-[640px]">
              <CollapsibleText previewChars={260}>{s.description_md}</CollapsibleText>
            </div>
          )}

          {loading && (
            <div className="mb-8 max-w-[640px] rounded-xl bg-mist p-4 text-sm text-muted sn-shimmer-bg">
              {t("loading_details")}
            </div>
          )}

          {s.benefits_md && (
            <Section iconKey="benefits" title={t("sec_benefits")}>
              {s.benefits_md}
            </Section>
          )}
          {s.eligibility_md && (
            <Section iconKey="eligibility" title={t("sec_eligibility")}>
              {s.eligibility_md}
            </Section>
          )}
          {s.documents_required_md && (
            <Section iconKey="documents" title={t("sec_documents")}>
              {s.documents_required_md}
            </Section>
          )}
          {applicationText && (
            <Section iconKey="application" title={t("sec_application")}>
              {applicationText}
            </Section>
          )}
        </div>

        {/* Sticky summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-ink/6 bg-card shadow-[0_15px_50px_-25px_rgba(11,31,28,0.35)]">
            <div className="bg-gradient-to-br from-jade to-emerald p-5 text-paper">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-mint/90">
                {t("sidebar_match")}
              </div>
              <div className="mt-3">
                <MatchStrengthRing score={s.match_strength} size={72} />
              </div>
            </div>

            <div className="p-5">
              <div className="mb-4">
                <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted">
                  {t("sidebar_confirmed")}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {reasons.length === 0 && (
                    <span className="text-xs text-muted">{t("nothing_confirmed")}</span>
                  )}
                  {reasons.map((r, i) => (
                    <EvidenceChip key={i} kind="check" delay={i * 60}>
                      {translateCriteria(r)}
                    </EvidenceChip>
                  ))}
                </div>
              </div>

              {unverified.length > 0 && (
                <div className="mb-4">
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted">
                    {t("sidebar_unverified")}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {unverified.map((r, i) => (
                      <EvidenceChip key={i} kind="unknown" delay={i * 60}>
                        {translateCriteria(r)}
                      </EvidenceChip>
                    ))}
                  </div>
                </div>
              )}

              {registrations.length > 0 && (
                <div className="mb-4">
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted">
                    {t("sidebar_registrations")}
                  </div>
                  <ul className="space-y-1 text-sm text-ink">
                    {registrations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {s.other_conditions && (
                <div className="mb-4 rounded-xl bg-sand p-3 text-xs text-ink/80">
                  <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-gold">
                    {t("sidebar_other_conditions")}
                  </div>
                  {s.other_conditions}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-12">
        <ChatWidget
          slug={s.slug}
          persona={s.persona}
          title={t("ask_about_scheme", { name: s.scheme_name })}
          inline
        />
      </div>
    </div>
  );
}
