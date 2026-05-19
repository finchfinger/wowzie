"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TimeOption = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
};

export type FlexPricing = {
  [timeOptionId: string]: {
    weekly: number;
    dropin: number;
  };
};

export type FlexRange = {
  startDate: string;
  endDate: string;
};

export type FlexSelection = {
  // keyed by timeOptionId
  weeks: Record<string, string[]>;
  days: Record<string, string[]>;
};

type WeekBlock = {
  weekStart: string;
  label: string;   // "Jun 8 – Jun 12"
  days: DayItem[];
};

type DayItem = {
  iso: string;
  label: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function generateWeeks(startDate: string, endDate: string): WeekBlock[] {
  const weeks: WeekBlock[] = [];
  const end = new Date(endDate + "T12:00:00");

  // Find first Monday on or after startDate
  const cur = new Date(startDate + "T12:00:00");
  while (cur.getDay() !== 1) cur.setDate(cur.getDate() + 1);

  while (cur <= end) {
    const wStart = new Date(cur);
    const days: DayItem[] = [];
    for (let d = 0; d < 5; d++) {
      const day = new Date(cur);
      day.setDate(cur.getDate() + d);
      if (day > end) break;
      days.push({
        iso: isoDate(day),
        label: `${DAYS_SHORT[day.getDay()]} ${MONTHS[day.getMonth()]} ${day.getDate()}`,
      });
    }
    if (days.length > 0) {
      const last = days[days.length - 1];
      const lastDate = new Date(last.iso + "T12:00:00");
      const startStr = `${MONTHS[wStart.getMonth()]} ${wStart.getDate()}`;
      const endStr = `${MONTHS[lastDate.getMonth()]} ${lastDate.getDate()}`;
      weeks.push({
        weekStart: isoDate(wStart),
        label: `${startStr} – ${endStr}`,
        days,
      });
    }
    cur.setDate(cur.getDate() + 7);
  }
  return weeks;
}

function fmt(dollars: number): string {
  return `$${dollars.toLocaleString()}`;
}

function fmtTime(t: string): string {
  // "09:00" → "9 AM", "15:00" → "3 PM"
  const [h, m] = t.split(":").map(Number);
  const suffix = h < 12 ? "AM" : "PM";
  const hour = h % 12 || 12;
  return m === 0 ? `${hour} ${suffix}` : `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

// ─── Shared picker row ────────────────────────────────────────────────────────

function PickerRow({
  icon,
  label,
  trailingAmount,
  checked,
  onClick,
}: {
  icon: string;
  label: string;
  trailingAmount?: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "13px 16px",
        borderRadius: 12,
        border: "none",
        cursor: "pointer",
        background: checked ? "rgba(0,0,0,0.04)" : "transparent",
        boxShadow: checked ? "0 0 0 2px rgba(0,0,0,0.85)" : "0 0 0 1px rgba(0,0,0,0.12)",
        textAlign: "left",
        transition: "box-shadow 0.15s, background 0.15s",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          className="material-symbols-outlined select-none shrink-0"
          style={{ fontSize: 20, color: checked ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.25)" }}
          aria-hidden
        >
          {icon}
        </span>
        <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(0,0,0,0.85)" }}>{label}</span>
      </div>
      {trailingAmount ? (
        <span style={{ fontSize: 13, color: "rgba(0,0,0,0.45)" }}>{trailingAmount}</span>
      ) : (
        <span className="material-symbols-outlined select-none" style={{ fontSize: 18, color: "rgba(0,0,0,0.25)" }} aria-hidden>
          chevron_right
        </span>
      )}
    </button>
  );
}

// ─── Week picker modal ────────────────────────────────────────────────────────

type WeekPickerProps = {
  open: boolean;
  onClose: () => void;
  weeks: WeekBlock[];
  selectedWeeks: Set<string>;
  onToggleWeek: (weekStart: string) => void;
};

function WeekPicker({ open, onClose, weeks, selectedWeeks, onToggleWeek }: WeekPickerProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Pick weeks</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 0 0 1px rgba(0,0,0,0.08)" }}>
            {weeks.map((week, idx) => {
              const selected = selectedWeeks.has(week.weekStart);
              return (
                <button
                  key={week.weekStart}
                  type="button"
                  onClick={() => onToggleWeek(week.weekStart)}
                  className="focus:outline-none"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    padding: "13px 16px",
                    borderTop: idx > 0 ? "1px solid rgba(0,0,0,0.06)" : "none",
                    border: "none",
                    borderRadius: 0,
                    cursor: "pointer",
                    background: selected ? "rgba(0,0,0,0.03)" : "#fff",
                    textAlign: "left",
                    transition: "background 0.1s",
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: selected ? 600 : 400, color: "rgba(0,0,0,0.85)" }}>
                    {week.label}
                  </span>
                  <span
                    className="material-symbols-outlined select-none shrink-0"
                    style={{
                      fontSize: 20,
                      color: "rgba(0,0,0,0.85)",
                      fontVariationSettings: "'FILL' 1",
                      opacity: selected ? 1 : 0,
                      transition: "opacity 0.1s",
                    }}
                    aria-hidden
                  >
                    check
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button className="w-full" size="lg" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Drop-in day picker modal ─────────────────────────────────────────────────

type DropinDayPickerProps = {
  open: boolean;
  onClose: () => void;
  weeks: WeekBlock[];
  selectedDays: Set<string>;
  onToggleDay: (iso: string) => void;
  onToggleWeek: (week: WeekBlock) => void;
};

function DropinDayPicker({ open, onClose, weeks, selectedDays, onToggleDay, onToggleWeek }: DropinDayPickerProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Pick drop-in days</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {weeks.map((week) => {
            const allSelected = week.days.every((d) => selectedDays.has(d.iso));
            return (
              <div key={week.weekStart}>
                {/* Section header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 4, paddingRight: 4, marginBottom: 6 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.35)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    {week.label}
                  </p>
                  <button
                    type="button"
                    onClick={() => onToggleWeek(week)}
                    className="focus:outline-none"
                    style={{ fontSize: 13, fontWeight: 500, color: "rgba(0,0,0,0.4)", background: "none", border: "none", cursor: "pointer" }}
                  >
                    {allSelected ? "None" : "All"}
                  </button>
                </div>

                {/* Grouped card */}
                <div style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 0 0 1px rgba(0,0,0,0.08)" }}>
                  {week.days.map((day, idx) => {
                    const selected = selectedDays.has(day.iso);
                    return (
                      <button
                        key={day.iso}
                        type="button"
                        onClick={() => onToggleDay(day.iso)}
                        className="focus:outline-none"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          padding: "13px 16px",
                          borderTop: idx > 0 ? "1px solid rgba(0,0,0,0.06)" : "none",
                          border: "none",
                          borderRadius: 0,
                          cursor: "pointer",
                          background: selected ? "rgba(0,0,0,0.03)" : "#fff",
                          textAlign: "left",
                          transition: "background 0.1s",
                        }}
                      >
                        <span style={{ fontSize: 14, fontWeight: selected ? 600 : 400, color: "rgba(0,0,0,0.85)" }}>
                          {day.label}
                        </span>
                        <span
                          className="material-symbols-outlined select-none shrink-0"
                          style={{
                            fontSize: 20,
                            color: "rgba(0,0,0,0.85)",
                            fontVariationSettings: "'FILL' 1",
                            opacity: selected ? 1 : 0,
                            transition: "opacity 0.1s",
                          }}
                          aria-hidden
                        >
                          check
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button className="w-full" size="lg" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── FlexibleBookingPanel ─────────────────────────────────────────────────────

export type FlexibleBookingPanelProps = {
  timeOptions: TimeOption[];
  flexPricing: FlexPricing;
  flexRange: FlexRange;
  onReserve?: (selection: FlexSelection) => void;
};

export function FlexibleBookingPanel({ timeOptions, flexPricing, flexRange, onReserve }: FlexibleBookingPanelProps) {
  // Per-time-option selections
  const [weekSelections, setWeekSelections] = React.useState<Record<string, Set<string>>>({});
  const [daySelections, setDaySelections] = React.useState<Record<string, Set<string>>>({});
  // Which modal is open: { type, timeOptionId } or null
  const [activePicker, setActivePicker] = React.useState<{ type: "week" | "day"; timeOptionId: string } | null>(null);

  const weeks = React.useMemo(() => generateWeeks(flexRange.startDate, flexRange.endDate), [flexRange]);

  function getWeeks(id: string): Set<string> { return weekSelections[id] ?? new Set(); }
  function getDays(id: string): Set<string> { return daySelections[id] ?? new Set(); }

  function toggleWeek(timeOptionId: string, weekStart: string) {
    setWeekSelections((prev) => {
      const cur = new Set(prev[timeOptionId] ?? []);
      if (cur.has(weekStart)) cur.delete(weekStart); else cur.add(weekStart);
      return { ...prev, [timeOptionId]: cur };
    });
  }

  function toggleDay(timeOptionId: string, iso: string) {
    setDaySelections((prev) => {
      const cur = new Set(prev[timeOptionId] ?? []);
      if (cur.has(iso)) cur.delete(iso); else cur.add(iso);
      return { ...prev, [timeOptionId]: cur };
    });
  }

  function toggleAllWeekDays(timeOptionId: string, week: WeekBlock) {
    setDaySelections((prev) => {
      const cur = new Set(prev[timeOptionId] ?? []);
      const allSelected = week.days.every((d) => cur.has(d.iso));
      if (allSelected) week.days.forEach((d) => cur.delete(d.iso));
      else week.days.forEach((d) => cur.add(d.iso));
      return { ...prev, [timeOptionId]: cur };
    });
  }

  // Compute totals across all time options
  const lineItems: { label: string; amount: number }[] = [];
  let grandTotal = 0;
  for (const opt of timeOptions) {
    const p = flexPricing[opt.id] ?? { weekly: 0, dropin: 0 };
    const wCount = getWeeks(opt.id).size;
    const dCount = getDays(opt.id).size;
    if (wCount > 0) {
      const amt = wCount * p.weekly;
      lineItems.push({ label: `${opt.label} · ${wCount} week${wCount !== 1 ? "s" : ""} × ${fmt(p.weekly)}`, amount: amt });
      grandTotal += amt;
    }
    if (dCount > 0) {
      const amt = dCount * p.dropin;
      lineItems.push({ label: `${opt.label} drop-in · ${dCount} day${dCount !== 1 ? "s" : ""} × ${fmt(p.dropin)}`, amount: amt });
      grandTotal += amt;
    }
  }
  const hasSelection = grandTotal > 0;

  const activeTimeOption = activePicker ? timeOptions.find((t) => t.id === activePicker.timeOptionId) : null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-6">

        <p style={{ fontSize: 16, fontWeight: 700, color: "rgba(0,0,0,0.85)" }}>Registration</p>

        {/* One section per time option */}
        {timeOptions.map((opt, i) => {
          const p = flexPricing[opt.id] ?? { weekly: 0, dropin: 0 };
          const selWeeks = getWeeks(opt.id);
          const selDays = getDays(opt.id);
          const timeRange = `${fmtTime(opt.startTime)} – ${fmtTime(opt.endTime)}`;

          return (
            <div key={opt.id}>
              {/* Divider between sections */}
              {i > 0 && <div style={{ height: 1, background: "rgba(0,0,0,0.07)", marginBottom: 24 }} />}

              {/* Section header */}
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "rgba(0,0,0,0.85)" }}>{opt.label}</p>
                  <p style={{ fontSize: 12, color: "rgba(0,0,0,0.4)", marginTop: 1 }}>{timeRange}</p>
                </div>
              </div>

              {/* Weekly row */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(0,0,0,0.35)" }}>Weekly</p>
                  <p style={{ fontSize: 12, color: "rgba(0,0,0,0.35)" }}>{fmt(p.weekly)}/week</p>
                </div>
                <PickerRow
                  icon="date_range"
                  label={selWeeks.size > 0 ? `${selWeeks.size} week${selWeeks.size !== 1 ? "s" : ""} selected` : "Pick weeks"}
                  trailingAmount={selWeeks.size > 0 ? fmt(selWeeks.size * p.weekly) : undefined}
                  checked={selWeeks.size > 0}
                  onClick={() => setActivePicker({ type: "week", timeOptionId: opt.id })}
                />
              </div>

              {/* Drop-in row */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(0,0,0,0.35)" }}>Drop-in</p>
                  <p style={{ fontSize: 12, color: "rgba(0,0,0,0.35)" }}>{fmt(p.dropin)}/day</p>
                </div>
                <PickerRow
                  icon="calendar_month"
                  label={selDays.size > 0 ? `${selDays.size} day${selDays.size !== 1 ? "s" : ""} selected` : "Pick days"}
                  trailingAmount={selDays.size > 0 ? fmt(selDays.size * p.dropin) : undefined}
                  checked={selDays.size > 0}
                  onClick={() => setActivePicker({ type: "day", timeOptionId: opt.id })}
                />
              </div>
            </div>
          );
        })}

        {/* Price summary */}
        {hasSelection && (
          <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
            {lineItems.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "rgba(0,0,0,0.5)" }}>
                <span>{item.label}</span>
                <span>{fmt(item.amount)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700, color: "rgba(0,0,0,0.85)", paddingTop: 8, borderTop: "1px solid rgba(0,0,0,0.08)" }}>
              <span>Total</span>
              <span>{fmt(grandTotal)}</span>
            </div>
          </div>
        )}

        <Button size="lg" className="w-full" disabled={!hasSelection} onClick={() => {
          const sel: FlexSelection = { weeks: {}, days: {} };
          for (const opt of timeOptions) {
            const w = getWeeks(opt.id);
            const d = getDays(opt.id);
            if (w.size > 0) sel.weeks[opt.id] = [...w];
            if (d.size > 0) sel.days[opt.id] = [...d];
          }
          onReserve?.(sel);
        }}>
          Reserve
        </Button>

      </CardContent>

      {/* Week picker modal */}
      {activePicker?.type === "week" && activeTimeOption && (
        <WeekPicker
          open
          onClose={() => setActivePicker(null)}
          weeks={weeks}
          selectedWeeks={getWeeks(activePicker.timeOptionId)}
          onToggleWeek={(weekStart) => toggleWeek(activePicker.timeOptionId, weekStart)}
        />
      )}

      {/* Drop-in day picker modal */}
      {activePicker?.type === "day" && activeTimeOption && (
        <DropinDayPicker
          open
          onClose={() => setActivePicker(null)}
          weeks={weeks}
          selectedDays={getDays(activePicker.timeOptionId)}
          onToggleDay={(iso) => toggleDay(activePicker.timeOptionId, iso)}
          onToggleWeek={(week) => toggleAllWeekDays(activePicker.timeOptionId, week)}
        />
      )}
    </Card>
  );
}
