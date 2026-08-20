import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { SECTOR_TRANSLATIONS, STATE_TRANSLATIONS } from "../locales/translations.js";

const ENTITY_CONFIG = [
  { key: "MSME", tKey: "entity_msme" },
  { key: "NGO", tKey: "entity_ngo" },
  { key: "Individual", tKey: "entity_individual" },
  { key: "Startup", tKey: "entity_startup" },
];

const STAGE_CONFIG = [
  { key: "Idea", tKey: "stage_idea" },
  { key: "Registered", tKey: "stage_registered" },
  { key: "Operational", tKey: "stage_operational" },
  { key: "Scaling", tKey: "stage_scaling" },
];

const SECTORS = [
  "Agriculture", "Manufacturing", "Services", "Handicrafts",
  "Education", "Healthcare", "Technology", "Retail", "Textiles", "Other",
];

const STATES = [
  "Andhra Pradesh","Assam","Bihar","Delhi","Gujarat","Haryana","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Odisha","Punjab","Rajasthan",
  "Tamil Nadu","Telangana","Uttar Pradesh","Uttarakhand","West Bengal",
];

const GENDERS = [
  { key: "Female", tKey: "gender_female" },
  { key: "Male", tKey: "gender_male" },
  { key: "Other", tKey: "gender_other" },
];

