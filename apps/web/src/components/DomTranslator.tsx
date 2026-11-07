"use client";

import { ReactNode, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";

type NodeState = { original: string; translated?: string };

/**
 * Translates every visible text node (and input placeholder) inside its
 * subtree through the shared i18n dictionary. Intended for long, static
 * prose pages (legal, about, card detail, insights) where wrapping every
 * string in t() would be impractical. A MutationObserver re-applies
 * translations when content mounts late (e.g. after a fetch). Layout is
 * unaffected — the wrapper renders display:contents. Subtrees already
 * instrumented with t() must opt out via a `data-i18n-skip` attribute on a
 * wrapping element so strings are not translated twice.
 */
export function DomTranslator({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { lang, ready, translateAll } = useI18n();
  const states = useRef(new WeakMap<Text, NodeState>());
  const phOriginals = useRef(new WeakMap<HTMLInputElement | HTMLTextAreaElement, string>());

  useEffect(() => {
    const root = ref.current;
    if (!root || !ready) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let applying = false;

    const collect = () => {
      const nodes: Text[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const tn = walker.currentNode as Text;
        const parent = tn.parentElement;
        if (!parent || parent.closest("script,style,noscript,[data-i18n-skip]")) continue;
        if (!tn.data.trim()) continue;
        nodes.push(tn);
      }
      const phs = Array.from(
        root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
          "input[placeholder],textarea[placeholder]"
        )
      );
      return { nodes, phs };
    };

    const apply = async () => {
      if (applying) return;
      const { nodes, phs } = collect();

      if (lang === "en") {
        nodes.forEach((tn) => {
          const st = states.current.get(tn);
          if (st) {
            tn.data = st.original;
            states.current.delete(tn);
          }
        });
        phs.forEach((el) => {
          const orig = phOriginals.current.get(el);
          if (orig != null) {
            el.placeholder = orig;
            phOriginals.current.delete(el);
          }
        });
        return;
      }

      const wanted = new Set<string>();
      for (const tn of nodes) {
        const st = states.current.get(tn);
        if (st && tn.data === st.translated) continue; // already translated
        if (st) st.original = tn.data; // React re-rendered new English text
        else states.current.set(tn, { original: tn.data });
        const orig = states.current.get(tn)!.original.trim();
        if (orig) wanted.add(orig);
      }
      phs.forEach((el) => {
        if (!phOriginals.current.has(el)) phOriginals.current.set(el, el.placeholder);
        const orig = phOriginals.current.get(el)!.trim();
        if (orig) wanted.add(orig);
      });
      if (!wanted.size) return;

      const map = await translateAll(Array.from(wanted));
      if (cancelled) return;

      applying = true;
      try {
        nodes.forEach((tn) => {
          const st = states.current.get(tn);
          if (!st) return;
          const tr = map[st.original.trim()];
          if (!tr) return;
          const leading = st.original.match(/^\s*/)?.[0] ?? "";
          const trailing = st.original.match(/\s*$/)?.[0] ?? "";
          st.translated = leading + tr + trailing;
          tn.data = st.translated;
        });
        phs.forEach((el) => {
          const orig = phOriginals.current.get(el);
          if (!orig) return;
          const tr = map[orig.trim()];
          if (tr) el.placeholder = tr;
        });
      } finally {
        applying = false;
      }
    };

    void apply();
    const mo = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => void apply(), 250);
    });
    mo.observe(root, { childList: true, subtree: true, characterData: true });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      mo.disconnect();
    };
  }, [lang, ready, translateAll]);

  return (
    <div ref={ref} style={{ display: "contents" }}>
      {children}
    </div>
  );
}
