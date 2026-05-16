"use client";
import React, { useState } from "react";
import { Tag } from "@/components/ui/Tag";
import { CampMetaList } from "@/components/CampMetaList";

type CampDetailHeaderProps = {
  name: string;
  description?: string | null;
  isFeatured?: boolean;
  activityKind?: string | null;
  chipLabel?: string | null;
  seasonLabel?: string | null;
  isFavorite?: boolean;
  favoriteDisabled?: boolean;
  onFavorite?: () => void;
  onMessage?: () => void;
  onShare?: () => void;
  // Meta list props
  dateLabel?: string | null;
  timeLabel?: string | null;
  locationVenueName?: string | null;
  locationLine?: string | null;
  isVirtual?: boolean;
  ageLabel?: string | null;
  ageDescription?: string | null;
  priceLabel?: string | null;
  priceDescription?: string | null;
};

// ─── M3 Expressive Icon Button ─────────────────────────────────────────────

type IconButtonProps = {
  icon: string;
  label: string;
  ariaLabel?: string;
  onClick?: () => void;
  active?: boolean;
  activeColor?: string;
  activeBg?: string;
  disabled?: boolean;
  width: number;
  radius: number;
  onHover: (hovered: boolean) => void;
};

function IconButton({
  icon, label, ariaLabel, onClick, active, activeColor, activeBg, disabled, width, radius, onHover,
}: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      disabled={disabled}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className="flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden"
      style={{
        width,
        height: 40,
        borderRadius: radius,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        background: active ? (activeBg ?? "rgba(123,92,191,0.12)") : "rgba(255,255,255,0.85)",
        padding: 0,
        transition: "width 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), border-radius 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.18s ease",
      }}
    >
      <span
        className="material-symbols-outlined select-none shrink-0"
        style={{
          fontSize: 22,
          lineHeight: 1,
          fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
          color: active && activeColor ? activeColor : "#4a3f6b",
          transition: "color 0.18s ease, font-variation-settings 0.15s ease",
        }}
        aria-hidden
      >
        {icon}
      </span>
    </button>
  );
}

function IconButtonGroup({ children }: { children: React.ReactNode }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const items = React.Children.toArray(children);
  return (
    <div className="flex items-center gap-1.5">
      {items.map((child, i) =>
        React.isValidElement(child) ? React.cloneElement(child as React.ReactElement<IconButtonProps>, {
          width: hovered === null ? 40 : hovered === i ? 48 : 36,
          radius: hovered === i ? 8 : 20,
          onHover: (h: boolean) => setHovered(h ? i : null),
        }) : null
      )}
    </div>
  );
}

// ─── CampDetailHeader ──────────────────────────────────────────────────────

export function CampDetailHeader({
  name,
  description,
  isFeatured,
  activityKind,
  chipLabel,
  seasonLabel,
  isFavorite,
  favoriteDisabled,
  onFavorite,
  onMessage,
  onShare,
  dateLabel,
  timeLabel,
  locationVenueName,
  locationLine,
  isVirtual,
  ageLabel,
  ageDescription,
  priceLabel,
  priceDescription,
}: CampDetailHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Top row: badge + actions */}
      <div className="flex items-center justify-between gap-4">
        {/* Chips */}
        <div className="flex items-center gap-1">
          {seasonLabel && <Tag label={seasonLabel} />}
          {isFeatured
            ? <Tag label="Featured" />
            : (activityKind ?? chipLabel) && <Tag label={activityKind ?? chipLabel!} />
          }
        </div>

        {/* M3 Expressive icon buttons */}
        <IconButtonGroup>
          <IconButton
            icon="favorite"
            label="Favorite"
            ariaLabel={isFavorite ? "Remove from favorites" : "Add to favorites"}
            onClick={onFavorite}
            active={isFavorite}
            activeColor="#F200FF"
            activeBg="#F9C1FF"
            disabled={favoriteDisabled}
            width={40}
            radius={20}
            onHover={() => {}}
          />
          <IconButton
            icon="conversation"
            label="Message"
            onClick={onMessage}
            width={40}
            radius={20}
            onHover={() => {}}
          />
          <IconButton
            icon="arrow_circle_up"
            label="Share"
            onClick={onShare}
            width={40}
            radius={20}
            onHover={() => {}}
          />
        </IconButtonGroup>
      </div>

      {/* Title */}
      <h1
        className="text-[26px] tracking-tight text-foreground leading-tight"
        style={{ fontFamily: "'Google Sans Flex', sans-serif", fontVariationSettings: "'wght' 600, 'wdth' 151, 'GRAD' 22" }}
      >
        {name}
      </h1>

      {/* Description */}
      {description && (
        <p style={{ fontSize: 14, lineHeight: "22px", color: "rgba(0,0,0,0.6)", fontWeight: 400 }}>
          {description}
        </p>
      )}

      {/* Meta list */}
      <CampMetaList
        dateLabel={dateLabel}
        timeLabel={timeLabel}
        locationVenueName={locationVenueName}
        locationLine={locationLine}
        isVirtual={isVirtual}
        ageLabel={ageLabel}
        ageDescription={ageDescription}
        priceLabel={priceLabel}
        priceDescription={priceDescription}
      />
    </div>
  );
}
