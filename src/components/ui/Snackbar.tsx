import React, { useEffect } from "react";

type SnackbarProps = {
  message: string;
  open: boolean;
  duration?: number;
  onClose: () => void;
};

export const Snackbar: React.FC<SnackbarProps> = ({
  message,
  open,
  duration = 3000,
  onClose,
}) => {
  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(timer);
  }, [open, duration, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-6 z-[100] flex justify-center pointer-events-none">
      <div
        className="
          pointer-events-auto
          rounded-full
          bg-gray-900
          px-4 py-2
          text-xs font-medium text-white
          shadow-lg
          animate-snackbar-in
        "
      >
        {message}
      </div>
    </div>
  );
};
