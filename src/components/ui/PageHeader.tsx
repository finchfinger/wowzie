import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

type Action = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "outline" | "primary";
};

type Props = {
  title: string;
  subtitle?: ReactNode;
  /** Breadcrumb back link */
  backHref?: string;
  backLabel?: string;
  /** Badge rendered inline after the title */
  badge?: ReactNode;
  /** 40×40 hero thumbnail shown to the right of the title, before actions */
  mediaUrl?: string | null;
  /** Single action — renders as a button or link */
  action?: Action;
  /** Multiple custom actions — rendered as-is to the right */
  actions?: ReactNode;
  children?: ReactNode;
};

export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  badge,
  mediaUrl,
  action,
  actions,
  children,
}: Props) {
  const btnBase =
    "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-colors shrink-0";
  const btnOutline = `${btnBase} bg-transparent text-foreground hover:bg-accent`;
  const btnPrimary = `${btnBase} bg-foreground text-background hover:bg-foreground/90`;
  const btnClass = action?.variant === "primary" ? btnPrimary : btnOutline;

  return (
    <div className="mb-6">
      {/* Breadcrumb */}
      {backHref && (
        <div className="mb-4">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 rounded-full bg-foreground/8 px-3 py-1.5 text-xs font-medium text-foreground/70 hover:bg-foreground/12 hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-3 w-3" />
            {backLabel ?? "Back"}
          </Link>
        </div>
      )}

      {/* Title row */}
      <div className="flex items-center justify-between gap-3">
        {/* Left: media + title + badge */}
        <div className="min-w-0 flex items-center gap-3">
          {mediaUrl && (
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaUrl}
                alt={title}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {badge}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 shrink-0">
          {actions}
          {!actions && action && (
            action.href ? (
              <Link href={action.href} className={btnClass}>{action.label}</Link>
            ) : (
              <button type="button" onClick={action.onClick} className={btnClass}>{action.label}</button>
            )
          )}
        </div>
      </div>

      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      {children}
    </div>
  );
}
