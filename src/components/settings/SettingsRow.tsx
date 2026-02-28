// src/components/settings/SettingsRow.tsx
//
// A reusable row for settings pages: icon on the left, label + description
// in the middle, and an optional action (button, toggle, etc.) on the right.
//
// Usage:
//   <SettingsRow
//     icon="lock"
//     label="Account password"
//     description="Update the password you use to sign in."
//     action={<button …>Change</button>}
//   />
//
// The icon name comes from Material Symbols Rounded (same as <Icon />).

import React from "react";
import { Icon } from "../ui/Icon";
import clsx from "clsx";

type SettingsRowProps = {
  icon: string;
  label: string;
  description?: string;
  action?: React.ReactNode;
  /** Extra content rendered below the label/description row (e.g. an expanded form). */
  children?: React.ReactNode;
  className?: string;
};

export const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  label,
  description,
  action,
  children,
  className,
}) => {
  return (
    <div className={clsx("px-4 sm:px-5 py-4 border-t border-black/5 first:border-t-0", className)}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
          <Icon name={icon} size={18} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 leading-snug">{label}</p>
          {description && (
            <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{description}</p>
          )}
          {children && <div className="mt-3">{children}</div>}
        </div>

        {/* Action (right side) */}
        {action && (
          <div className="shrink-0 self-center">{action}</div>
        )}
      </div>
    </div>
  );
};
