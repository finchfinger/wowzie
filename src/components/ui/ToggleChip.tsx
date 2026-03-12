import { cn } from "@/lib/utils";

type ToggleChipProps = {
  label: string;
  selected: boolean;
  onToggle: () => void;
  className?: string;
  disabled?: boolean;
};

export function ToggleChip({
  label,
  selected,
  onToggle,
  className,
  disabled,
}: ToggleChipProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-2 text-xs whitespace-nowrap",
        "transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        disabled && "opacity-60 cursor-not-allowed",
        selected
          ? "border-primary bg-primary/10 text-primary font-medium"
          : "border-border bg-background text-foreground hover:bg-muted",
        className
      )}
    >
      {label}
    </button>
  );
}
