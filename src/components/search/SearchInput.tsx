import React from "react";

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
};

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onSubmit,
}) => {
  return (
    <label className="relative flex-1">
      <span className="sr-only">Search by camp name, topic, or location</span>
      <input
        type="search"
        name="q"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by camp name, topic, or location"
        className="w-full rounded-xl border border-wowzie-borderSubtle bg-wowzie-surfaceSubtle px-3 py-2 text-body text-wowzie-text-primary placeholder:text-wowzie-text-subtle focus:outline-none focus:ring-2 focus:ring-violet-500"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSubmit?.();
          }
        }}
      />
      <span
        aria-hidden="true"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-wowzie-text-subtle"
      >
        🔍
      </span>
    </label>
  );
};
