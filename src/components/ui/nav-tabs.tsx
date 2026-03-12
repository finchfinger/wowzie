"use client";

import Link from "next/link";

export type NavTabItem<T extends string = string> = {
  id: T;
  label: string;
  href?: string; // if provided, renders a <Link> instead of <button>
};

type NavTabsProps<T extends string = string> = {
  tabs: NavTabItem<T>[];
  activeId: T;
  onChange?: (id: T) => void; // used when tabs are buttons
  className?: string;
};

export function NavTabs<T extends string = string>({
  tabs,
  activeId,
  onChange,
  className = "",
}: NavTabsProps<T>) {
  return (
    <div className={`flex border-b border-border mb-6 ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        const sharedClass = [
          "relative px-3 py-1.5 mb-2 text-sm font-medium rounded-md transition-colors",
          isActive
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted",
        ].join(" ");

        const underline = isActive ? (
          <span className="absolute bottom-[-9px] left-0 right-0 h-0.5 rounded-full bg-foreground" />
        ) : null;

        if (tab.href) {
          return (
            <Link key={tab.id} href={tab.href} className={sharedClass}>
              {tab.label}
              {underline}
            </Link>
          );
        }

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange?.(tab.id)}
            className={sharedClass}
          >
            {tab.label}
            {underline}
          </button>
        );
      })}
    </div>
  );
}
