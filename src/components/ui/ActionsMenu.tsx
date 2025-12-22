// src/components/ui/ActionsMenu.tsx
import React, { useState, useRef } from "react";
import clsx from "clsx";

type ActionsMenuItem = {
  label: string;
  onSelect: () => void;
};

type ActionsMenuProps = {
  items: ActionsMenuItem[];
};

export const ActionsMenu: React.FC<ActionsMenuProps> = ({ items }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const handleToggle = () => setOpen((prev) => !prev);

  const handleBlur: React.FocusEventHandler<HTMLDivElement> = (e) => {
    if (!wrapperRef.current) return;
    if (!wrapperRef.current.contains(e.relatedTarget as Node | null)) {
      setOpen(false);
    }
  };

  return (
    <div
      ref={wrapperRef}
      className="relative inline-block text-left"
      tabIndex={-1}
      onBlur={handleBlur}
    >
      <button
        type="button"
        onClick={handleToggle}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        ⋯
      </button>

      {open && (
        <div
          className={clsx(
            "absolute right-0 mt-1 w-40 rounded-lg border border-gray-200 bg-white shadow-lg z-20"
          )}
          role="menu"
        >
          {items.map((item, idx) => (
            <button
              key={idx}
              type="button"
              className="block w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
              onClick={() => {
                item.onSelect();
                setOpen(false);
              }}
              role="menuitem"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
