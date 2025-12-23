import React, { useEffect } from "react";
import clsx from "clsx";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = "sm",
  children,
}) => {
  if (!isOpen) return null;

  // Close on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const sizeClasses: Record<NonNullable<ModalProps["size"]>, string> = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title || "Dialog"}
    >
      {/* Clickable backdrop */}
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
        aria-label="Close dialog"
      />

      {/* Dialog card */}
      <div
        className={clsx(
          "relative z-10 w-full rounded-2xl bg-white p-6 shadow-overlay ring-1 ring-black/10 sm:p-8",
          sizeClasses[size]
        )}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
          aria-label="Close"
        >
          ✕
        </button>

        {title && (
          <h2 className="mb-2 text-lg font-semibold text-wowzie-text-primary sm:text-xl">
            {title}
          </h2>
        )}

        {children}
      </div>
    </div>
  );
};

export default Modal;
