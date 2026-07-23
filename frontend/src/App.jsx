import { useState } from "react";
import Header from "./components/Header.jsx";
import Landing from "./components/Landing.jsx";
import ProfileForm from "./components/ProfileForm.jsx";
import DocumentUpload from "./components/DocumentUpload.jsx";
import SchemeCard from "./components/SchemeCard.jsx";
import SchemeDetail from "./components/SchemeDetail.jsx";
import AdvisorPanel from "./components/AdvisorPanel.jsx";
import ChatWidget from "./components/ChatWidget.jsx";
import { getAdvisor } from "./api.js";

export default function App() {
  const [screen, setScreen] = useState("landing"); // landing | form | results | detail
  const [profile, setProfile] = useState(null);
  const [prefill, setPrefill] = useState(null);
  const [advisorResult, setAdvisorResult] = useState(null);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleProfileSubmit = async (submittedProfile) => {
    setProfile(submittedProfile);
    setLoading(true);
    setError(null);
    try {
      const result = await getAdvisor(submittedProfile);
      setAdvisorResult(result);
      setScreen("results");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const chatPersona =
    profile?.entity_type === "MSME" ? "MSME" : profile?.entity_type ? "NGO" : null;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Header onLogoClick={() => setScreen("landing")} />

      <main>
        {screen === "landing" && <Landing onStart={() => setScreen("form")} />}

        {screen === "form" && (
          <div className="mx-auto max-w-2xl px-6 py-14 sn-animate-fade-up">
            <div className="mb-2 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-emerald">
              Step 1 of 2 · Profile
            </div>
            <h2 className="mb-3 text-center font-display text-4xl leading-tight text-ink">
              Tell us about your <span className="sn-gradient-text font-semibold italic">business or NGO</span>
            </h2>
            <p className="mb-10 text-center text-sm leading-relaxed text-muted">
              The more you share, the more precise your matches — but every field
              below is optional except how you're registering.
            </p>
            <DocumentUpload onExtracted={setPrefill} />
            <ProfileForm onSubmit={handleProfileSubmit} loading={loading} prefill={prefill} />
            {error && (
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-coral/25 bg-coral/5 px-4 py-3 text-sm text-coral">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-coral/15 font-bold">!</span>
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {screen === "results" && advisorResult && (
          <div className="mx-auto max-w-4xl px-6 py-12 sn-animate-fade-up">
            <button
              onClick={() => setScreen("form")}
              className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-emerald hover:text-jade"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Edit your profile
            </button>

            <div className="mb-8">
              <AdvisorPanel
                recommendation={advisorResult.recommendation}
                sources={advisorResult.sources}
              />
            </div>

            <div className="mb-6 flex items-baseline justify-between">
              <h2 className="font-display text-3xl text-ink">
                <span className="sn-gradient-text font-semibold">{advisorResult.eligible_schemes.length}</span>{" "}
                eligible scheme{advisorResult.eligible_schemes.length === 1 ? "" : "s"}
              </h2>
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
                Sorted by match strength
              </span>
            </div>

            {advisorResult.eligible_schemes.length === 0 ? (
              <div className="rounded-2xl border border-ink/6 bg-card p-8 text-center">
                <div className="font-display text-lg text-ink">No exact matches — yet</div>
                <p className="mt-2 text-sm text-muted">
                  Try adjusting your sector or business stage. Small changes can unlock several schemes.
                </p>
              </div>
            ) : (
              <div className="mb-14 grid grid-cols-1 gap-4">
                {advisorResult.eligible_schemes.map((s, i) => (
                  <SchemeCard
                    key={s.slug}
                    scheme={s}
                    index={i}
                    onSelect={(sch) => {
                      setSelectedScheme(sch);
                      setScreen("detail");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                ))}
              </div>
            )}

            <ChatWidget
              persona={chatPersona}
              title="Ask about your eligible schemes"
            />
          </div>
        )}

        {screen === "detail" && selectedScheme && (
          <SchemeDetail scheme={selectedScheme} onBack={() => setScreen("results")} />
        )}
      </main>

      <footer className="mt-20 border-t border-ink/5 py-8 text-center text-xs text-muted">
        <span className="font-mono uppercase tracking-[0.2em]">
          Scheme Navigator · Grounded in myScheme.gov.in
        </span>
      </footer>
    </div>
  );
}