"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { getHeroImage, getGalleryImages } from "@/lib/images";
import { useActivity } from "@/lib/activity-context";
import { Card, CardHeader, CardTitle, CardContent, CardAction } from "@/components/ui/card";
import { ActivityListItem } from "@/components/host/ActivityListItem";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function safeTimeZone(tz?: string | null): string | undefined {
  if (!tz) return undefined;
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date()); return tz; }
  catch { return undefined; }
}

function formatDate(d: Date, tz?: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: tz }).format(d);
}

function formatTime(d: Date, tz?: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz }).format(d);
}

function deriveDateRange(a: any) {
  const tz = safeTimeZone(a.schedule_tz);
  if (a.start_time || a.end_time) {
    const s = a.start_time ? new Date(a.start_time) : null;
    const e = a.end_time ? new Date(a.end_time) : null;
    if (s && e) { const sl = formatDate(s, tz); const el = formatDate(e, tz); return { value: sl !== el ? `${sl} – ${el}` : sl }; }
    if (s) return { value: formatDate(s, tz) };
    if (e) return { value: formatDate(e, tz) };
  }
  const fixed = a.meta?.fixedSchedule || {};
  const sm = fixed.startDate as string | undefined;
  const em = fixed.endDate as string | undefined;
  if (!sm && !em) return null;
  const s = sm ? new Date(sm) : null;
  const e = em ? new Date(em) : null;
  if (s && e) { const sl = formatDate(s, tz); const el = formatDate(e, tz); return { value: sl !== el ? `${sl} – ${el}` : sl }; }
  if (s) return { value: formatDate(s, tz) };
  if (e) return { value: formatDate(e, tz) };
  return null;
}

function deriveTimeLabel(a: any): string | null {
  const tz = safeTimeZone(a.schedule_tz);
  if (a.meta?.fixedSchedule?.allDay) return "All day";
  if (a.start_time && a.end_time) return `${formatTime(new Date(a.start_time), tz)} – ${formatTime(new Date(a.end_time), tz)}`;
  if (a.start_time) return formatTime(new Date(a.start_time), tz);
  const fs = a.meta?.fixedSchedule;
  if (fs?.startTime && fs?.endTime) {
    const toP = (v: string) => { const [h, m] = v.split(":").map(Number); const d = new Date(); d.setHours(h || 0, m || 0, 0, 0); return formatTime(d); };
    return `${toP(fs.startTime)} – ${toP(fs.endTime)}`;
  }
  return null;
}

function deriveAgeLabel(meta: any): string | null {
  const buckets: string[] = Array.isArray(meta?.age_buckets) ? meta.age_buckets : [];
  if (buckets.length) return buckets.join(", ");
  const bucket = meta?.age_bucket;
  if (bucket && bucket !== "all") return bucket;
  const min = meta?.min_age; const max = meta?.max_age;
  if (min != null && max != null) return `Ages ${min}–${max}`;
  if (min != null) return `Ages ${min}+`;
  if (max != null) return `Up to age ${max}`;
  return null;
}

