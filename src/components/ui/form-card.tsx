"use client";

import type { ReactNode } from "react";

type FormCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function FormCard({ title, subtitle, children }: FormCardProps) {
  return (
    <section className="rounded-card bg-card">
      <div className="px-5 py-4 sm:px-8 sm:pt-8 sm:pb-4">
        <div className="text-[20px] font-semibold text-foreground">{title}</div>
        {subtitle && (
          <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
        )}
      </div>
      <div className="px-5 pb-5 sm:px-8 sm:pb-8">{children}</div>
    </section>
  );
}
