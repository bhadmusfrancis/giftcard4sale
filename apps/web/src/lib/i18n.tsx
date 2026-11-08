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
  translationError: boolean;
  retryTranslations: () => void;
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
  const { user, setUser } = useAuth();
  const [lang, setLangState] = useState("en");
  const [country, setCountry] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [dict, setDict] = useState<Dict>({});
  const dictRef = useRef<Dict>({});
  const pendingRef = useRef<Set<string>>(new Set());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const langRef = useRef("en");
  const generationRef = useRef(0);
  const failedRef = useRef(new Set<string>());
  const inFlightRef = useRef(new Map<string, Promise<Dict>>());
  const [translationError, setTranslationError] = useState(false);
  const [revision, setRevision] = useState(0);
  const userRef = useRef(user);
  userRef.current = user;
  const savePreferenceRef = useRef(Promise.resolve());

  // Share requests between React strings and prose. An empty/partial provider
  // response is a failure, not a new dictionary that should trigger retries on
  // every render. Retry explicitly, or when the language changes.
  const translateAll = useCallback(async (texts: string[]): Promise<Dict> => {
    const target = langRef.current;
    const generation = generationRef.current;
    const out: Dict = {};
    if (target === "en") return out;
    const sources = Array.from(new Set(texts.filter(Boolean)));
    const missing = sources.filter(
      (s) => dictRef.current[s] == null && !failedRef.current.has(s) && !inFlightRef.current.has(s)
    );
    for (let i = 0; i < missing.length; i += 50) {
      const batch = missing.slice(i, i + 50);
      const request = (async (): Promise<Dict> => {
        try {
          const { translations } = await api<{ translations: Dict }>("/i18n/translate", {
            body: { lang: target, texts: batch },
          });
          if (generation !== generationRef.current) return {};
          const accepted: Dict = {};
          for (const source of batch) {
            const value = translations?.[source];
            if (typeof value === "string" && value.trim()) accepted[source] = value;
            else failedRef.current.add(source);
          }
          if (Object.keys(accepted).length) {
            dictRef.current = { ...dictRef.current, ...accepted };
            saveDict(target, dictRef.current);
            setDict(dictRef.current);
          }
          setTranslationError(failedRef.current.size > 0);
          return accepted;
        } catch {
          if (generation === generationRef.current) {
            batch.forEach((s) => failedRef.current.add(s));
            setTranslationError(true);
          }
          return {};
        } finally {
          if (generation === generationRef.current) batch.forEach((s) => inFlightRef.current.delete(s));
        }
      })();
      batch.forEach((s) => inFlightRef.current.set(s, request));
    }
    await Promise.all(sources.map((s) => inFlightRef.current.get(s)));
    if (generation !== generationRef.current) return {};
    for (const source of sources) {
      if (dictRef.current[source] != null) out[source] = dictRef.current[source];
    }
    return out;
  }, [revision]);

  // Batch-fetch translations for strings seen on screen but not yet known.
  const flush = useCallback(async () => {
    flushTimerRef.current = null;
    const texts = Array.from(pendingRef.current).filter((s) => dictRef.current[s] == null);
    pendingRef.current.clear();
    await translateAll(texts);
  }, [translateAll]);

  const requestString = useCallback(
    (source: string) => {
      if (langRef.current === "en") return;
      if (dictRef.current[source] != null || pendingRef.current.has(source) ||
          failedRef.current.has(source) || inFlightRef.current.has(source)) return;
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
    [ready, requestString, lang, dict]
  );

  const applyLang = useCallback((next: string) => {
    const normalized = normalizeLang(next);
    generationRef.current++;
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = null;
    pendingRef.current.clear();
    failedRef.current.clear();
    inFlightRef.current.clear();
    setTranslationError(false);
    setCookie(LANG_COOKIE, normalized);
    langRef.current = normalized;
    dictRef.current = loadDict(normalized);
    setDict(dictRef.current);
    setLangState(normalized);
    setRevision((v) => v + 1);
  }, []);

  const setLang = useCallback((next: string) => {
    const normalized = normalizeLang(next);
    applyLang(normalized);
    const currentUser = userRef.current;
    if (currentUser && getToken()) {
      // Keep auth state in sync, including an explicit choice of English.
      setUser({ ...currentUser, locale: normalized });
      const token = getToken();
      // Rapid selections must reach the profile in the same order.
      savePreferenceRef.current = savePreferenceRef.current.then(async () => {
        if (getToken() === token) {
          await api("/me/profile", { method: "PATCH", body: { locale: normalized } });
        }
      }).catch(() => {});
    }
  }, [applyLang, setUser]);

  const retryTranslations = useCallback(() => applyLang(langRef.current), [applyLang]);

  // Initial locale: cookie (set by middleware from geo/browser data), else the
  // browser language, else English.
  useEffect(() => {
    const cookieLang = getCookie(LANG_COOKIE);
    const detected = normalizeLang(cookieLang || navigator.language || "en");
    applyLang(detected);
    setCountry(getCookie(COUNTRY_COOKIE));
    setReady(true);
    return () => {
      generationRef.current++;
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    };
  }, [applyLang]);

  // A saved preference (including English) wins over initial detection.
  useEffect(() => {
    if (!ready || !user?.locale) return;
    if (user.locale !== langRef.current) applyLang(user.locale);
  }, [user?.locale, ready, applyLang]);

  // Keep <html lang> and text direction in sync.
  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = lang || "en";
    document.documentElement.dir = isRtl(lang) ? "rtl" : "ltr";
  }, [lang, ready]);

  return <Ctx.Provider value={{ lang, country, ready, t, setLang, translateAll, translationError, retryTranslations }}>{children}</Ctx.Provider>;
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
