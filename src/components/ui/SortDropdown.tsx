"use client";

import { useState } from "react";

export type SortOption<T extends string = string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  options: SortOption<T>[];
  value: T;
  onChange: (v: T) => void;
};

export function SortDropdown<T extends string>({ options, value, onChange }: Props<T>) {
  const [open, setOpen] = useState(false);
  const label = options.find((o) => o.value === value)?.label ?? "Sort";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M6 12h12M10 17h4" />
        </svg>
        {label}
        <span className="material-symbols-rounded select-none opacity-60" style={{ fontSize: 12 }} aria-hidden>expand_more</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-popover shadow-lg z-30 overflow-hidden py-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`flex w-full items-center px-3 py-2 text-xs transition-colors text-left ${
                  value === opt.value
                    ? "font-medium text-foreground bg-accent"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
