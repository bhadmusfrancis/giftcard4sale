"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { FormFeedback } from "@/components/FormFeedback";
import { useAsyncAction } from "@/lib/useAsyncAction";

const EMPTY = {
  slug: "",
  title: "",
  metaTitle: "",
  metaDesc: "",
  bodyHtml: "",
  sourceUrl: "",
  cardTypeId: "",
  published: true,
};

export default function AdminLandingPage() {
  const [pages, setPages] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<any>(EMPTY);
  const saveAction = useAsyncAction();

  async function loadPages() {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    const p = await api(`/admin/landing${params.toString() ? `?${params}` : ""}`);
    setPages(p.pages);
  }

  useEffect(() => {
    void api("/admin/cards").then((c) => setCards(c.cards));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void loadPages();
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await saveAction.run(async () => {
      const body = { ...form, cardTypeId: form.cardTypeId || undefined };
      await api("/admin/landing", { body });
      setForm(EMPTY);
      await loadPages();
    }, "Landing page saved.");
  }

  async function edit(slug: string) {
    const p = pages.find((x) => x.slug === slug);
    setForm({ ...EMPTY, ...p, cardTypeId: p.cardTypeId || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function del(slug: string) {
    if (!confirm("Delete this landing page?")) return;
    await api(`/admin/landing/${slug}`, { method: "DELETE" });
    loadPages();
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <h2 className="page-title">Landing pages</h2>
      <p className="-mt-2 text-sm text-slate-500 sm:-mt-3">
        Create SEO pages like <code>sell-lowes-gift-card</code>. Each maps to a public URL{" "}
        <code>/sell-&lt;card&gt;-gift-card</code> and can embed the rate calculator when linked to a card type.
      </p>

      <form onSubmit={save} className="card grid min-w-0 gap-3 p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Slug (URL)</label>
            <input className="input" placeholder="sell-lowes-gift-card" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
          </div>
          <div>
            <label className="label">Linked card type (optional)</label>
            <select className="input" value={form.cardTypeId} onChange={(e) => setForm({ ...form, cardTypeId: e.target.value })}>
              <option value="">— none —</option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Title</label>
          <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Meta title</label>
            <input className="input" value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} />
          </div>
          <div>
            <label className="label">Source FB URL</label>
            <input className="input" value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Meta description</label>
          <input className="input" value={form.metaDesc} onChange={(e) => setForm({ ...form, metaDesc: e.target.value })} />
        </div>
        <div>
          <label className="label">Body (HTML — uniquely rewritten post)</label>
          <textarea className="input min-h-[160px] font-mono text-sm" value={form.bodyHtml} onChange={(e) => setForm({ ...form, bodyHtml: e.target.value })} required />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
          Published
        </label>
        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary flex-1 sm:flex-none" disabled={saveAction.busy}>
            {saveAction.busy ? "Saving…" : "Save page"}
          </button>
          {form.slug && <button type="button" onClick={() => setForm(EMPTY)} className="btn-ghost">Clear</button>}
        </div>
        <FormFeedback status={saveAction.status} anchorRef={saveAction.statusRef} className="mt-2" />
      </form>

      <div className="flex gap-2">
        <input
          type="search"
          className="input sm:max-w-md"
          placeholder="Search by slug, title, meta, or linked card"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="card divide-y divide-slate-100 overflow-hidden">
        {pages.map((p) => (
          <div key={p.slug} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <a href={`/${p.slug}`} target="_blank" rel="noreferrer" className="break-all font-medium text-brand-700 hover:underline">/{p.slug}</a>
              <div className="break-words text-sm text-slate-500">{p.title}</div>
              {p.cardType?.name && (
                <div className="mt-1 text-xs text-slate-400">Card: {p.cardType.name}</div>
              )}
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
              <button type="button" onClick={() => edit(p.slug)} className="btn-sm bg-white py-2 text-slate-700 ring-1 ring-slate-200">Edit</button>
              <button type="button" onClick={() => del(p.slug)} className="btn-sm bg-red-600 py-2 text-white hover:bg-red-700">Delete</button>
            </div>
          </div>
        ))}
        {pages.length === 0 && (
          <p className="p-6 text-sm text-slate-400">
            {q.trim() ? "No landing pages match your search." : "No landing pages yet."}
          </p>
        )}
      </div>
    </div>
  );
}
