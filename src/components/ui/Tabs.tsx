import React from "react";

export type TabItem = {
  id: string;
  label: string;
};

type TabsProps = {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
};

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeId,
  onChange,
  className = "",
}) => {
  return (
    <div className={className}>
      {/* Baseline + tabs */}
      <div className="flex gap-6 border-b border-gray-200">
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={[
                "pb-3 text-sm font-medium border-b-2 -mb-[1px] transition-colors",
                isActive
                  ? "border-violet-500 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700",
              ].join(" ")}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
