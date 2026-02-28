import { cn } from "@/lib/utils";

type TagProps = {
  label: string;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
};

export function Tag({ label, onRemove, disabled, className }: TagProps) {
  const removable = typeof onRemove === "function";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1.5 text-xs text-foreground",
        disabled && "opacity-60",
        className
      )}
    >
      <span className="truncate">{label}</span>

      {removable && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className={cn(
            "inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:bg-border/60",
            disabled && "cursor-not-allowed"
          )}
          aria-label={`Remove ${label}`}
        >
          ✕
        </button>
      )}
    </span>
  );
}
