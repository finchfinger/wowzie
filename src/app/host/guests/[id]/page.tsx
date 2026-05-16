"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { UserAvatar } from "@/components/ui/UserAvatar";

/* ── Types ───────────────────────────────────────────── */

type Contact = {
  id: string;
  parent_name: string;
  email: string;
  phone: string | null;
  children_count: number;
  last_activity_name: string | null;
};

type Child = {
  id: string;
  legal_name: string;
  preferred_name: string | null;
  birthdate: string | null;
  avatar_emoji: string | null;
  allergies: string | null;
  medications: string | null;
  immunization_notes: string | null;
};

type Booking = {
  id: string;
  created_at: string;
  status: string;
  payment_status: string | null;
  total_cents: number | null;
  guests_count: number | null;
  stripe_payment_intent: string | null;
  camps: { name: string } | null;
};

/* ── Helpers ─────────────────────────────────────────── */

function computeAge(birthdate: string | null): number | null {
  if (!birthdate) return null;
  const b = new Date(birthdate);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() - b.getMonth() < 0 ||
      (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
  return age;
}

function parseList(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw.split(/[,\n;]+/).map((s) => s.trim()).filter(Boolean);
}

const fmt = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function statusPill(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    confirmed:  { label: "Confirmed",  className: "bg-emerald-100 text-emerald-700" },
    pending:    { label: "Pending",    className: "bg-amber-100 text-amber-700" },
    cancelled:  { label: "Cancelled",  className: "bg-muted text-muted-foreground" },
    refunded:   { label: "Refunded",   className: "bg-muted text-muted-foreground" },
    waitlisted: { label: "Waitlisted", className: "bg-blue-100 text-blue-700" },
  };
  const { label, className } = map[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

/* ── Refund Modal ─────────────────────────────────────── */

function RefundModal({
  booking,
  onClose,
  onRefunded,
}: {
  booking: Booking;
  onClose: () => void;
  onRefunded: (bookingId: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const campName = booking.camps?.name ?? "this activity";
  const total = booking.total_cents ?? 0;

  const handleRefund = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/bookings/refund", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Refund failed.");
      onRefunded(booking.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">Issue refund</h2>
          <p className="text-sm text-muted-foreground">
            This will refund the full amount to the parent's original payment method.
          </p>
        </div>

        {/* Summary */}
        <div className="rounded-xl bg-muted/50 divide-y divide-border/50">
          <div className="px-4 py-3 flex justify-between text-sm">
            <span className="text-muted-foreground">Activity</span>
            <span className="font-medium text-foreground">{campName}</span>
          </div>
          <div className="px-4 py-3 flex justify-between text-sm">
            <span className="text-muted-foreground">Refund amount</span>
            <span className="font-semibold text-foreground">{fmt(total)}</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Refunds typically appear on the parent's statement within 5–10 business days. The amount will be deducted from your Stripe balance.
        </p>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRefund}
            disabled={loading}
            className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Processing…" : `Refund ${fmt(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Child Card ──────────────────────────────────────── */

function ChildCard({ child }: { child: Child }) {
  const age = computeAge(child.birthdate);
  const name = child.preferred_name
    ? `${child.preferred_name} (${child.legal_name})`
    : child.legal_name;
  const allergies = parseList(child.allergies);
  const medications = parseList(child.medications);

  return (
    <div className="rounded-card bg-card divide-y divide-border/40">
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center text-lg shrink-0">
          {child.avatar_emoji || "🧒"}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{name}</p>
          {age != null && (
            <p className="text-xs text-muted-foreground">Age {age}</p>
          )}
        </div>
      </div>
      <div className="px-5 py-3 flex items-start gap-4">
        <span className="w-28 shrink-0 text-xs text-muted-foreground pt-0.5">Allergies</span>
        <span className="text-xs text-foreground">
          {allergies.length ? (
            <ul className="list-disc pl-4 space-y-0.5">
              {allergies.map((a) => <li key={a}>{a}</li>)}
            </ul>
          ) : <span className="text-muted-foreground">None</span>}
        </span>
      </div>
      <div className="px-5 py-3 flex items-start gap-4">
        <span className="w-28 shrink-0 text-xs text-muted-foreground pt-0.5">Medications</span>
        <span className="text-xs text-foreground">
          {medications.length ? (
            <ul className="list-disc pl-4 space-y-0.5">
              {medications.map((m) => <li key={m}>{m}</li>)}
            </ul>
          ) : <span className="text-muted-foreground">None</span>}
        </span>
      </div>
      {child.immunization_notes?.trim() && (
        <div className="px-5 py-3 flex items-start gap-4">
          <span className="w-28 shrink-0 text-xs text-muted-foreground pt-0.5">Notes</span>
          <span className="text-xs text-foreground whitespace-pre-line">{child.immunization_notes}</span>
        </div>
      )}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────── */

export default function GuestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [contact, setContact] = useState<Contact | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<Booking | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { router.replace("/"); return; }

      /* 1. Load the host_contacts record */
      const { data: contactData, error: cErr } = await supabase
        .from("host_contacts")
        .select("id, parent_name, email, phone, children_count, last_activity_name")
        .eq("id", id)
        .eq("host_id", userData.user.id)
        .maybeSingle();

      if (!alive) return;
      if (cErr || !contactData) {
        setError("We couldn't find this guest.");
        setLoading(false);
        return;
      }
      setContact(contactData as Contact);

      /* 2. Load bookings for this guest across host's camps */
      if (contactData.email) {
        const { data: bookingData } = await supabase
          .from("bookings")
          .select("id, created_at, status, payment_status, total_cents, guests_count, stripe_payment_intent, camps:camp_id(name, host_id)")
          .eq("contact_email", contactData.email)
          .order("created_at", { ascending: false });

        if (alive) {
          const mine = ((bookingData ?? []) as unknown as Booking[]).filter(
            (b) => (b.camps as any)?.host_id === userData.user!.id
          );
          setBookings(mine);
        }

        /* 3. Find a matching profile by email to get their user ID for children */
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", contactData.email)
          .maybeSingle();

        if (!alive) return;

        if (profileData?.id) {
          const { data: childData } = await supabase
            .from("children")
            .select("id, legal_name, preferred_name, birthdate, avatar_emoji, allergies, medications, immunization_notes")
            .eq("parent_id", profileData.id)
            .order("created_at", { ascending: true });

          if (alive) setChildren((childData ?? []) as Child[]);
        }
      }

      setLoading(false);
    };
    void load();
    return () => { alive = false; };
  }, [id, router]);

  const handleRefunded = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => b.id === bookingId ? { ...b, status: "refunded", payment_status: "refunded" } : b)
    );
  };

  if (loading) {
    return (
      <div className="mt-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 rounded-card bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="mt-6">
        <p className="text-sm text-destructive mb-4">{error ?? "Guest not found."}</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <span className="material-symbols-outlined select-none" style={{ fontSize: 14 }} aria-hidden>chevron_left</span> Back
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-6">
      {/* Back */}
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="material-symbols-outlined select-none" style={{ fontSize: 14 }} aria-hidden>chevron_left</span>
        All guests
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <UserAvatar name={contact.parent_name} size={48} />
          <div>
            <h2 className="text-lg font-semibold text-foreground">{contact.parent_name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {contact.children_count === 1 ? "1 child" : `${contact.children_count} children`}
              {contact.last_activity_name && ` · ${contact.last_activity_name}`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/messages?to=${contact.id}`)}
          className="inline-flex items-center gap-2 rounded-lg bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors shrink-0"
        >
          <span className="material-symbols-outlined select-none" style={{ fontSize: 16 }} aria-hidden>chat</span>
          Message
        </button>
      </div>

      {/* Contact info */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Contact</h3>
        <div className="rounded-card bg-card divide-y divide-border/40">
          <div className="px-5 py-3 flex items-start gap-4">
            <span className="w-20 shrink-0 text-xs text-muted-foreground pt-0.5">Email</span>
            {contact.email ? (
              <a href={`mailto:${contact.email}`} className="text-xs text-primary hover:underline">
                {contact.email}
              </a>
            ) : (
              <span className="text-xs text-muted-foreground">Not provided</span>
            )}
          </div>
          <div className="px-5 py-3 flex items-start gap-4">
            <span className="w-20 shrink-0 text-xs text-muted-foreground pt-0.5">Phone</span>
            {contact.phone ? (
              <a href={`tel:${contact.phone}`} className="text-xs text-primary hover:underline">
                {contact.phone}
              </a>
            ) : (
              <span className="text-xs text-muted-foreground">Not provided</span>
            )}
          </div>
        </div>
      </section>

      {/* Bookings */}
      {bookings.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Bookings</h3>
          <div className="rounded-card bg-card divide-y divide-border/40">
            {bookings.map((b) => {
              const canRefund = b.status === "confirmed" && !!b.stripe_payment_intent;
              return (
                <div key={b.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-medium text-foreground truncate">
                      {(b.camps as any)?.name ?? "Unknown activity"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDate(b.created_at)}
                      {b.guests_count && b.guests_count > 1 ? ` · ${b.guests_count} kids` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {statusPill(b.status)}
                    {b.total_cents && (
                      <span className="text-sm font-medium text-foreground">{fmt(b.total_cents)}</span>
                    )}
                    {canRefund && (
                      <button
                        type="button"
                        onClick={() => setRefundTarget(b)}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors border border-border rounded-lg px-2.5 py-1"
                      >
                        Refund
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Children */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          {children.length === 0
            ? "Children"
            : children.length === 1
            ? "Child"
            : `Children (${children.length})`}
        </h3>
        {children.length > 0 ? (
          children.map((child) => <ChildCard key={child.id} child={child} />)
        ) : (
          <div className="rounded-card bg-muted/50 px-5 py-4 text-xs text-muted-foreground">
            No child profiles on file — they may not have a Wowzi account yet.
          </div>
        )}
      </section>

      {/* Refund modal */}
      {refundTarget && (
        <RefundModal
          booking={refundTarget}
          onClose={() => setRefundTarget(null)}
          onRefunded={handleRefunded}
        />
      )}
    </div>
  );
}