function Segmented({ label, options, value, onChange, required }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted">
          {label} {required && <span className="text-coral">*</span>}
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              className={[
                "rounded-xl border px-4 py-2 text-sm font-medium transition-all",
                active
                  ? "border-jade bg-jade text-paper shadow-[0_8px_20px_-8px_rgba(14,79,63,0.6)]"
                  : "border-ink/10 bg-paper text-ink hover:border-emerald hover:-translate-y-0.5",
              ].join(" ")}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-ink/10 bg-paper px-4 py-3 text-sm text-ink placeholder:text-muted/70 focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/25 transition";

export default function ProfileForm({ onSubmit, loading, prefill }) {
  const { t, language, isHindi } = useLanguage();
  const [profile, setProfile] = useState({
    entity_type: "",
    gender: "",
    age: "",
    annual_income_inr: "",
    state: "",
    business_stage: "",
    sector: "",
  });

  useEffect(() => {
    if (prefill) setProfile((p) => ({ ...p, ...prefill }));
  }, [prefill]);

  const update = (k, v) => setProfile((p) => ({ ...p, [k]: v }));

  const filled = useMemo(
    () => Object.values(profile).filter((v) => v !== "" && v !== null).length,
    [profile]
  );
  const total = 7;

  // Backend only recognizes business_stage as "new" | "existing" | null.
  // Map our richer 4-stage UI onto that 2-value contract.
  const STAGE_MAP = { Idea: "new", Registered: "new", Operational: "existing", Scaling: "existing" };

  const submit = (e) => {
    e.preventDefault();
    const payload = {
      ...profile,
      age: profile.age ? Number(profile.age) : null,
      annual_income_inr: profile.annual_income_inr ? Number(profile.annual_income_inr) : null,
      business_stage: STAGE_MAP[profile.business_stage] || null,
    };
    onSubmit(payload);
  };

  const summary = useMemo(() => {
    const parts = [];
    if (profile.entity_type) {
      const match = ENTITY_CONFIG.find((e) => e.key === profile.entity_type);
      parts.push(match ? t(match.tKey) : profile.entity_type);
    }
    if (profile.business_stage) {
      const match = STAGE_CONFIG.find((s) => s.key === profile.business_stage);
      const stageName = match ? t(match.tKey) : profile.business_stage;
      parts.push(isHindi ? `${stageName} ${t("stage_suffix")}` : `${profile.business_stage.toLowerCase()} ${t("stage_suffix")}`);
    }
    if (profile.sector) {
      const secName = SECTOR_TRANSLATIONS[profile.sector]?.[language] || profile.sector;
      parts.push(isHindi ? `${secName} ${t("in_sector_prefix")}` : `${t("in_sector_prefix")} ${profile.sector.toLowerCase()}`);
    }
    if (profile.state) {
      const stateName = STATE_TRANSLATIONS[profile.state]?.[language] || profile.state;
      parts.push(isHindi ? `${stateName} ${t("from_state_prefix")}` : `${t("from_state_prefix")} ${profile.state}`);
    }
    return parts.join(" · ");
  }, [profile, language, isHindi, t]);

  const entityOptions = useMemo(
    () => ENTITY_CONFIG.map((e) => ({ key: e.key, label: t(e.tKey) })),
    [t]
  );

  const stageOptions = useMemo(
    () => STAGE_CONFIG.map((s) => ({ key: s.key, label: t(s.tKey) })),
    [t]
  );

  return (
    <form onSubmit={submit} className="space-y-8">
      {/* Live summary card */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald/25 bg-gradient-to-br from-mist/60 via-paper to-sand p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald">
              {t("live_profile")}
            </div>
            <div className="font-display text-lg text-ink">
              {summary || t("live_profile_empty")}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-display text-2xl text-jade">
              {filled}<span className="text-muted">/{total}</span>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted">{t("fields_filled")}</div>
          </div>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-ink/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-jade via-emerald to-gold transition-[width] duration-500"
            style={{ width: `${(filled / total) * 100}%` }}
          />
        </div>
      </div>

      <Segmented
        label={t("lbl_registering")}
        options={entityOptions}
        value={profile.entity_type}
        onChange={(v) => update("entity_type", v)}
        required
      />

      <Segmented
        label={t("lbl_business_stage")}
        options={stageOptions}
        value={profile.business_stage}
        onChange={(v) => update("business_stage", v)}
      />

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">
          {t("lbl_sector")}
        </label>
        <div className="flex flex-wrap gap-2">
          {SECTORS.map((s) => {
            const active = profile.sector === s;
            const label = SECTOR_TRANSLATIONS[s]?.[language] || s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => update("sector", s)}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                  active
                    ? "border-jade bg-jade text-paper"
                    : "border-ink/10 bg-paper text-muted hover:border-emerald hover:text-ink",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label={t("lbl_state")}>
          <select
            value={profile.state}
            onChange={(e) => update("state", e.target.value)}
            className={inputCls}
          >
            <option value="">{t("select_state")}</option>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {STATE_TRANSLATIONS[s]?.[language] || s}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t("lbl_gender")}>
          <div className="flex gap-2">
            {GENDERS.map((g) => {
              const active = profile.gender === g.key;
              return (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => update("gender", g.key)}
                  className={[
                    "flex-1 rounded-xl border px-3 py-3 text-sm transition-all",
                    active
                      ? "border-jade bg-jade text-paper"
                      : "border-ink/10 bg-paper text-ink hover:border-emerald",
                  ].join(" ")}
                >
                  {t(g.tKey)}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label={t("lbl_age")}>
          <input
            type="number" min="14" max="100"
            value={profile.age}
            onChange={(e) => update("age", e.target.value)}
            className={inputCls}
            placeholder={t("ph_age")}
          />
        </Field>

        <Field label={t("lbl_income")}>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm text-muted">₹</span>
            <input
              type="number" min="0"
              value={profile.annual_income_inr}
              onChange={(e) => update("annual_income_inr", e.target.value)}
              className={inputCls + " pl-8"}
              placeholder={t("ph_income")}
            />
          </div>
        </Field>
      </div>

      <button
        type="submit"
        disabled={loading || !profile.entity_type}
        className="group relative inline-flex w-full items-center justify-center overflow-hidden rounded-2xl bg-ink px-8 py-4 text-sm font-semibold text-paper shadow-[0_20px_50px_-15px_rgba(14,79,63,0.5)] transition-all hover:shadow-[0_25px_60px_-15px_rgba(201,162,75,0.55)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="relative z-10 flex items-center gap-2">
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-paper/30 border-t-paper" />
              {t("btn_matching")}
            </>
          ) : (
            <>
              {t("btn_match")}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </>
          )}
        </span>
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-gold/40 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
      </button>
    </form>
  );
}