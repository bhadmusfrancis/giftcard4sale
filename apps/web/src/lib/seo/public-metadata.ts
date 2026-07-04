import type { Metadata } from "next";

/** Shared robots + canonical for indexable marketing pages. */
export function publicPageMetadata(opts: {
  title: string;
  description: string;
  canonical: string;
  openGraphTitle?: string;
}): Metadata {
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: opts.canonical },
    openGraph: {
      title: opts.openGraphTitle ?? opts.title,
      description: opts.description,
      url: opts.canonical,
    },
  };
}
