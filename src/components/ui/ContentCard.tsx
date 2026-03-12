import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/* ─────────────────────────────────────────────────────────
   ContentCard
   A page-level content section card used in many places.
   • Visual: rounded-2xl border bg-card shadow-sm
   • Optional header row: title (left) + actions (right)
   • Optional description below the title
   • Body: no inner padding by default so children control it;
     pass bodyClassName="p-5" if you want the default spacing.

   Grid placement is controlled by the parent via className:
     <ContentCard className="col-span-12 lg:col-span-8" ...>
───────────────────────────────────────────────────────── */

type ContentCardProps = {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** Extra classes for the outer wrapper (e.g. col-span-8) */
  className?: string;
  /** Extra classes for the body container */
  bodyClassName?: string;
};

export function ContentCard({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: ContentCardProps) {
  const hasHeader = title || actions;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card shadow-sm overflow-hidden",
        className,
      )}
    >
      {/* Header */}
      {hasHeader && (
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border">
          <div className="min-w-0">
            {title && (
              <h2 className="text-base font-semibold text-foreground leading-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          )}
        </div>
      )}

      {/* Body */}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
