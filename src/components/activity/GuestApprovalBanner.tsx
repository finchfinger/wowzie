// src/components/host/GuestApprovalBanner.tsx
import React from "react";
import clsx from "clsx";
import { Button } from "../ui/Button";

type GuestApprovalBannerProps = {
  status: "pending" | "approved" | "declined";
  onApprove?: () => void;
  onDecline?: () => void;
  onDismiss?: () => void;
};

export const GuestApprovalBanner: React.FC<GuestApprovalBannerProps> = ({
  status,
  onApprove,
  onDecline,
  onDismiss,
}) => {
  if (status !== "pending") {
    // You can also choose to show a green “Approved” pill here instead.
    return null;
  }

  return (
    <div
      className={clsx(
        "mb-4 flex items-center justify-between rounded-lg border px-3 py-2 text-xs",
        "bg-amber-50 border-amber-200 text-amber-900"
      )}
    >
      {/* Left: icon + message */}
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="text-sm">
          ⚠️
        </span>
        <p>
          This guest is currently <span className="font-medium">pending approval</span>.
        </p>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="px-2 py-1 text-xs"
          onClick={onDecline}
        >
          Decline ✕
        </Button>
        <Button
          variant="primary"
          className="px-2 py-1 text-xs"
          onClick={onApprove}
        >
          Approve ✓
        </Button>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss approval banner"
          className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-amber-100"
        >
          ×
        </button>
      </div>
    </div>
  );
};
