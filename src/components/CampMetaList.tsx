import React from "react";

export type CampMetaListItemProps = {
  icon: string;
  primary: React.ReactNode;
  description?: React.ReactNode;
  href?: string;
};

export function CampMetaListItem({ icon, primary, description, href }: CampMetaListItemProps) {
  return (
    <div className="flex items-center" style={{ gap: 0 }}>
      {/* Icon — 40×40 container, no background */}
      <div className="shrink-0 flex items-center justify-center" style={{ width: 40, height: 40 }}>
        <span
          className="material-symbols-rounded select-none"
          style={{ fontSize: 20, lineHeight: 1, color: "rgba(0,0,0,0.8)" }}
          aria-hidden
        >
          {icon}
        </span>
      </div>

      {/* Text */}
      <div>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:underline"
            style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "rgba(0,0,0,0.8)" }}
          >
            {primary}
            <span
              className="material-symbols-rounded select-none"
              style={{ fontSize: 14, lineHeight: 1 }}
              aria-hidden
            >
              open_in_new
            </span>
          </a>
        ) : (
          <p style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "rgba(0,0,0,0.8)" }}>
            {primary}
          </p>
        )}
        {description && (
          <p style={{ fontSize: 12, lineHeight: "16px", fontWeight: 400, color: "rgba(0,0,0,0.5)" }}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

type CampMetaListProps = {
  dateLabel?: string | null;
  timeLabel?: string | null;
  locationVenueName?: string | null;
  locationLine?: string | null;
  isVirtual?: boolean;
  ageLabel?: string | null;
  priceLabel?: string | null;
};

export function CampMetaList({
  dateLabel,
  timeLabel,
  locationVenueName,
  locationLine,
  isVirtual,
  ageLabel,
  priceLabel,
}: CampMetaListProps) {
  const locationPrimary = locationVenueName ?? (isVirtual ? "Online event" : locationLine) ?? "";
  const hasLocation = !!(locationVenueName || locationLine);
  const mapsQuery = [locationVenueName, locationLine].filter(Boolean).join(", ");
  const mapsHref = !isVirtual && mapsQuery
    ? `https://maps.google.com/?q=${encodeURIComponent(mapsQuery)}`
    : undefined;

  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      {/* Date + time combined */}
      {dateLabel && (
        <CampMetaListItem
          icon="event"
          primary={dateLabel}
          description={timeLabel ?? undefined}
        />
      )}
      {/* Location */}
      {hasLocation && (
        <CampMetaListItem
          icon={isVirtual ? "wifi" : "assistant_navigation"}
          primary={locationPrimary}
          href={mapsHref}
        />
      )}
      {/* Age */}
      {ageLabel && <CampMetaListItem icon="mood" primary={ageLabel} />}
      {/* Price */}
      {priceLabel && <CampMetaListItem icon="paid" primary={priceLabel} />}
    </div>
  );
}
