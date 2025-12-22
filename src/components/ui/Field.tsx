import React from "react";
import clsx from "clsx";

type FieldProps = {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
};

export const Field: React.FC<FieldProps> = ({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}) => {
  return (
    <div className={clsx("space-y-1", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="flex items-center gap-1 text-xs font-medium text-gray-700"
        >
          <span>{label}</span>
          {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {children}

      {hint && !error && (
        <p className="text-[11px] text-gray-500">{hint}</p>
      )}

      {error && (
        <p className="text-[11px] text-red-600">{error}</p>
      )}
    </div>
  );
};
