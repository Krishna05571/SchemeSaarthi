import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { askChat } from "../api.js";
import { useLanguage } from "../context/LanguageContext.jsx";

function TypingShimmer() {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-emerald"
          style={{
            animation: `sn-fade-in 0.6s ease-in-out ${i * 0.15}s infinite alternate`,
          }}
        />
      ))}
      <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-muted">
        {t("thinking")}
      </span>
    </div>
  );
}

function Bubble({ role, children }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-ink px-4 py-2.5 text-sm text-paper shadow-[0_6px_18px_-8px_rgba(11,31,28,0.4)]">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-jade to-emerald font-mono text-[10px] text-mint">
        SS
      </span>
      <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-mist px-4 py-2.5 text-sm text-ink">
        {children}
      </div>
    </div>
  );
}

export default function ChatWidget({ title, slug, persona, inline = false }) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(inline);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const displayTitle = title || t("chat_default_title");

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (e) => {
    e?.preventDefault();
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setLoading(true);
    try {
      const res = await askChat(q, { slug, persona, language });
      setMessages((m) => [...m, { role: "assistant", content: res.answer, sources: res.sources }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", content: `⚠ ${err.message}`, error: true }]);
    } finally {
      setLoading(false);
    }
  };

  const panel = (
    <div
      className={[
        "flex flex-col overflow-hidden rounded-2xl border border-ink/6 bg-paper/95 backdrop-blur-xl shadow-[0_25px_70px_-20px_rgba(11,31,28,0.35)]",
        inline ? "h-[520px]" : "h-[520px] w-[380px]",
      ].join(" ")}
    >
      <div className="flex items-center justify-between border-b border-ink/6 bg-gradient-to-r from-jade to-emerald px-4 py-3 text-paper">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-mint/90">
            {t("chat_badge")}
          </div>
          <div className="font-display text-sm">{displayTitle}</div>
        </div>
        {!inline && (
          <button onClick={() => setOpen(false)} className="text-mint hover:text-paper" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !loading && (
          <div className="rounded-xl bg-mist p-3 text-xs text-muted">
            {t("chat_intro")}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className="sn-animate-fade-up">
            <Bubble role={m.role}>
              {m.role === "assistant" ? (
                <div className="prose prose-sm max-w-none text-ink prose-p:my-1 prose-p:text-ink/85">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {m.sources.map((s, k) => (
                        <a key={k} href={typeof s === "string" ? s : s.url} target="_blank" rel="noreferrer"
                          className="rounded-full border border-ink/10 bg-paper px-2 py-0.5 text-[10px] font-medium text-emerald hover:border-emerald"
                        >
                          {typeof s === "string" ? t("source_tag") : (s.title || t("source_tag"))}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ) : m.content}
            </Bubble>
          </div>
        ))}
        {loading && <Bubble role="assistant"><TypingShimmer /></Bubble>}
      </div>

      <form onSubmit={send} className="flex gap-2 border-t border-ink/6 bg-paper px-3 py-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("chat_placeholder")}
          className="flex-1 rounded-xl border border-ink/10 bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/20"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-xl bg-ink px-3 py-2 text-paper transition-colors hover:bg-jade disabled:opacity-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </form>
    </div>
  );

  if (inline) return panel;

  return (
    <>
      {open ? (
        <div className="fixed bottom-6 right-6 z-50 sn-animate-fade-up">{panel}</div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper shadow-[0_20px_50px_-15px_rgba(14,79,63,0.55)] transition-all hover:-translate-y-0.5 hover:shadow-[0_25px_60px_-15px_rgba(201,162,75,0.55)]"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-emerald to-gold">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="#0B1F1C" strokeWidth="2" strokeLinejoin="round"/></svg>
          </span>
          {t("btn_ask_schemes")}
        </button>
      )}
    </>
  );
}