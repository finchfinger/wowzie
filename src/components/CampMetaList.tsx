import React from "react";

export type CampMetaListItemProps = {
  icon: string;
  primary: React.ReactNode;
  description?: React.ReactNode;
  href?: string;
  iconSize?: number;
};

export function CampMetaListItem({ icon, primary, description, href, iconSize = 24 }: CampMetaListItemProps) {
  return (
    <div className="flex items-center py-2" style={{ gap: 12 }}>
      {/* Icon */}
      <span
        className="material-symbols-outlined select-none shrink-0"
        style={{ fontSize: iconSize, lineHeight: 1, color: "rgba(0,0,0,0.8)" }}
        aria-hidden
      >
        {icon}
      </span>

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
              className="material-symbols-outlined select-none"
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
  ageDescription?: string | null;
  priceLabel?: string | null;
  priceDescription?: string | null;
};

export function CampMetaList({
  dateLabel,
  timeLabel,
  locationVenueName,
  locationLine,
  isVirtual,
  ageLabel,
  ageDescription,
  priceLabel,
  priceDescription,
}: CampMetaListProps) {
  const locationPrimary = locationVenueName ?? (isVirtual ? "Online event" : locationLine) ?? "";
  const hasLocation = !!(locationVenueName || locationLine);
  const mapsQuery = [locationVenueName, locationLine].filter(Boolean).join(", ");
  const mapsHref = !isVirtual && mapsQuery
    ? `https://maps.google.com/?q=${encodeURIComponent(mapsQuery)}`
    : undefined;

  return (
    <div className="flex flex-col divide-y divide-black/10">
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
          description={locationVenueName ? (locationLine ?? undefined) : undefined}
          href={mapsHref}
        />
      )}
      {/* Age */}
      {ageLabel && (
        <CampMetaListItem icon="mood" primary={ageLabel} description={ageDescription ?? undefined} />
      )}
      {/* Price */}
      {priceLabel && (
        <CampMetaListItem icon="savings" primary={priceLabel} description={priceDescription ?? undefined} />
      )}
    </div>
  );
}
