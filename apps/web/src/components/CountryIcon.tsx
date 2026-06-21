"use client";

import { useState } from "react";
import { flagSvgPath, resolveFlagIso } from "@/lib/countryIcons";

interface CountryIconProps {
  country: string;
  currency?: string;
  size?: "sm" | "md";
}

const SIZES = {
  sm: { w: 20, h: 15 },
  md: { w: 24, h: 18 },
};

function OtherCountryIcon({ size }: { size: "sm" | "md" }) {
  const { w, h } = SIZES[size];

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[3px] border border-slate-200 bg-slate-100 shadow-sm"
      style={{ width: w, height: h }}
      aria-hidden
    >
      <svg viewBox="0 0 24 16" className="h-[70%] w-[70%] text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="8" r="5.5" />
        <path d="M2 8h20M12 2.5c2 2 2 9 0 11M12 2.5c-2 2-2 9 0 11" />
      </svg>
    </span>
  );
}

export function CountryIcon({ country, currency, size = "md" }: CountryIconProps) {
  const iso = resolveFlagIso(country, currency);
  const [broken, setBroken] = useState(false);
  const { w, h } = SIZES[size];

  if (!iso || broken) return <OtherCountryIcon size={size} />;

  return (
    <img
      src={flagSvgPath(iso)}
      alt=""
      width={w}
      height={h}
      className="inline-block shrink-0 rounded-[3px] border border-black/10 bg-slate-100 object-cover shadow-sm"
      aria-hidden
      onError={() => setBroken(true)}
    />
  );
}
