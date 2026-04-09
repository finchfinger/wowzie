"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, MessageSquare } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      /* 2. Find a matching profile by email to get their user ID */
      if (contactData.email) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", contactData.email)
          .maybeSingle();

        if (!alive) return;

        if (profileData?.id) {
          /* 3. Load their children */
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
          <ChevronLeft className="h-3.5 w-3.5" /> Back
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
        <ChevronLeft className="h-3.5 w-3.5" />
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
          <MessageSquare className="h-4 w-4" />
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
    </div>
  );
}
