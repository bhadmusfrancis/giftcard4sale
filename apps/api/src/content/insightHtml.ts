function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function p(text: string): string {
  return `<p>${text}</p>`;
}

export function h2(text: string): string {
  return `<h2>${esc(text)}</h2>`;
}

export function h3(text: string): string {
  return `<h3>${esc(text)}</h3>`;
}

export function ul(items: string[]): string {
  return `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
}

export function extLink(url: string, label: string): string {
  return `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
}

export function countWords(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text ? text.split(" ").length : 0;
}

/** Strip markdown code fences if an LLM wrapped HTML. */
export function normalizeBodyHtml(raw: string): string {
  let html = raw.trim();
  if (html.startsWith("```")) {
    html = html.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/, "");
  }
  return html.trim();
}
