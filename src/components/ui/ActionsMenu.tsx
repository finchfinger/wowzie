"use client";

import { useEffect, useRef, useState } from "react";

export type ActionItem = {
  label: string;
  onSelect: () => void;
  tone?: "default" | "destructive";
  separator?: boolean;
};

type Props = {
  items: ActionItem[];
  /** Passed through to the trigger so parent click handlers don't fire */
  stopPropagation?: boolean;
};

export function ActionsMenu({ items, stopPropagation = true }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => {
          if (stopPropagation) e.stopPropagation();
          setOpen((p) => !p);
        }}
        aria-label="More actions"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 transition-colors"
      >
        <span className="material-symbols-rounded select-none" style={{ fontSize: 16 }} aria-hidden>more_vert</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl bg-popover shadow-lg z-30 overflow-hidden py-1">
          {items.map((item, idx) => (
            <div key={idx}>
              {item.separator && <div className="my-1 h-px bg-border" />}
              <button
                type="button"
                onClick={(e) => {
                  if (stopPropagation) e.stopPropagation();
                  item.onSelect();
                  setOpen(false);
                }}
                className={`flex w-full items-center px-3 py-2 text-xs transition-colors text-left ${
                  item.tone === "destructive"
                    ? "text-destructive hover:bg-destructive/8"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
