"use client";

import { useEffect, useRef, useState } from "react";

export interface SnackbarProps {
  open: boolean;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  /** How long to show before calling onClose (ms). Default 4000. */
  duration?: number;
  onClose?: () => void;
}

/**
 * Material-style snackbar — bottom-center, dark pill, optional action.
 * Stays mounted while `open` is true; calls `onClose` after `duration` ms.
 */
export function Snackbar({
  open,
  message,
  action,
  duration = 4000,
  onClose,
}: SnackbarProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setVisible(true);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, duration);
    } else {
      setVisible(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [open, duration, onClose]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 rounded-lg bg-foreground px-4 py-3 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{ minWidth: 300, maxWidth: 480 }}
    >
      <span className="flex-1 text-sm text-white leading-snug">{message}</span>
      {action && (
        <button
          type="button"
          onClick={() => {
            if (timerRef.current) clearTimeout(timerRef.current);
            setVisible(false);
            action.onClick();
          }}
          className="shrink-0 text-xs font-semibold uppercase tracking-wider text-violet-300 hover:text-violet-200 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
