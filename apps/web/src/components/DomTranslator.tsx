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
    let rerun = false;
    const skip = "script,style,noscript,[data-i18n-skip],[translate='no']";

    const collect = () => {
      const nodes: Text[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const tn = walker.currentNode as Text;
        const parent = tn.parentElement;
        if (!parent || parent.closest(skip)) continue;
        if (!tn.data.trim()) continue;
        nodes.push(tn);
      }
      const phs = Array.from(
        root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
          "input[placeholder],textarea[placeholder]"
        )
      ).filter((el) => !el.closest(skip));
      return { nodes, phs };
    };

    // Every language change starts from the English source, never from the
    // previous translation. Otherwise fr -> es keeps the French text forever.
    const initial = collect();
    initial.nodes.forEach((tn) => {
      const st = states.current.get(tn);
      if (st && tn.data === st.translated) tn.data = st.original;
      states.current.delete(tn);
    });
    initial.phs.forEach((el) => {
      const original = phOriginals.current.get(el);
      if (original != null) el.placeholder = original;
      phOriginals.current.delete(el);
    });
    if (lang === "en") return;

    const apply = async () => {
      if (applying) {
        rerun = true;
        return;
      }
      const { nodes, phs } = collect();

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

      applying = true;
      try {
        const map = await translateAll(Array.from(wanted));
        if (cancelled) return;
        // Do not observe our own writes; failures must not cause retry loops.
        mo.disconnect();
        nodes.forEach((tn) => {
          const st = states.current.get(tn);
          if (!st || !root.contains(tn) || tn.data !== st.original) return;
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
        if (!cancelled) {
          mo.observe(root, { childList: true, subtree: true, characterData: true });
          if (rerun) {
            rerun = false;
            timer = setTimeout(() => void apply(), 250);
          }
        }
      }
    };

    const mo = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => void apply(), 250);
    });
    mo.observe(root, { childList: true, subtree: true, characterData: true });
    void apply();
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
