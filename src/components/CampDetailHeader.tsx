import { Tag } from "@/components/ui/Tag";
import { CampMetaList } from "@/components/CampMetaList";

type CampDetailHeaderProps = {
  name: string;
  description?: string | null;
  isFeatured?: boolean;
  activityKind?: string | null;
  chipLabel?: string | null;
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
  priceLabel?: string | null;
};

// ─── M3 Expressive Icon Button ─────────────────────────────────────────────

type IconButtonProps = {
  icon: string;
  label: string;           // short label shown on hover, also used for aria-label
  ariaLabel?: string;      // override aria-label (e.g. for toggle states)
  onClick?: () => void;
  active?: boolean;
  activeColor?: string;    // icon + text color when active
  activeBg?: string;       // container color when active
  disabled?: boolean;
};

function IconButton({
  icon,
  label,
  ariaLabel,
  onClick,
  active,
  activeColor,
  activeBg,
  disabled,
}: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      disabled={disabled}
      className="flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        height: 40,
        borderRadius: 999,
        minWidth: 40,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        background: active
          ? (activeBg ?? "rgba(123,92,191,0.12)")
          : "rgba(255,255,255,0.85)",
        padding: "0 10px",
        transition: "background 0.18s ease, padding 0.18s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.padding = "0 16px";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.padding = "0 10px";
      }}
    >
      <span
        className="material-symbols-rounded select-none shrink-0"
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

// ─── CampDetailHeader ──────────────────────────────────────────────────────

export function CampDetailHeader({
  name,
  description,
  isFeatured,
  activityKind,
  chipLabel,
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
  priceLabel,
}: CampDetailHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Top row: badge + actions */}
      <div className="flex items-center justify-between gap-4">
        {/* Chip */}
        <div className="flex items-center gap-2">
          {(() => {
            if (isFeatured) return <Tag label="Featured" style={{ background: "#E3FA4F", color: "#000" }} />;
            const label = activityKind ?? chipLabel;
            if (label) return <Tag label={label.charAt(0).toUpperCase() + label.slice(1)} />;
            return null;
          })()}
        </div>

        {/* M3 Expressive icon buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <IconButton
            icon="favorite"
            label="Favorite"
            ariaLabel={isFavorite ? "Remove from favorites" : "Add to favorites"}
            onClick={onFavorite}
            active={isFavorite}
            activeColor="#e91e8c"
            activeBg="rgba(233, 30, 140, 0.12)"
            disabled={favoriteDisabled}
          />
          <IconButton
            icon="conversation"
            label="Message"
            onClick={onMessage}
          />
          <IconButton
            icon="arrow_circle_up"
            label="Share"
            onClick={onShare}
          />
        </div>
      </div>

      {/* Title */}
      <h1 className="text-[24px] font-medium tracking-tight text-foreground leading-tight">
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
        priceLabel={priceLabel}
      />
    </div>
  );
}
