// src/components/ui/Checkbox.tsx
import React from "react";
import clsx from "clsx";

type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export const Checkbox: React.FC<CheckboxProps> = ({ className, label, ...props }) => {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        className={clsx(
          "h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500",
          className
        )}
        {...props}
      />
      {label && <span className="text-xs text-gray-700">{label}</span>}
    </label>
  );
};
