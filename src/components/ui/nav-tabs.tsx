"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export type NavTabItem<T extends string = string> = {
  id: T;
  label: string;
  href?: string; // if provided, renders a <Link> instead of <button>
};

type NavTabsProps<T extends string = string> = {
  tabs: NavTabItem<T>[];
  activeId: T;
  onChange?: (id: T) => void; // used when tabs are buttons
  /** Remove the full-width bottom border (e.g. on dashboard pages) */
  borderless?: boolean;
  className?: string;
};

export function NavTabs<T extends string = string>({
  tabs,
  activeId,
  onChange,
  borderless = false,
  className = "",
}: NavTabsProps<T>) {
  return (
    <div className={cn("flex mb-6 overflow-x-auto scrollbar-none", !borderless && "border-b border-border", className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        const sharedClass = [
          "relative px-3 py-1.5 mb-2 text-sm font-medium rounded-md transition-colors first:pl-0",
          isActive
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground",
        ].join(" ");

        const inner = (
          <span className="relative">
            {tab.label}
            {isActive && (
              <span className="absolute bottom-[-9px] left-0 right-0 h-0.5 rounded-full bg-foreground" />
            )}
          </span>
        );

        if (tab.href) {
          return (
            <Link key={tab.id} href={tab.href} className={sharedClass}>
              {inner}
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
            {inner}
          </button>
        );
      })}
    </div>
  );
}
