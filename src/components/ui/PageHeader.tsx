import Link from "next/link";

type Action = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "outline" | "primary";
};

type Props = {
  title: string;
  subtitle?: React.ReactNode;
  /** Single action — renders as a button or link */
  action?: Action;
  /** Multiple custom actions — rendered as-is to the right of the title */
  actions?: React.ReactNode;
  children?: React.ReactNode;
};

export function PageHeader({ title, subtitle, action, actions, children }: Props) {
  const btnBase =
    "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-colors shrink-0";
  const btnOutline = `${btnBase} bg-transparent text-foreground hover:bg-accent`;
  const btnPrimary = `${btnBase} bg-foreground text-background hover:bg-foreground/90`;

  const btnClass = action?.variant === "primary" ? btnPrimary : btnOutline;

  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
        {!actions && action && (
          action.href ? (
            <Link href={action.href} className={btnClass}>
              {action.label}
            </Link>
          ) : (
            <button type="button" onClick={action.onClick} className={btnClass}>
              {action.label}
            </button>
          )
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      )}
      {children}
    </div>
  );
}
