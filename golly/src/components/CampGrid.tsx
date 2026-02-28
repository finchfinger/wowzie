"use client";

import { CampCard } from "./CampCard";
import type { Camp } from "./CampCard";

type CampGridProps = {
  camps: Camp[];
  className?: string;
};

export function CampGrid({ camps, className = "" }: CampGridProps) {
  return (
    <div
      className={`grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 ${className}`}
    >
      {camps.map((camp) => (
        <CampCard key={camp.id} camp={camp} />
      ))}
    </div>
  );
}
