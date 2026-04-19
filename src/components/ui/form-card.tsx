"use client";

import type { ReactNode } from "react";

type FormCardProps = {
  title: string;
  subtitle?: string;
  /** Material Symbols Rounded icon name, e.g. "calendar_month" */
  icon?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function FormCard({ title, subtitle, icon, action, children }: FormCardProps) {
  return (
    <section className="rounded-card bg-card">
      <div className="px-5 py-4 sm:px-8 sm:pt-8 sm:pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {icon && (
              <span
                className="material-symbols-rounded select-none text-muted-foreground"
                style={{ fontSize: 20 }}
              >
                {icon}
              </span>
            )}
            <div className="text-[18px] font-semibold text-foreground">{title}</div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
        {subtitle && (
          <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
        )}
      </div>
      <div className="px-5 pb-5 sm:px-8 sm:pb-8">{children}</div>
    </section>
  );
}
