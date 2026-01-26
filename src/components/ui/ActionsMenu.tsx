// src/components/ui/ActionsMenu.tsx
import React, { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Button } from "./Button";

export type ActionsMenuItem = {
  label: string;
  onSelect: () => void;
  tone?: "default" | "destructive";
  disabled?: boolean;
};

type ActionsMenuProps = {
  items: ActionsMenuItem[];

  // Trigger styling (so we can match Shadcn button + icon button)
  triggerLabel?: string; // for screen readers
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  triggerSize?: React.ComponentProps<typeof Button>["size"];
  triggerClassName?: string;
};

export const ActionsMenu: React.FC<ActionsMenuProps> = ({
  items,
  triggerLabel = "More actions",
  triggerVariant = "outline",
  triggerSize = "sm",
  triggerClassName,
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const close = () => setOpen(false);
  const toggle = () => setOpen((prev) => !prev);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      const el = wrapperRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) close();
    };

    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative inline-flex">
      {/* Trigger */}
      <Button
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        icon
        className={clsx("shrink-0", triggerClassName)}
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={triggerLabel}
      >
        ⋯
      </Button>

      {/* Menu */}
      {open && (
        <div
          className={clsx(
            "absolute right-0 top-full mt-2 w-48 rounded-xl border border-gray-200 bg-white shadow-lg z-20 overflow-hidden"
          )}
          role="menu"
        >
          {items.map((item, idx) => {
            const isDestructive = item.tone === "destructive";

            return (
              <button
                key={idx}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={clsx(
                  "block w-full px-3 py-2 text-left text-xs",
                  "transition-colors",
                  item.disabled
                    ? "text-gray-300 cursor-not-allowed"
                    : isDestructive
                    ? "text-red-600 hover:bg-red-50"
                    : "text-gray-700 hover:bg-gray-50"
                )}
                onClick={() => {
                  if (item.disabled) return;
                  item.onSelect();
                  close();
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
