// src/components/calendar/CalendarTabs.tsx
import React from "react";

type CalendarTab = "my" | "shared";

type Props = {
  active: CalendarTab;
  onChange: (tab: CalendarTab) => void;
};

export const CalendarTabs: React.FC<Props> = ({ active, onChange }) => {
  const base =
    "pb-3 border-b-2 text-sm font-medium transition-colors";

  const activeClasses = "border-gray-900 text-gray-900";
  const inactiveClasses =
    "border-transparent text-gray-500 hover:text-gray-800";

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex gap-6">
        <button
          type="button"
          className={`${base} ${
            active === "my" ? activeClasses : inactiveClasses
          }`}
          onClick={() => onChange("my")}
        >
          My Calendar
        </button>
        <button
          type="button"
          className={`${base} ${
            active === "shared" ? activeClasses : inactiveClasses
          }`}
          onClick={() => onChange("shared")}
        >
          Shared Calendars
        </button>
      </nav>
    </div>
  );
};
