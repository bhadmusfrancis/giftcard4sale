"use client";

import { useEffect, useRef, useState } from "react";
import type { CountryOption } from "@gc4s/shared";
import { CountryIcon } from "@/components/CountryIcon";

interface CountryPickerProps {
  options: CountryOption[];
  value: string;
  onChange: (country: string) => void;
}

export function CountryPicker({ options, value, onChange }: CountryPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.country === value);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  if (options.length === 0) {
    return <p className="text-sm text-slate-500">No countries available.</p>;
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="input flex w-full items-center gap-2.5 text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        {selected ? (
          <CountryIcon country={selected.country} currency={selected.currency} />
        ) : null}
        <span className="min-w-0 flex-1 truncate">{selected?.label ?? "Select country"}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open ? (
        <ul
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          role="listbox"
          aria-label="Card country"
        >
          {options.map((option) => {
            const isSelected = option.country === value;
            return (
              <li key={option.country} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition ${
                    isSelected ? "bg-brand-50 text-brand-900" : "text-slate-700 hover:bg-slate-50"
                  }`}
                  onClick={() => {
                    onChange(option.country);
                    setOpen(false);
                  }}
                >
                  <CountryIcon country={option.country} currency={option.currency} />
                  <span className="truncate">{option.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
