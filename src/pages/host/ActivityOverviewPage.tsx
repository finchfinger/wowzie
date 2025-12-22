// src/pages/host/ActivityOverviewPage.tsx
import React from "react";
import { useOutletContext } from "react-router-dom";
import type {
  Activity,
  ActivityOutletContext,
} from "./ActivityLayoutPage";
import { InfoRow } from "../../components/host/InfoRow";

// Simple emoji icons (you can swap these later for real icons)
const CalendarIcon = () => <span className="text-base">📅</span>;
const ClockIcon = () => <span className="text-base">⏰</span>;
const PriceIcon = () => <span className="text-base">$</span>;
const HostIcon = () => <span className="text-base">👤</span>;
const LocationIcon = () => <span className="text-base">📍</span>;
const PeopleIcon = () => <span className="text-base">👨‍👩‍👧‍👦</span>;
const LockIcon = () => <span className="text-base">🔒</span>;

const formatDateRangeLabel = (meta: any): { heading: string; value: string } => {
  const fixed = meta?.fixedSchedule || {};
  const start = fixed.startDate as string | undefined;
  const end = fixed.endDate as string | undefined;

  if (!start && !end) {
    return {
      heading: "Date",
      value: "Date to be announced",
    };
  }

  const toPretty = (value: string | undefined) => {
    if (!value) return "";
    const d = new Date(value);
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  if (start && end && start !== end) {
    return {
      heading: "Dates",
      value: `${toPretty(start)} – ${toPretty(end)}`,
    };
  }

  // Single date case
  return {
    heading: "Date",
    value: toPretty(start || end || ""),
  };
};

const formatTimeRangeLabel = (meta: any): string => {
  const fixed = meta?.fixedSchedule || {};
  const startTime = fixed.startTime as string | undefined;
  const endTime = fixed.endTime as string | undefined;

  if (!startTime && !endTime) return "Time to be announced";

  const toPretty = (value: string | undefined) => {
    if (!value) return "";
    const [h, m] = value.split(":").map((v) => Number(v));
    const d = new Date();
    d.setHours(h || 0, m || 0, 0, 0);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (startTime && endTime) {
    return `${toPretty(startTime)} – ${toPretty(endTime)}`;
  }

  return toPretty(startTime || endTime || "");
};

const formatPrice = (activity: Activity): string => {
  const pricing = activity.meta?.pricing;
  if (pricing?.display) {
    const cleaned = pricing.display.replace(/^\$/, "");
    return `$${cleaned}`;
  }

  if (typeof activity.price_cents === "number") {
    const dollars = activity.price_cents / 100;
    return `$${dollars.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })}`;
  }

  return "$—";
};

const formatListingType = (activity: Activity): string => {
  const visibility = activity.meta?.visibility as
    | "public"
    | "private"
    | undefined;

  if (visibility === "public") return "Public";
  if (visibility === "private") return "Private";

  return activity.is_published ? "Public" : "Private";
};

export const ActivityOverviewPage: React.FC = () => {
  const { activity, loading, error } =
    useOutletContext<ActivityOutletContext>();

  if (loading) {
    return (
      <p className="text-xs text-gray-500">Loading activity details…</p>
    );
  }

  if (error) {
    return <p className="text-xs text-red-600">{error}</p>;
  }

  if (!activity) {
    return (
      <p className="text-xs text-red-600">
        No activity found for this id.
      </p>
    );
  }

  const { meta } = activity;
  const { heading: dateHeading, value: dateValue } =
    formatDateRangeLabel(meta);
  const timeValue = formatTimeRangeLabel(meta);
  const priceValue = formatPrice(activity);
  const listingType = formatListingType(activity);
  const location = activity.location || "Location to be announced";

  // Placeholder until you wire real registration data
  const registrationsCurrent =
    meta?.registrations_current ?? 6;
  const registrationsCapacity =
    meta?.registrations_capacity ?? 12;
  const registrationsLabel = `${registrationsCurrent} of ${registrationsCapacity}`;

  const hostName =
    meta?.host_name || "Stephanie Henry";

  return (
    <section className="pt-2">
      <div className="grid gap-8 md:grid-cols-2 text-sm">
        {/* LEFT COLUMN */}
        <div className="space-y-4">
          <InfoRow
            icon={<CalendarIcon />}
            label={dateHeading}
            value={dateValue}
          />
          <InfoRow
            icon={<ClockIcon />}
            label="Time"
            value={timeValue}
          />
          <InfoRow
            icon={<PriceIcon />}
            label="Price per child"
            value={priceValue}
          />
          <InfoRow
            icon={<HostIcon />}
            label="Host"
            value={hostName}
          />
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          <InfoRow
            icon={<LocationIcon />}
            label="Location"
            value={location}
          />
          <InfoRow
            icon={<PeopleIcon />}
            label="Registrations"
            value={registrationsLabel}
          />
          <InfoRow
            icon={<LockIcon />}
            label="Listing type"
            value={listingType}
          />
        </div>
      </div>
    </section>
  );
};

export default ActivityOverviewPage;
