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
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const openMenu = (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
    });
    setOpen((p) => !p);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        !btnRef.current?.contains(e.target as Node) &&
        !menuRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={openMenu}
        aria-label="More actions"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 transition-colors"
      >
        <span className="material-symbols-rounded select-none" style={{ fontSize: 16 }} aria-hidden>more_vert</span>
      </button>

      {open && pos && (
        <div
          ref={menuRef}
          style={{ position: "fixed", top: pos.top, right: pos.right, zIndex: 9999 }}
          className="w-52 rounded-xl bg-popover shadow-lg overflow-hidden py-1"
        >
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
