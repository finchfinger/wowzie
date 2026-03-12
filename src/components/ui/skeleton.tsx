import { cn } from "@/lib/utils";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-muted",
        className
      )}
      {...props}
    />
  );
}

/** Card-shaped skeleton for activity/camp listings */
export function CampCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-card border border-border/50">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="px-4 py-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

/** Row-shaped skeleton for lists */
export function RowSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="h-9 w-9 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-2/3" />
        {lines > 1 && <Skeleton className="h-3 w-1/2" />}
      </div>
    </div>
  );
}
