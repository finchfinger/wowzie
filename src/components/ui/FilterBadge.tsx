type FilterBadgeProps = {
  count: number;
};

/**
 * Small circular badge showing the number of active filters.
 * Renders nothing when count is 0.
 */
export function FilterBadge({ count }: FilterBadgeProps) {
  if (count === 0) return null;
  return (
    <span className="ml-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold leading-none text-background">
      {count}
    </span>
  );
}
