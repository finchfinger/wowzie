"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { MessageSquare, ChevronLeft, CheckCircle2, XCircle, Timer, AlertTriangle } from "lucide-react";

/* ── Types ──────────────────────────────────────────── */

type BookingStatus = "pending" | "confirmed" | "declined" | "cancelled" | "expired";

type Child = {
  id: string;
  legal_name: string;
  preferred_name: string | null;
  birthdate: string | null;
  age_years: number | null;
  avatar_emoji: string | null;
  allergies: string | null;
  immunization_notes: string | null;
  medications: string | null;
};

type GuestDetail = {
  bookingId: string;
  status: BookingStatus;
  guestsCount: number;
  contactEmail: string | null;
  totalCents: number | null;
  createdAt: string;
  /* parent */
  parentId: string;
  parentName: string | null;
  parentEmail: string | null;
  parentPhone: string | null;
  /* children (may be empty) */
  children: Child[];
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
  return raw.split(/[,\n;]+/).map((s) => s.trim()).filter(Boolean);
}

function formatMoney(cents: number | null): string | null {
  if (cents == null) return null;
  return `$${(cents / 100).toFixed(2)}`;
}

/* ── Approval Banner ─────────────────────────────────── */

function ApprovalBanner({
  status, busy, onApprove, onDecline,
}: {
  status: BookingStatus; busy: boolean; onApprove: () => void; onDecline: () => void;
}) {
  if (status === "confirmed") return (
    <div className="flex items-center gap-2 rounded-card bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-800">
      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      <p>This booking has been <span className="font-medium">confirmed</span>.</p>
    </div>
  );
  if (status === "declined") return (
    <div className="flex items-center gap-2 rounded-card bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-800">
      <XCircle className="h-4 w-4 text-red-600" />
      <p>This booking has been <span className="font-medium">declined</span>.</p>
    </div>
  );
  if (status === "cancelled" || status === "expired") return (
    <div className="flex items-center gap-2 rounded-card bg-muted px-4 py-3 text-xs text-muted-foreground">
      <XCircle className="h-4 w-4" />
      <p>This booking was <span className="font-medium">{status}</span>.</p>
    </div>
  );
  // pending
  return (
    <div className="flex items-center justify-between gap-4 rounded-card bg-amber-50 border border-amber-200 px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-amber-900">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <p>This booking is <span className="font-medium">pending approval</span>.</p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onDecline} disabled={busy}
          className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">
          Decline
        </button>
        <button type="button" onClick={onApprove} disabled={busy}
          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50">
          Approve ✓
        </button>
      </div>
    </div>
  );
}

/* ── Info Section ────────────────────────────────────── */

