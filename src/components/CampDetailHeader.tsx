import { Tag } from "@/components/ui/Tag";
import { CampMetaList } from "@/components/CampMetaList";

type CampDetailHeaderProps = {
  name: string;
  description?: string | null;
  isFeatured?: boolean;
  activityKind?: string | null;
  isFavorite?: boolean;
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

function IconButton({ icon, onClick, active, label }: { icon: string; onClick?: () => void; active?: boolean; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex items-center justify-center transition-opacity hover:opacity-70"
      style={{ width: 32, height: 32, borderRadius: 4, background: "rgba(0,0,0,0.1)" }}
    >
      <span
        className="material-symbols-rounded select-none"
        style={{ fontSize: 18, lineHeight: 1, fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
        aria-hidden
      >
        {icon}
      </span>
    </button>
  );
}

export function CampDetailHeader({
  name,
  description,
  isFeatured,
  activityKind,
  isFavorite,
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
        <div className="flex items-center gap-2">
          {isFeatured ? (
            <Tag label="Featured" style={{ background: "#E3FA4F", color: "#000" }} />
          ) : activityKind ? (
            <Tag label={activityKind.charAt(0).toUpperCase() + activityKind.slice(1)} />
          ) : null}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <IconButton icon="asterisk" onClick={onFavorite} active={isFavorite} label={isFavorite ? "Remove from favorites" : "Add to favorites"} />
          <IconButton icon="tooltip" onClick={onMessage} label="Message host" />
          <IconButton icon="graph_5" onClick={onShare} label="Share" />
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
