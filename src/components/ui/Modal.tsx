import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "../../lib/utils";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
};

const sizeClasses: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "sm:max-w-lg",
  md: "sm:max-w-2xl",
  lg: "sm:max-w-3xl",
};

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  size = "md",
  children,
}) => {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => (!open ? onClose() : null)}>
      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />

        {/* Dialog */}
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)]",
            "-translate-x-1/2 -translate-y-1/2",
            "rounded-2xl bg-white p-6 sm:p-8",
            "shadow-2xl",
            "text-sm leading-relaxed",
            "focus:outline-none",
            sizeClasses[size]
          )}
        >
          {/* Close button */}
          <Dialog.Close asChild>
            <button
              type="button"
              aria-label="Close"
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
            >
              ✕
            </button>
          </Dialog.Close>

          {/* Header */}
          {(title || description) && (
            <div className="mb-4 pr-10">
              {title && (
                <Dialog.Title className="text-base font-semibold text-wowzie-text-primary sm:text-lg">
                  {title}
                </Dialog.Title>
              )}

              {description && (
                <Dialog.Description className="mt-1 text-xs text-gray-500">
                  {description}
                </Dialog.Description>
              )}
            </div>
          )}

          {/* Body */}
          <div className="relative">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

// Export BOTH styles so existing imports won't break:
// - import Modal from ".../Modal"
// - import { Modal } from ".../Modal"
export { Modal };
export default Modal;
