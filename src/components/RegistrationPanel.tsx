"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tag } from "@/components/ui/Tag";
import { Alert } from "@/components/ui/Alert";
import { SessionList } from "@/components/SessionList";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RegistrationSession = {
  id: string;
  name: string;
  ageGroup?: string;
  sessionType?: string;
  dateRange: string;
  timeRange?: string;
  spotsRemaining?: number | null;
};

export type RegistrationAddon = {
  id: string;
  name: string;
  priceLabel: string;
  priceCents: number;
  totalDays: number;
};

export type AddonState = {
  selected: boolean;
  mode: "all" | "pick";
  daysSelected: number;
};

export type RegistrationStatus =
  | "available"
  | "booked"
  | "full"
  | "external"
  | "waitlist"
  | "ended";

// ─── SessionPicker ────────────────────────────────────────────────────────────

type SessionPickerProps = {
  sessions: RegistrationSession[];
  selectedSessionIds?: Set<string>;
  onSessionToggle?: (id: string) => void;
};

function FilterChip({ label, active, disabled, onClick }: { label: string; active: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "6px 14px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 500,
        border: "none",
        cursor: disabled ? "default" : "pointer",
        background: active ? "rgba(0,0,0,0.85)" : disabled ? "rgba(0,0,0,0.03)" : "rgba(0,0,0,0.06)",
        color: active ? "#fff" : disabled ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.7)",
        transition: "background 0.15s, color 0.15s",
      }}
    >
      {label}
    </button>
  );
}

