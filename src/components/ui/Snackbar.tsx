import React, { useEffect } from "react";
import clsx from "clsx";

export type Tone = "success" | "error" | "info";

type SnackbarProps = {
  open: boolean;
  message: string;
  onClose: () => void;
  tone?: Tone;
  duration?: number;
};

export const Snackbar: React.FC<SnackbarProps> = ({
  message,
  open,
  duration = 3000,
  onClose,
  tone = "info",
}) => {
  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(timer);
  }, [open, duration, onClose]);

  if (!open) return null;

  const toneClasses: Record<Tone, string> = {
    success: "bg-emerald-700",
    error: "bg-red-700",
    info: "bg-gray-900",
  };

  return (
    <div className="fixed inset-x-0 bottom-6 z-[100] flex justify-center pointer-events-none">
      <div
        className={clsx(
          "pointer-events-auto rounded-full px-4 py-2 text-xs font-medium text-white shadow-lg animate-snackbar-in",
          toneClasses[tone]
        )}
      >
        {message}
      </div>
    </div>
  );
};