function formatMoney(cents: number | null | undefined): string | null {
  if (cents == null) return null;
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function fmtSessionDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtSessionTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h >= 12 ? "PM" : "AM"}`;
}

function FieldRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="py-3 border-b border-border last:border-0">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Overview page                                                       */
/* ------------------------------------------------------------------ */

export default function OverviewPage() {
  const params = useParams<{ activityId: string }>();
  const activityId = params.activityId;
  const { activity, pendingBookings } = useActivity();

  if (!activity) return null;

  const meta = activity.meta ?? {};
  const dateRange = deriveDateRange(activity);
  const timeValue = deriveTimeLabel(activity);
  const cs = meta.classSchedule ?? {};
  const classPriceLabel: string | null = (() => {
    if (meta.activityKind !== "class") return null;
    if (cs.pricePerClass) return `$${cs.pricePerClass} / class`;
    if (cs.pricePerMeeting) return `$${cs.pricePerMeeting} / session`;
    return null;
  })();
  const isVirtual = Boolean(meta.isVirtual);
  const ageLabel = deriveAgeLabel(meta);
  const isPublished = meta.visibility === "public" || (meta.visibility == null && activity.is_published);
  const heroUrl = getHeroImage(activity);
  const galleryUrls = getGalleryImages(activity, { includeHero: false, max: 8 });
  const allPhotos = heroUrl ? [heroUrl, ...galleryUrls] : galleryUrls;
  const campSessions: any[] = Array.isArray(meta.campSessions) ? meta.campSessions : [];
  const itinerary: any[] = Array.isArray(meta.activities) ? meta.activities.filter((a: any) => a.title) : [];
  const advanced = meta.advanced ?? {};
  const earlyDropoff = advanced.earlyDropoff ?? {};
  const extendedDay = advanced.extendedDay ?? {};
  const siblingDiscount = advanced.siblingDiscount ?? {};
  const hasAddOns = earlyDropoff.enabled || extendedDay.enabled || siblingDiscount.enabled;
  const cancellationPolicy = meta.cancellation_policy;
  const activityKind: string = meta.activityKind ?? "camp";
  void classPriceLabel; void formatMoney; void isPublished; // used indirectly

  return (
    <div className="space-y-4">

      {/* Pending booking requests */}
      {pendingBookings.map(g => (
        <div key={g.id} className="flex items-center justify-between gap-4 rounded-card bg-card border border-border px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0 text-muted-foreground">
              {(g.parentName || "G").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-foreground">
                <span className="font-semibold">{g.parentName || g.parentEmail || "Someone"}</span>{" "}
                would like to book this {activityKind}.
              </p>
              {g.children && g.children.length > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">{g.children.map(c => c.name).join(", ")}</p>
              )}
            </div>
          </div>
          <Link href={`/host/activities/${activityId}/guests`}
            className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors">
            Review
          </Link>
        </div>
      ))}

      {/* Listing details */}
      <Card>
        <CardHeader>
          <CardTitle>Listing details</CardTitle>
          <CardAction><Link href={`/host/activities/${activityId}/edit?step=0`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Edit</Link></CardAction>
        </CardHeader>
        <CardContent>
          <FieldRow label="Activity Type" value={activityKind.charAt(0).toUpperCase() + activityKind.slice(1)} />
          <FieldRow label="Title" value={activity.name} />
          <FieldRow
            label={campSessions.length > 1 ? "Date and times" : "Date and time"}
            value={[
              dateRange?.value,
              meta.fixedSchedule?.days?.length
                ? meta.fixedSchedule.days.map((d: string) => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(", ")
                : null,
              timeValue,
            ].filter(Boolean).join(" · ") || null}
          />
          {isVirtual
            ? <FieldRow label="Location" value={meta.meetingUrl ? "Virtual (link set)" : "Virtual"} />
            : <FieldRow label="Location" value={activity.location} />
          }
          {meta.category && <FieldRow label="Category" value={meta.category} />}
          {ageLabel && <FieldRow label="Ages" value={ageLabel} />}
          <FieldRow label="Listing type" value={meta.visibility === "private" ? "Private" : isPublished ? "Public" : "Private"} />
        </CardContent>
      </Card>

      {/* Description */}
      {activity.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
            <CardAction><Link href={`/host/activities/${activityId}/edit?step=1`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Edit</Link></CardAction>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">About</p>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{activity.description}</p>
            </div>
            {itinerary.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">Highlights</p>
                <ul className="space-y-1">
                  {itinerary.map((act: any, i: number) => (
                    <li key={act.id ?? i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
                      {act.title}{act.description ? ` — ${act.description}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Schedule */}
      {campSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardAction><Link href={`/host/activities/${activityId}/edit?step=2`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Edit</Link></CardAction>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {campSessions.map((session: any, i: number) => {
                const name = session.name || `Session ${i + 1}`;
                const datePart = session.startDate
                  ? session.endDate && session.endDate !== session.startDate
                    ? `${fmtSessionDate(session.startDate)} – ${fmtSessionDate(session.endDate)}`
                    : fmtSessionDate(session.startDate)
                  : null;
                const timePart = session.startTime && session.endTime
                  ? `from ${fmtSessionTime(session.startTime)} to ${fmtSessionTime(session.endTime)}`
                  : null;
                const subtitle = [datePart, timePart].filter(Boolean).join(", ");
                const cap = session.capacity ? parseInt(String(session.capacity), 10) : null;
                const badge = cap != null && !isNaN(cap) ? { label: `${cap} spots`, color: "muted" as const } : undefined;
                return (
                  <ActivityListItem key={session.id ?? i} title={name} subtitle={subtitle || undefined} badge={badge} />
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add-ons */}
      {hasAddOns && (
        <Card>
          <CardHeader>
            <CardTitle>Add-ons</CardTitle>
            <CardAction><Link href={`/host/activities/${activityId}/edit?step=4`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Edit</Link></CardAction>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {earlyDropoff.enabled && (
                <ActivityListItem title="Early drop-off"
                  subtitle={earlyDropoff.start && earlyDropoff.end ? `${earlyDropoff.start} – ${earlyDropoff.end}` : undefined}
                  badge={earlyDropoff.price ? { label: `$${earlyDropoff.price}`, color: "muted" } : undefined} />
              )}
              {extendedDay.enabled && (
                <ActivityListItem title="Extended day"
                  subtitle={extendedDay.start && extendedDay.end ? `${extendedDay.start} – ${extendedDay.end}` : undefined}
                  badge={extendedDay.price ? { label: `$${extendedDay.price}`, color: "muted" } : undefined} />
              )}
              {siblingDiscount.enabled && (
                <ActivityListItem title="Sibling discount"
                  badge={{ label: siblingDiscount.type === "percent" ? `${siblingDiscount.value ?? "—"}% off` : siblingDiscount.type === "amount" ? `$${siblingDiscount.value ?? "—"} off` : "Enabled", color: "muted" }} />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photos */}
      {allPhotos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Photos ({allPhotos.length})</CardTitle>
            <CardAction><Link href={`/host/activities/${activityId}/edit?step=3`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Edit</Link></CardAction>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {allPhotos.slice(0, 8).map((url, i) => (
                <div key={url} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                  {i === 0 && <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">Cover</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancellation */}
      {cancellationPolicy && (
        <Card>
          <CardHeader>
            <CardTitle>Cancellation policy</CardTitle>
            <CardAction><Link href={`/host/activities/${activityId}/edit?step=4`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Edit</Link></CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{cancellationPolicy}</p>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
