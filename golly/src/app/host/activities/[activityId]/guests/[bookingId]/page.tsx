"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { MessageSquare, ChevronLeft } from "lucide-react";

/* ── Types ──────────────────────────────────────────── */

type BookingStatus = "pending" | "confirmed" | "declined" | "waitlisted";

type GuestDetail = {
  bookingId: string;
  status: BookingStatus;
  // Child
  childId: string;
  legalName: string;
  preferredName: string | null;
  birthdate: string | null;
  ageYears: number | null;
  avatarEmoji: string | null;
  allergies: string | null;
  immunizationNotes: string | null;
  medications: string | null;
  // Parent
  parentId: string;
  parentName: string | null;
  parentEmail: string | null;
  parentPhone: string | null;
};

/* ── Helpers ─────────────────────────────────────────── */

function computeAge(birthdate: string | null): number | null {
  if (!birthdate) return null;
  const b = new Date(birthdate);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1;
  return age;
}

function formatBirthdate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function parseList(raw: string | null): string[] {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(/[,\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/* ── Approval Banner ─────────────────────────────────── */

function ApprovalBanner({
  status,
  busy,
  onApprove,
  onDecline,
}: {
  status: BookingStatus;
  busy: boolean;
  onApprove: () => void;
  onDecline: () => void;
}) {
  if (status === "confirmed") {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-800">
        <span className="text-base">✅</span>
        <p>This guest has been <span className="font-medium">confirmed</span>.</p>
      </div>
    );
  }

  if (status === "declined") {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-800">
        <span className="text-base">❌</span>
        <p>This guest has been <span className="font-medium">declined</span>.</p>
      </div>
    );
  }

  if (status === "waitlisted") {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
        <span className="text-base">⏳</span>
        <p>This guest is on the <span className="font-medium">waitlist</span>.</p>
      </div>
    );
  }

  // pending
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-amber-900">
        <span className="text-base">⚠️</span>
        <p>This guest is <span className="font-medium">pending approval</span>.</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDecline}
          disabled={busy}
          className="rounded-full border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={onApprove}
          disabled={busy}
          className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          Approve ✓
        </button>
      </div>
    </div>
  );
}

/* ── Info Section ────────────────────────────────────── */

