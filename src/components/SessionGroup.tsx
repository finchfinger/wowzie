"use client";

import React from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SessionItem = {
  id: string;
  name: string;
  dateRange?: string;
  spotsRemaining?: number | null;
  ageGroup?: string;
};

export type SelectMode = "radio" | "checkbox" | "none";

// ─── groupByAgeGroup ──────────────────────────────────────────────────────────

export function groupByAgeGroup(
  sessions: SessionItem[]
): { group: string | null; items: SessionItem[] }[] {
  const groups: { group: string | null; items: SessionItem[] }[] = [];
  const seen = new Map<string, number>();

  for (const s of sessions) {
    const key = s.ageGroup ?? "__ungrouped__";
    if (seen.has(key)) {
      groups[seen.get(key)!].items.push(s);
    } else {
      seen.set(key, groups.length);
      groups.push({ group: s.ageGroup ?? null, items: [s] });
    }
  }

  return groups;
}

// ─── SessionRow ───────────────────────────────────────────────────────────────

type SessionRowProps = {
  session: SessionItem;
  selected?: boolean;
  selectMode?: SelectMode;
  onToggle?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
};

function SessionRow({
  session,
  selected = false,
  selectMode = "none",
  onToggle,
  isFirst = true,
  isLast = true,
}: SessionRowProps) {
  const showSpotsWarning = session.spotsRemaining != null && session.spotsRemaining <= 5;
  const interactive = selectMode !== "none" && !!onToggle;

  const topLeft    = isFirst ? "10px" : "0";
  const topRight   = isFirst ? "10px" : "0";
  const bottomRight = isLast  ? "10px" : "0";
  const bottomLeft  = isLast  ? "10px" : "0";
  const borderRadius = `${topLeft} ${topRight} ${bottomRight} ${bottomLeft}`;

  const leadingIcon = selectMode === "radio"
    ? (selected ? "check_circle" : "radio_button_unchecked")
    : selectMode === "checkbox"
    ? (selected ? "check_box" : "check_box_outline_blank")
    : null;

  const inner = (
    <>
      {leadingIcon && (
        <span
          className="material-symbols-outlined select-none shrink-0"
          style={{
            fontSize: 20,
            lineHeight: 1,
            color: selected ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.2)",
            fontVariationSettings: selected ? "'FILL' 1" : "'FILL' 0",
            transition: "color 0.15s, font-variation-settings 0.15s",
          }}
          aria-hidden
        >
          {leadingIcon}
        </span>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "rgba(0,0,0,0.85)", lineHeight: "20px" }}>
          {session.name}
        </p>
        {session.dateRange && (
          <p style={{ fontSize: 13, color: "rgba(0,0,0,0.45)", lineHeight: "18px", marginTop: 1 }}>
            {session.dateRange}
          </p>
        )}
      </div>

      {showSpotsWarning && (
        <p style={{ fontSize: 12, fontWeight: 600, color: "#dc2626", whiteSpace: "nowrap", flexShrink: 0 }}>
          Only {session.spotsRemaining} spot{session.spotsRemaining !== 1 ? "s" : ""} left
        </p>
      )}
    </>
  );

  const sharedStyle: React.CSSProperties = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    background: selected ? "rgba(103,80,164,0.07)" : "transparent",
    borderRadius,
    transition: "background 0.15s",
    textAlign: "left",
  };

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onToggle}
        style={{ ...sharedStyle, border: "none", outline: "none", cursor: "pointer" }}
      >
        {inner}
      </button>
    );
  }

  return <div style={sharedStyle}>{inner}</div>;
}

// ─── SessionGroup ─────────────────────────────────────────────────────────────

export type SessionGroupProps = {
  /** Optional age group label shown above the container */
  group?: string | null;
  items: SessionItem[];
  /** Which leading control to show. Defaults to "none" (read-only). */
  selectMode?: SelectMode;
  selectedIds?: Set<string>;
  onToggle?: (id: string) => void;
};

export function SessionGroup({
  group,
  items,
  selectMode = "none",
  selectedIds = new Set(),
  onToggle,
}: SessionGroupProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {group && (
        <p style={{ fontSize: 15, fontWeight: 700, color: "rgba(0,0,0,0.85)", lineHeight: "20px" }}>
          {group}
        </p>
      )}
      <div style={{ borderRadius: 12, background: "rgba(0,0,0,0.04)", overflow: "hidden" }}>
        {items.map((s, i) => (
          <React.Fragment key={s.id}>
            {i > 0 && <div style={{ height: 1, background: "rgba(0,0,0,0.08)" }} />}
            <SessionRow
              session={s}
              selected={selectedIds.has(s.id)}
              selectMode={selectMode}
              onToggle={onToggle ? () => onToggle(s.id) : undefined}
              isFirst={i === 0}
              isLast={i === items.length - 1}
            />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