function SessionPicker({ sessions, selectedSessionIds = new Set(), onSessionToggle }: SessionPickerProps) {
  const [age, setAge] = React.useState("");
  const [time, setTime] = React.useState("");

  const hasAgeGroups  = sessions.some(s => s.ageGroup);
  const hasSessionTypes = sessions.some(s => s.sessionType);

  const allAges  = [...new Set(sessions.map(s => s.ageGroup).filter(Boolean))] as string[];
  const allTimes = [...new Set(sessions.map(s => s.sessionType).filter(Boolean))] as string[];
  const allDates = [...new Set(sessions.map(s => s.dateRange))].sort((a, b) => {
    const toMs = (dr: string) => new Date(dr.split("–")[0].trim()).getTime();
    return toMs(a) - toMs(b);
  });

  const availableTimes = new Set(
    sessions.filter(s => !age || s.ageGroup === age).map(s => s.sessionType).filter(Boolean)
  );
  const availableDates = new Set(
    sessions
      .filter(s => (!age || s.ageGroup === age) && (!time || s.sessionType === time))
      .map(s => s.dateRange)
  );

  const handleAge = (a: string) => {
    const next = a === age ? "" : a;
    setAge(next);
    if (time && !sessions.some(s => s.ageGroup === next && s.sessionType === time)) setTime("");
  };

  const handleTime = (t: string) => setTime(t === time ? "" : t);

  const handleWeek = (dateRange: string) => {
    const match = sessions.find(s =>
      s.dateRange === dateRange &&
      (!age  || s.ageGroup    === age) &&
      (!time || s.sessionType === time)
    );
    if (match) onSessionToggle?.(match.id);
  };

  const selectedSessions = sessions.filter(s => selectedSessionIds.has(s.id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {hasAgeGroups && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(0,0,0,0.4)" }}>Age group</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {allAges.map(a => (
              <FilterChip key={a} label={a} active={age === a} disabled={false} onClick={() => handleAge(a)} />
            ))}
          </div>
        </div>
      )}

      {hasSessionTypes && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(0,0,0,0.4)" }}>Time of day</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {allTimes.map(t => (
              <FilterChip key={t} label={t} active={time === t} disabled={!!age && !availableTimes.has(t)} onClick={() => handleTime(t)} />
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(0,0,0,0.4)" }}>Weeks</p>
        {allDates.map(dateRange => {
          const isDisabled = (!!age || !!time) && !availableDates.has(dateRange);
          const matchingSession = sessions.find(s =>
            s.dateRange === dateRange &&
            (!age  || s.ageGroup    === age) &&
            (!time || s.sessionType === time)
          );
          const isChecked = !!matchingSession && selectedSessionIds.has(matchingSession.id);
          return (
            <button
              key={dateRange}
              type="button"
              onClick={() => handleWeek(dateRange)}
              disabled={isDisabled}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 14px",
                borderRadius: 8,
                border: "none",
                cursor: isDisabled ? "default" : "pointer",
                background: "transparent",
                boxShadow: isChecked ? "0 0 0 2px rgba(0,0,0,0.85)" : "0 0 0 1px var(--input)",
                textAlign: "left",
                opacity: isDisabled ? 0.3 : 1,
                transition: "box-shadow 0.15s, opacity 0.15s",
              }}
            >
              <span
                className="material-symbols-outlined select-none shrink-0"
                style={{ fontSize: 20, color: "rgba(0,0,0,0.85)", fontVariationSettings: "'FILL' 1", visibility: isChecked ? "visible" : "hidden" }}
                aria-hidden
              >
                check_circle
              </span>
              <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(0,0,0,0.85)" }}>{dateRange}</span>
            </button>
          );
        })}
      </div>

      {selectedSessions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 4, borderTop: "1px solid rgba(0,0,0,0.07)" }}>
          {selectedSessions.map(s => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 2px" }}>
              <p style={{ fontSize: 13, color: "rgba(0,0,0,0.55)" }}>
                {[s.ageGroup, s.sessionType, s.dateRange].filter(Boolean).join(" · ")}
              </p>
              <button type="button" onClick={() => onSessionToggle?.(s.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, flexShrink: 0 }}>
                <span className="material-symbols-outlined select-none" style={{ fontSize: 16, color: "rgba(0,0,0,0.35)" }}>close</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AddonCard ────────────────────────────────────────────────────────────────

type AddonCardProps = {
  addon: RegistrationAddon;
  state: AddonState;
  onToggle: () => void;
  onModeChange: (mode: "all" | "pick") => void;
  onEditDays: () => void;
};

function AddonCard({ addon, state, onToggle, onModeChange, onEditDays }: AddonCardProps) {
  const { selected, mode, daysSelected } = state;
  const dayCount = mode === "all" ? addon.totalDays : daysSelected;
  const total =
    addon.priceCents > 0 && dayCount > 0
      ? `$${Math.round((addon.priceCents / 100) * dayCount)}`
      : null;

  return (
    <div
      style={{
        borderRadius: 8,
        boxShadow: selected
          ? "0 0 0 2px rgba(0,0,0,0.85)"
          : "0 0 0 1px var(--input)",
        background: "#fff",
        transition: "box-shadow 0.15s",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          background: "transparent",
          border: "none",
          outline: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span
          className="material-symbols-outlined select-none shrink-0"
          style={{
            fontSize: 22,
            lineHeight: 1,
            color: selected ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.2)",
            fontVariationSettings: selected ? "'FILL' 1" : "'FILL' 0",
          }}
          aria-hidden
        >
          {selected ? "check_box" : "check_box_outline_blank"}
        </span>

        <p style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "rgba(0,0,0,0.85)", lineHeight: "20px" }}>
          {addon.name}
        </p>

        <p style={{ flexShrink: 0, fontSize: 14, fontWeight: 400, color: "rgba(0,0,0,0.45)", lineHeight: "20px" }}>
          {addon.priceLabel}
        </p>
      </button>

      {selected && (
        <div
          style={{
            borderTop: "1px solid rgba(0,0,0,0.08)",
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div
              style={{
                display: "inline-flex",
                background: "rgba(0,0,0,0.06)",
                borderRadius: 999,
                padding: 3,
                gap: 2,
              }}
            >
              {(["all", "pick"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onModeChange(m)}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 500,
                    background: mode === m ? "rgba(0,0,0,0.85)" : "transparent",
                    color: mode === m ? "#fff" : "rgba(0,0,0,0.55)",
                    border: "none",
                    outline: "none",
                    cursor: "pointer",
                    transition: "background 0.15s, color 0.15s",
                  }}
                >
                  {m === "all" ? "All days" : "Pick days"}
                </button>
              ))}
            </div>

            {total && (
              <p style={{ fontSize: 13, color: "rgba(0,0,0,0.45)", whiteSpace: "nowrap" }}>
                {addon.priceLabel} × {dayCount} days = {total}
              </p>
            )}
          </div>

          {mode === "pick" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "rgba(0,0,0,0.04)",
                borderRadius: 8,
                padding: "10px 14px",
              }}
            >
              <p style={{ fontSize: 13, color: "rgba(0,0,0,0.55)" }}>
                {daysSelected} of {addon.totalDays} days selected
              </p>
              <button
                type="button"
                onClick={onEditDays}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "rgba(0,0,0,0.75)",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                Edit
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── RegistrationPanel ────────────────────────────────────────────────────────

export type RegistrationPanelProps = {
  status?: RegistrationStatus;

  // Guest
  guests: number;
  maxGuests?: number;
  onGuestsChange: (n: number) => void;

  // Spots (shown in header)
  spotsRemaining?: number | null;

  // Sessions
  sessions?: RegistrationSession[];
  selectedSessionIds?: Set<string>;
  onSessionToggle?: (id: string) => void;

  // Add-ons
  addons?: RegistrationAddon[];
  addonStates?: Record<string, AddonState>;
  onAddonToggle?: (id: string) => void;
  onAddonModeChange?: (id: string, mode: "all" | "pick") => void;
  onAddonEditDays?: (id: string) => void;

  // Available actions
  onReserve?: () => void;
  reserveDisabled?: boolean;

  // Booked actions
  onViewBookingDetails?: () => void;
  onInviteFriend?: () => void;
  onCancelReservation?: () => void;

  // External actions
  campName?: string;
  onRegisterExternal?: () => void;
  onMarkGoing?: () => void;

  // Waitlist / full / ended actions
  onJoinWaitlist?: () => void;
  onExploreSimilar?: () => void;
};

export function RegistrationPanel({
  status = "available",
  guests,
  maxGuests = 10,
  onGuestsChange,
  spotsRemaining,
  sessions,
  selectedSessionIds = new Set(),
  onSessionToggle,
  addons,
  addonStates = {},
  onAddonToggle,
  onAddonModeChange,
  onAddonEditDays,
  onReserve,
  reserveDisabled,
  onViewBookingDetails,
  onInviteFriend,
  onCancelReservation,
  campName,
  onRegisterExternal,
  onMarkGoing,
  onJoinWaitlist,
  onExploreSimilar,
}: RegistrationPanelProps) {
  const hasSessions = sessions && sessions.length > 0;
  const hasAddons = addons && addons.length > 0;
  const showSpotsInHeader = spotsRemaining != null && spotsRemaining <= 5;

  // Non-available states: Alert inside a standard card, read-only sessions, then action buttons
  if (status !== "available") {
    type AlertConfig = {
      tone: "success" | "error" | "warning" | "dark";
      icon: string;
      message: string;
      action?: { label: string; onClick: () => void };
    };
    const alertMap: Record<Exclude<RegistrationStatus, "available">, AlertConfig> = {
      booked:   { tone: "success", icon: "cheer",      message: "You're in. We can't wait to see you!", action: onViewBookingDetails ? { label: "See details", onClick: onViewBookingDetails } : undefined },
      full:     { tone: "error",   icon: "cancel",     message: "This session is full.",                action: onExploreSimilar   ? { label: "Explore similar", onClick: onExploreSimilar } : undefined },
      external: { tone: "warning", icon: "outbound",   message: "Registration is handled on their website.", action: onRegisterExternal ? { label: "Register now", onClick: onRegisterExternal } : undefined },
      waitlist: { tone: "warning", icon: "list_alt",   message: "This session is full but the waitlist is open.", action: onJoinWaitlist ? { label: "Join the waitlist", onClick: onJoinWaitlist } : undefined },
      ended:    { tone: "dark",    icon: "event_busy", message: "This camp has ended.",                  action: onExploreSimilar   ? { label: "Explore similar", onClick: onExploreSimilar } : undefined },
    };
    const { tone, icon, message, action } = alertMap[status];

    return (
      <Card>
        <CardContent className="flex flex-col gap-6">
          <Alert tone={tone} icon={icon} action={action}>
            {message}
          </Alert>

          {hasSessions && (
            <SessionList sessions={sessions!} />
          )}

          {status === "booked" && (
            <div className="grid grid-cols-2 gap-3">
              <Button size="lg" onClick={onInviteFriend}>Invite a friend</Button>
              <Button size="lg" variant="secondary" onClick={onCancelReservation}>Cancel reservation</Button>
            </div>
          )}
          {status === "full" && (
            <Button size="lg" variant="secondary" className="w-full" onClick={onExploreSimilar}>
              Explore similar events
            </Button>
          )}
          {status === "waitlist" && (
            <div className="grid grid-cols-2 gap-3">
              <Button size="lg" onClick={onJoinWaitlist}>Join the waitlist</Button>
              <Button size="lg" variant="secondary" onClick={onExploreSimilar}>Explore similar events</Button>
            </div>
          )}
          {status === "ended" && (
            <Button size="lg" variant="secondary" className="w-full" onClick={onExploreSimilar}>
              Explore similar events
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Available state — standard card layout
  return (
    <Card>
      <CardContent className="flex flex-col gap-6">

        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: "rgba(0,0,0,0.85)" }}>Registration</p>
          {showSpotsInHeader && (
            <Tag size="sm" label={`Only ${spotsRemaining} spot${spotsRemaining !== 1 ? "s" : ""} remaining`} />
          )}
        </div>

        <Select value={String(guests)} onValueChange={(v) => onGuestsChange(Number(v))}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: Math.max(1, maxGuests) }, (_, i) => i + 1).map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} guest{n !== 1 ? "s" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasSessions && (
          <SessionPicker
            sessions={sessions!}
            selectedSessionIds={selectedSessionIds}
            onSessionToggle={onSessionToggle}
          />
        )}

        {hasAddons && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "rgba(0,0,0,0.85)" }}>
              Here are some add ons
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {addons!.map((addon) => (
                <AddonCard
                  key={addon.id}
                  addon={addon}
                  state={addonStates[addon.id] ?? { selected: false, mode: "all", daysSelected: 0 }}
                  onToggle={() => onAddonToggle?.(addon.id)}
                  onModeChange={(mode) => onAddonModeChange?.(addon.id, mode)}
                  onEditDays={() => onAddonEditDays?.(addon.id)}
                />
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Button size="lg" className="w-full" onClick={onReserve} disabled={reserveDisabled}>
            Reserve
          </Button>
          <p style={{ textAlign: "center", fontSize: 12, color: "rgba(0,0,0,0.4)" }}>
            You won&apos;t be charged yet
          </p>
        </div>

      </CardContent>
    </Card>
  );
}