function InfoSection({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: React.ReactNode }>;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="rounded-2xl bg-card border border-border/50 divide-y divide-border/40">
        {rows.map(({ label, value }) => (
          <div key={label} className="px-5 py-3 flex items-start gap-4">
            <span className="w-36 shrink-0 text-xs text-muted-foreground pt-0.5">{label}</span>
            <span className="text-xs text-foreground">{value || "—"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Health List ─────────────────────────────────────── */

function HealthList({ items, emptyLabel }: { items: string[]; emptyLabel?: string }) {
  if (!items.length) return <span className="text-muted-foreground">{emptyLabel ?? "None"}</span>;
  return (
    <ul className="list-disc pl-4 space-y-0.5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/* ── Main Page ───────────────────────────────────────── */

export default function GuestDetailPage() {
  const params = useParams<{ activityId: string; bookingId: string }>();
  const router = useRouter();
  const { activityId, bookingId } = params;

  const [guest, setGuest] = useState<GuestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      // Load booking + child + parent profile in one go
      const { data, error: dbError } = await supabase
        .from("camp_bookings")
        .select(`
          id,
          status,
          parent_id,
          child_id,
          child:children!camp_bookings_child_id_fkey (
            id,
            legal_name,
            preferred_name,
            birthdate,
            age_years,
            avatar_emoji,
            allergies,
            immunization_notes,
            medications
          ),
          parent:profiles!camp_bookings_parent_id_fkey (
            id,
            legal_name,
            preferred_first_name,
            email,
            phone
          )
        `)
        .eq("id", bookingId)
        .eq("camp_id", activityId)
        .single();

      if (!alive) return;

      if (dbError || !data) {
        setError("Could not load guest details.");
        setLoading(false);
        return;
      }

      const child = data.child as any;
      const parent = data.parent as any;

      setGuest({
        bookingId: data.id,
        status: data.status as BookingStatus,
        childId: child?.id ?? data.child_id ?? "",
        legalName: child?.legal_name ?? "Unknown",
        preferredName: child?.preferred_name ?? null,
        birthdate: child?.birthdate ?? null,
        ageYears: child?.age_years ?? null,
        avatarEmoji: child?.avatar_emoji ?? null,
        allergies: child?.allergies ?? null,
        immunizationNotes: child?.immunization_notes ?? null,
        medications: child?.medications ?? null,
        parentId: data.parent_id,
        parentName: parent?.preferred_first_name
          ? `${parent.preferred_first_name} ${parent.legal_name ?? ""}`.trim()
          : parent?.legal_name ?? null,
        parentEmail: parent?.email ?? null,
        parentPhone: parent?.phone ?? null,
      });
      setLoading(false);
    };

    void load();
    return () => { alive = false; };
  }, [activityId, bookingId]);

  const updateStatus = async (status: BookingStatus) => {
    if (!guest || busy) return;
    setBusy(true);
    const prev = guest.status;
    setGuest((g) => g ? { ...g, status } : g);

    const { error } = await supabase
      .from("camp_bookings")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", bookingId);

    setBusy(false);

    if (error) {
      setGuest((g) => g ? { ...g, status: prev } : g);
      toast.error("Could not update status. Please try again.");
    } else {
      toast.success(status === "confirmed" ? "Guest approved ✓" : "Guest declined");
    }
  };

  const handleMessage = async () => {
    if (!guest?.parentId) return;
    // Get or create a conversation with the parent
    const { data: convData } = await supabase.functions.invoke("get-or-create-conversation", {
      body: { participant_profile_ids: [guest.parentId] },
    });
    if (convData?.conversation_id) {
      router.push(`/messages?c=${encodeURIComponent(convData.conversation_id)}`);
    } else {
      router.push(`/messages?to=${encodeURIComponent(guest.parentId)}`);
    }
  };

  /* ── States ── */

  if (loading) {
    return (
      <div className="max-w-screen-md mx-auto px-4 sm:px-6 py-10 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !guest) {
    return (
      <div className="max-w-screen-md mx-auto px-4 sm:px-6 py-10">
        <p className="text-sm text-destructive mb-4">{error ?? "Guest not found."}</p>
        <Link
          href={`/host/activities/${activityId}`}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Back to activity
        </Link>
      </div>
    );
  }

  const age = guest.ageYears ?? computeAge(guest.birthdate);
  const displayName = guest.preferredName
    ? `${guest.preferredName} (${guest.legalName})`
    : guest.legalName;

  return (
    <div className="max-w-screen-md mx-auto px-4 sm:px-6 py-8 space-y-6">

      {/* Back link */}
      <Link
        href={`/host/activities/${activityId}`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to activity
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 flex items-center justify-center rounded-full bg-amber-100 text-2xl shrink-0">
            {guest.avatarEmoji || "🧒"}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{displayName}</h1>
            {age != null && (
              <p className="text-xs text-muted-foreground mt-0.5">Age {age}</p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleMessage()}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <MessageSquare className="h-4 w-4" />
          Message parent
        </button>
      </div>

      {/* Approval banner */}
      <ApprovalBanner
        status={guest.status}
        busy={busy}
        onApprove={() => void updateStatus("confirmed")}
        onDecline={() => void updateStatus("declined")}
      />

      {/* Basic information */}
      <InfoSection
        title="Basic information"
        rows={[
          { label: "Legal name", value: guest.legalName },
          {
            label: "Preferred name",
            value: guest.preferredName ?? <span className="text-muted-foreground">Not set</span>,
          },
          {
            label: "Birthday",
            value: (
              <span>
                {formatBirthdate(guest.birthdate)}
                {age != null && (
                  <span className="text-muted-foreground ml-2">(Age {age})</span>
                )}
              </span>
            ),
          },
          {
            label: "Parent / guardian",
            value: guest.parentName ?? <span className="text-muted-foreground">Unknown</span>,
          },
        ]}
      />

      {/* Contact information */}
      <InfoSection
        title="Contact information"
        rows={[
          {
            label: "Phone",
            value: guest.parentPhone
              ? <a href={`tel:${guest.parentPhone}`} className="text-primary hover:underline">{guest.parentPhone}</a>
              : <span className="text-muted-foreground">Not provided</span>,
          },
          {
            label: "Email",
            value: guest.parentEmail
              ? <a href={`mailto:${guest.parentEmail}`} className="text-primary hover:underline">{guest.parentEmail}</a>
              : <span className="text-muted-foreground">Not provided</span>,
          },
        ]}
      />

      {/* Health & safety */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Health &amp; safety</h2>
        <div className="rounded-2xl bg-card border border-border/50 divide-y divide-border/40">
          <div className="px-5 py-3 flex items-start gap-4">
            <span className="w-36 shrink-0 text-xs text-muted-foreground pt-0.5">Allergies</span>
            <span className="text-xs text-foreground">
              <HealthList items={parseList(guest.allergies)} />
            </span>
          </div>
          <div className="px-5 py-3 flex items-start gap-4">
            <span className="w-36 shrink-0 text-xs text-muted-foreground pt-0.5">Medications</span>
            <span className="text-xs text-foreground">
              <HealthList items={parseList(guest.medications)} />
            </span>
          </div>
          <div className="px-5 py-3 flex items-start gap-4">
            <span className="w-36 shrink-0 text-xs text-muted-foreground pt-0.5">Immunization notes</span>
            <span className="text-xs text-foreground">
              {guest.immunizationNotes?.trim()
                ? <p className="whitespace-pre-line">{guest.immunizationNotes}</p>
                : <span className="text-muted-foreground">None</span>
              }
            </span>
          </div>
        </div>
      </section>

    </div>
  );
}
