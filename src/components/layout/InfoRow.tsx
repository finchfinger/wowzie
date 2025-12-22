// src/components/layout/InfoRow.tsx
import React from "react";

export type InfoRowProps = {
  icon: React.ReactNode;
  title: string;
  body: string;
};

export const InfoRow: React.FC<InfoRowProps> = ({
  icon,
  title,
  body,
}) => (
  <div className="flex items-start gap-3">
    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs">
      {icon}
    </div>
    <div className="text-xs text-gray-800">
      <p className="font-semibold">{title}</p>
      <p className="mt-0.5 text-gray-600">{body}</p>
    </div>
  </div>
);
