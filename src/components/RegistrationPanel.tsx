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

// ─── Types ────────────────────────────────────────────────────────────────────

export type RegistrationSession = {
  id: string;
  name: string;
  dateRange: string;
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

// ─── RegistrationBanner ───────────────────────────────────────────────────────

const BANNER_STYLES: Record<string, { background: string }> = {
  success:  { background: "#D1FAE5" },
  error:    { background: "#FECACA" },
  external: { background: "#E0E7FF" },
  waitlist: { background: "#FEF9C3" },
  ended:    { background: "rgba(0,0,0,0.85)" },
};

export type RegistrationBannerProps = {
  variant: "success" | "error" | "external" | "waitlist" | "ended";
  icon: string;
  message: string;
};

export function RegistrationBanner({ variant, icon, message }: RegistrationBannerProps) {
  const { background } = BANNER_STYLES[variant];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        padding: "14px 20px",
        background,
        color: variant === "ended" ? "#fff" : "rgba(0,0,0,0.8)",
      }}
    >
      <span
        className="material-symbols-rounded select-none shrink-0"
        style={{ fontSize: 20, lineHeight: 1 }}
        aria-hidden
      >
        {icon}
      </span>
      <p style={{ fontSize: 14, fontWeight: 500, lineHeight: "20px" }}>{message}</p>
    </div>
  );
}

// ─── SessionCard ──────────────────────────────────────────────────────────────

type SessionCardProps = {
  session: RegistrationSession;
  selected: boolean;
  onToggle: () => void;
};

function SessionCard({ session, selected, onToggle }: SessionCardProps) {
  const showSpotsWarning =
    session.spotsRemaining != null && session.spotsRemaining <= 5;

  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        borderRadius: 8,
        border: "none",
        outline: "none",
        boxShadow: selected
          ? "0 0 0 2px rgba(0,0,0,0.85)"
          : "0 0 0 1px var(--input)",
        background: "#fff",
        textAlign: "left",
        cursor: "pointer",
        transition: "box-shadow 0.15s",
      }}
    >
      {/* Check indicator — always reserves space, invisible when unselected */}
      <span
        className="material-symbols-rounded select-none shrink-0"
        style={{
          fontSize: 22,
          lineHeight: 1,
          color: "rgba(0,0,0,0.85)",
          fontVariationSettings: "'FILL' 1",
          visibility: selected ? "visible" : "hidden",
        }}
        aria-hidden
      >
        check_circle
      </span>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "rgba(0,0,0,0.85)", lineHeight: "20px" }}>
          {session.name}
        </p>
        <p style={{ fontSize: 13, fontWeight: 400, color: "rgba(0,0,0,0.45)", lineHeight: "18px" }}>
          {session.dateRange}
        </p>
      </div>

      {showSpotsWarning && (
        <Tag
          size="sm"
          label={`Only ${session.spotsRemaining} spot${session.spotsRemaining !== 1 ? "s" : ""} remaining`}
        />
      )}
    </button>
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
          className="material-symbols-rounded select-none shrink-0"
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

  // Status states: banner flush at top, actions below with padding
  if (status !== "available") {
    const bannerMap = {
      booked:   { variant: "success"  as const, icon: "cheer",      message: "You're in. We can't wait to see you!" },
      full:     { variant: "error"    as const, icon: "cancel",     message: "This session is full" },
      external: { variant: "external" as const, icon: "outbound",   message: "Booking is handled on their website" },
      waitlist: { variant: "waitlist" as const, icon: "list_alt",   message: "This session has reached capacity but you can join the waitlist." },
      ended:    { variant: "ended"    as const, icon: "event_busy", message: "This class has ended" },
    };
    const banner = bannerMap[status];

    return (
      <div className="rounded-card bg-card overflow-hidden flex flex-col">
        {/* Banner — flush to top, edge-to-edge */}
        <RegistrationBanner variant={banner.variant} icon={banner.icon} message={banner.message} />

        {/* Actions — padded */}
        <div className="flex flex-col gap-4 p-6">
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
          {status === "external" && (
            <div className="grid grid-cols-2 gap-3">
              <Button size="lg" onClick={onRegisterExternal}>Register on their website</Button>
              <Button size="lg" variant="secondary" onClick={onMarkGoing}>I&apos;m going</Button>
            </div>
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
        </div>
      </div>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "rgba(0,0,0,0.85)" }}>
              Please select your sessions
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sessions!.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  selected={selectedSessionIds.has(session.id)}
                  onToggle={() => onSessionToggle?.(session.id)}
                />
              ))}
            </div>
          </div>
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
