import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { translations, translateCriteria as translateCriteriaHelper } from "../locales/translations.js";

const LanguageContext = createContext(null);

const STORAGE_KEY = "scheme_navigator_lang";

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "hi" || saved === "en") return saved;
    } catch {
      // fallback if localStorage not accessible
    }
    return "en";
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
      document.documentElement.lang = language;
    } catch {
      // ignore
    }
  }, [language]);

  const setLanguage = useCallback((lang) => {
    if (lang === "en" || lang === "hi") {
      setLanguageState(lang);
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => (prev === "en" ? "hi" : "en"));
  }, []);

  const t = useCallback(
    (key, params = {}) => {
      const dict = translations[language] || translations.en;
      let text = dict[key] || translations.en[key] || key;

      if (params && typeof params === "object") {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          text = text.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue));
        });
      }
      return text;
    },
    [language]
  );

  const translateCriteria = useCallback(
    (text) => translateCriteriaHelper(text, language),
    [language]
  );

  const value = {
    language,
    isHindi: language === "hi",
    setLanguage,
    toggleLanguage,
    t,
    translateCriteria,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
