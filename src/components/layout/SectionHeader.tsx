// src/components/layout/SectionHeader.tsx
import React from "react";
import clsx from "clsx";
import { NavLink } from "react-router-dom";

type BackLink = {
  to: string;
  label?: string;
};

type Props = {
  title: string;
  subtitle?: string;
  className?: string;

  // NEW
  backLink?: BackLink;
  actions?: React.ReactNode;
};

export const SectionHeader: React.FC<Props> = ({
  title,
  subtitle,
  className,
  backLink,
  actions,
}) => {
  return (
    <header className={clsx("space-y-4", className)}>
      {/* Back link row (optional) */}
      {backLink && (
        <NavLink
          to={backLink.to}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <span aria-hidden>←</span>
          <span>{backLink.label ?? "Back"}</span>
        </NavLink>
      )}

      {/* Title + actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2 min-w-0">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold">
            {title}
          </h2>

          {subtitle && (
            <p className="text-gray-600 max-w-2xl">{subtitle}</p>
          )}
        </div>

        {/* Actions (optional, supports multiple buttons) */}
        {actions && (
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
};