function InfoSection({ title, rows }: { title: string; rows: Array<{ label: string; value: React.ReactNode }>; }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="rounded-card bg-card divide-y divide-border/40">
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
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

/* ── Child Card ──────────────────────────────────────── */

function ChildCard({ child }: { child: Child }) {
  const age = child.age_years ?? computeAge(child.birthdate);
  const displayName = child.preferred_name
    ? `${child.preferred_name} (${child.legal_name})`
    : child.legal_name;
  return (
    <div className="rounded-card bg-card divide-y divide-border/40">
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-lg shrink-0">
          {child.avatar_emoji || "🧒"}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{displayName}</p>
          {age != null && <p className="text-xs text-muted-foreground">Age {age} · {formatBirthdate(child.birthdate)}</p>}
        </div>
      </div>
      <div className="px-5 py-3 flex items-start gap-4">
        <span className="w-32 shrink-0 text-xs text-muted-foreground pt-0.5">Allergies</span>
        <span className="text-xs text-foreground"><HealthList items={parseList(child.allergies)} /></span>
      </div>
      <div className="px-5 py-3 flex items-start gap-4">
        <span className="w-32 shrink-0 text-xs text-muted-foreground pt-0.5">Medications</span>
        <span className="text-xs text-foreground"><HealthList items={parseList(child.medications)} /></span>
      </div>
      {child.immunization_notes?.trim() && (
        <div className="px-5 py-3 flex items-start gap-4">
          <span className="w-32 shrink-0 text-xs text-muted-foreground pt-0.5">Notes</span>
          <span className="text-xs text-foreground whitespace-pre-line">{child.immunization_notes}</span>
        </div>
      )}
    </div>
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

      /* 1. Load booking from bookings table */
      const { data: booking, error: bErr } = await supabase
        .from("bookings")
        .select("id, status, user_id, guests_count, total_cents, contact_email, created_at")
        .eq("id", bookingId)
        .eq("camp_id", activityId)
        .single();

      if (!alive) return;
      if (bErr || !booking) {
        setError("Could not load booking details.");
        setLoading(false);
        return;
      }

      /* 2. Load parent profile */
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, legal_name, preferred_first_name, email, phone")
        .eq("id", booking.user_id)
        .maybeSingle();

      /* 3. Load parent's children */
      const { data: childRows } = await supabase
        .from("children")
        .select("id, legal_name, preferred_name, birthdate, age_years, avatar_emoji, allergies, immunization_notes, medications")
        .eq("parent_id", booking.user_id)
        .order("created_at", { ascending: true });

      if (!alive) return;

      const p = profile as any;
      const parentName = p?.preferred_first_name
        ? `${p.preferred_first_name} ${p.legal_name ?? ""}`.trim()
        : p?.legal_name ?? null;

      setGuest({
        bookingId: booking.id,
        status: booking.status as BookingStatus,
        guestsCount: booking.guests_count ?? 1,
        contactEmail: booking.contact_email ?? null,
        totalCents: booking.total_cents ?? null,
        createdAt: booking.created_at,
        parentId: booking.user_id,
        parentName,
        parentEmail: p?.email ?? booking.contact_email ?? null,
        parentPhone: p?.phone ?? null,
        children: (childRows ?? []) as Child[],
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
      .from("bookings")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", bookingId);
    setBusy(false);
    if (error) {
      setGuest((g) => g ? { ...g, status: prev } : g);
      toast.error("Could not update status. Please try again.");
    } else {
      toast.success(status === "confirmed" ? "Booking approved ✓" : "Booking declined");
    }
  };

  const handleMessage = async () => {
    if (!guest?.parentId) return;
    const { data: convData } = await supabase.functions.invoke("get-or-create-conversation", {
      body: { to_profile_id: guest.parentId },
    });
    const convId = convData?.conversation?.id ?? convData?.conversation_id ?? null;
    if (convId) {
      router.push(`/messages?c=${encodeURIComponent(convId)}`);
    } else {
      router.push(`/messages?to=${encodeURIComponent(guest.parentId)}`);
    }
  };

  /* ── States ── */

  if (loading) return (
    <div className="max-w-screen-md mx-auto px-4 sm:px-6 py-10 space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-card bg-muted animate-pulse" />)}
    </div>
  );

  if (error || !guest) return (
    <div className="max-w-screen-md mx-auto px-4 sm:px-6 py-10">
      <p className="text-sm text-destructive mb-4">{error ?? "Booking not found."}</p>
      <Link href={`/host/activities/${activityId}`} className="text-xs text-muted-foreground hover:text-foreground">
        ← Back to activity
      </Link>
    </div>
  );

  const displayName = guest.parentName || guest.parentEmail || "Guest";
  const initial = displayName[0]?.toUpperCase() ?? "G";

  return (
    <div className="max-w-screen-md mx-auto px-4 sm:px-6 py-8 space-y-6">

      {/* Back link */}
      <Link href={`/host/activities/${activityId}`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to activity
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 flex items-center justify-center rounded-full bg-violet-100 text-lg font-bold text-violet-700 shrink-0">
            {initial}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{displayName}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {guest.guestsCount} {guest.guestsCount === 1 ? "guest" : "guests"}
              {guest.totalCents ? ` · ${formatMoney(guest.totalCents)}` : ""}
            </p>
          </div>
        </div>
        <button type="button" onClick={() => void handleMessage()}
          className="inline-flex items-center gap-2 rounded-lg bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">
          <MessageSquare className="h-4 w-4" />
          Message
        </button>
      </div>

      {/* Approval banner */}
      <ApprovalBanner
        status={guest.status}
        busy={busy}
        onApprove={() => void updateStatus("confirmed")}
        onDecline={() => void updateStatus("declined")}
      />

      {/* Contact info */}
      <InfoSection
        title="Contact"
        rows={[
          {
            label: "Email",
            value: guest.parentEmail
              ? <a href={`mailto:${guest.parentEmail}`} className="text-primary hover:underline">{guest.parentEmail}</a>
              : <span className="text-muted-foreground">Not provided</span>,
          },
          {
            label: "Phone",
            value: guest.parentPhone
              ? <a href={`tel:${guest.parentPhone}`} className="text-primary hover:underline">{guest.parentPhone}</a>
              : <span className="text-muted-foreground">Not provided</span>,
          },
        ]}
      />

      {/* Children */}
      {guest.children.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            {guest.children.length === 1 ? "Child" : `Children (${guest.children.length})`}
          </h2>
          {guest.children.map((child) => <ChildCard key={child.id} child={child} />)}
        </section>
      )}

      {guest.children.length === 0 && (
        <div className="rounded-card bg-muted/50 px-5 py-4 text-xs text-muted-foreground">
          No child profiles on file for this parent.
        </div>
      )}

    </div>
  );
}
