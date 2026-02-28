"use client";

import React from "react";

type InfoRowProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
};

export const InfoRow: React.FC<InfoRowProps> = ({
  icon,
  label,
  value,
}) => {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-card text-muted-foreground ring-1 ring-border">
        {icon}
      </div>
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-semibold text-foreground">
          {value}
        </p>
      </div>
    </div>
  );
};
