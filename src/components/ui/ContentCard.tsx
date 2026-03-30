import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/* ─────────────────────────────────────────────────────────
   ContentCard
   A page-level content section card used in many places.

   Variants:
   • bordered (default) — rounded-2xl border bg-card shadow-sm,
     header separated by a bottom border with px-5 py-4 padding.
   • borderless (bordered={false}) — no border or shadow,
     header flush with px-8 pt-8 pb-4 padding. Use for dashboard
     sections where the card sits directly on the page background.

   • Optional header row: title (left) + actions (right)
   • Optional description below the title
   • Body: no inner padding by default so children control it;
     pass bodyClassName="p-5" (bordered) or "px-8 pb-8" (borderless).

   Grid placement is controlled by the parent via className:
     <ContentCard className="col-span-12 lg:col-span-8" ...>
───────────────────────────────────────────────────────── */

type ContentCardProps = {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** false = no border/shadow, wider header padding (dashboard style) */
  bordered?: boolean;
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
  bordered = true,
  className,
  bodyClassName,
}: ContentCardProps) {
  const hasHeader = title || actions;

  return (
    <div
      className={cn(
        "rounded-2xl bg-card overflow-hidden",
        bordered && "shadow-sm",
        className,
      )}
    >
      {/* Header */}
      {hasHeader && (
        <div
          className={cn(
            "flex items-center justify-between gap-4",
            bordered
              ? "px-5 py-4"
              : "px-8 pt-8 pb-4",
          )}
        >
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
