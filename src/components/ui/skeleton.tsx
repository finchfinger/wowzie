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
    <div className="rounded-card overflow-hidden bg-card">
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
export function RowSkeleton({ lines = 2, showAction = false }: { lines?: number; showAction?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="h-9 w-9 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-2/3" />
        {lines > 1 && <Skeleton className="h-3 w-1/2" />}
      </div>
      {showAction && <Skeleton className="h-8 w-16 rounded-lg shrink-0" />}
    </div>
  );
}

/** Multiple stacked RowSkeletons */
export function RowSkeletons({ count = 4, showAction = false, className }: { count?: number; showAction?: boolean; className?: string }) {
  return (
    <div className={cn("space-y-1", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <RowSkeleton key={i} showAction={showAction} />
      ))}
    </div>
  );
}

/** Full-width block skeletons (e.g. list rows without avatar) */
export function BlockSkeletons({ count = 4, height = "h-16", className }: { count?: number; height?: string; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cn("w-full rounded-card", height)} />
      ))}
    </div>
  );
}

/** Listing-style skeleton: thumbnail + text lines */
export function ListingSkeletons({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-4 rounded-card p-4">
          <Skeleton className="h-24 w-24 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
