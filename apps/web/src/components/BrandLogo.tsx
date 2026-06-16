"use client";

import { useState } from "react";
import { brandLogoSources } from "@/lib/brandLogo";

interface BrandLogoProps {
  name: string;
  slug: string;
  /** Explicit image URL (e.g. CardType.imageUrl) takes priority when present. */
  imageUrl?: string | null;
  /** Tailwind size classes for the box, e.g. "h-12 w-12". */
  className?: string;
}

/**
 * Renders a real brand logo for a gift card. Tries the provided imageUrl first,
 * then live logo sources, and finally falls back to a colored initials badge.
 */
export function BrandLogo({ name, slug, imageUrl, className = "h-12 w-12" }: BrandLogoProps) {
  const sources = [imageUrl, ...brandLogoSources(slug)].filter(Boolean) as string[];
  const [index, setIndex] = useState(0);

  if (index >= sources.length) {
    return (
      <div
        className={`grid place-items-center rounded-xl bg-brand-100 text-brand-800 font-bold ${className}`}
      >
        {name.slice(0, 2)}
      </div>
    );
  }

  return (
    <div
      className={`grid place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={sources[index]}
        alt={`${name} logo`}
        loading="lazy"
        className="h-full w-full object-contain"
        onError={() => setIndex((i) => i + 1)}
      />
    </div>
  );
}
