"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { api, getToken } from "./api";
import { useAuth } from "./auth";
import {
  LANG_COOKIE,
  COUNTRY_COOKIE,
  getCookie,
  setCookie,
  normalizeLang,
  isRtl,
} from "./locale";

type Dict = Record<string, string>;

interface I18nCtx {
  /** Active display language (BCP-47 tag). */
  lang: string;
  /** Detected visitor country (ISO alpha-2) or null. */
  country: string | null;
  /** True after hydration — t() returns English before this to match SSR. */
  ready: boolean;
  /** Translate an English source string; returns the source until translated. */
  t: (text: string, vars?: Record<string, string | number>) => string;
  /** Persist a language choice (cookie + profile when logged in). */
  setLang: (lang: string) => void;
  /** Batch-translate English strings to the active language. For DOM-level
   *  translation of long prose pages; shares the t() dictionary + cache. */
  translateAll: (texts: string[]) => Promise<Dict>;
}

const Ctx = createContext<I18nCtx>(null as any);

const dictKey = (lang: string) => `gc4s_dict_${lang}`;

function loadDict(lang: string): Dict {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(dictKey(lang));
    return raw ? (JSON.parse(raw) as Dict) : {};
  } catch {
    return {};
  }
}

function saveDict(lang: string, dict: Dict) {
  try {
    // Bound cache size so long-lived browsers don't grow it forever.
    const entries = Object.entries(dict).slice(-3000);
    localStorage.setItem(dictKey(lang), JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // storage full / private mode — translations still work in-memory
  }
}

function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [lang, setLangState] = useState("en");
  const [country, setCountry] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [dict, setDict] = useState<Dict>({});
  const dictRef = useRef<Dict>({});
  const pendingRef = useRef<Set<string>>(new Set());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const langRef = useRef("en");

  // Batch-fetch translations for strings seen on screen but not yet known.
  const flush = useCallback(async () => {
    flushTimerRef.current = null;
    const texts = Array.from(pendingRef.current).filter((s) => dictRef.current[s] == null);
    pendingRef.current.clear();
    const target = langRef.current;
    if (!texts.length || target === "en") return;
    try {
      const { translations } = await api<{ translations: Dict }>("/i18n/translate", {
        body: { lang: target, texts: texts.slice(0, 100) },
      });
      if (langRef.current !== target) return; // user switched mid-flight
      const merged = { ...dictRef.current, ...translations };
      dictRef.current = merged;
      saveDict(target, merged);
      setDict(merged);
    } catch {
      // keep English; next render re-queues the misses
    }
  }, []);

  const requestString = useCallback(
    (source: string) => {
      if (langRef.current === "en") return;
      if (dictRef.current[source] != null || pendingRef.current.has(source)) return;
      pendingRef.current.add(source);
      if (!flushTimerRef.current) flushTimerRef.current = setTimeout(flush, 80);
    },
    [flush]
  );

  const t = useCallback(
    (text: string, vars?: Record<string, string | number>): string => {
      if (typeof text !== "string" || !text) return text;
      if (!ready || langRef.current === "en") return interpolate(text, vars);
      const hit = dictRef.current[text];
      if (hit != null) return interpolate(hit, vars);
      requestString(text);
      return interpolate(text, vars);
    },
    [ready, requestString]
  );

  const setLang = useCallback((next: string) => {
    const normalized = normalizeLang(next);
    setCookie(LANG_COOKIE, normalized);
    langRef.current = normalized;
    dictRef.current = loadDict(normalized);
    setDict(dictRef.current);
    setLangState(normalized);
    if (getToken()) {
      api("/me/profile", { method: "PATCH", body: { locale: normalized } }).catch(() => {});
    }
  }, []);

  // Initial locale: cookie (set by middleware from geo/browser data), else the
  // browser language, else English.
  useEffect(() => {
    const cookieLang = getCookie(LANG_COOKIE);
    const detected = normalizeLang(cookieLang || navigator.language || "en");
    langRef.current = detected;
    dictRef.current = loadDict(detected);
    setDict(dictRef.current);
    setLangState(detected);
    setCountry(getCookie(COUNTRY_COOKIE));
    setReady(true);
  }, []);

  // Synchronous batch translate: returns known translations immediately and
  // fetches the rest (chunked at the API's 100-string limit).
  const translateAll = useCallback(async (texts: string[]): Promise<Dict> => {
    const target = langRef.current;
    const out: Dict = {};
    if (target === "en") return out;
    const missing: string[] = [];
    for (const s of texts) {
      const hit = dictRef.current[s];
      if (hit != null) out[s] = hit;
      else missing.push(s);
    }
    for (let i = 0; i < missing.length; i += 100) {
      try {
        const { translations } = await api<{ translations: Dict }>("/i18n/translate", {
          body: { lang: target, texts: missing.slice(i, i + 100) },
        });
        Object.assign(out, translations);
        dictRef.current = { ...dictRef.current, ...translations };
      } catch {
        // keep English for the failed chunk
      }
    }
    saveDict(target, dictRef.current);
    setDict(dictRef.current);
    return out;
  }, []);

  // A saved non-English profile language wins over geo/browser detection so
  // the site follows the user across devices. (Legacy profiles are all "en",
  // so "en" never overrides a detected cookie language.)
  useEffect(() => {
    if (!ready || !user?.locale) return;
    if (user.locale !== "en" && user.locale !== langRef.current) setLang(user.locale);
  }, [user?.locale, ready, setLang]);

  // Keep <html lang> and text direction in sync.
  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = lang || "en";
    document.documentElement.dir = isRtl(lang) ? "rtl" : "ltr";
  }, [lang, ready]);

  return <Ctx.Provider value={{ lang, country, ready, t, setLang, translateAll }}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  return useContext(Ctx);
}

/** Translator for client components: `const t = useT();` then `t("Text")`. */
export function useT() {
  return useContext(Ctx).t;
}

/**
 * Translated text for any component (safe inside server components — renders
 * the English source on the server and swaps to the visitor's language after
 * hydration). Strings must be string literals so translators see real English.
 */
export function T({
  children,
  vars,
}: {
  children: string;
  vars?: Record<string, string | number>;
}) {
  const t = useT();
  return <>{t(children, vars)}</>;
}
