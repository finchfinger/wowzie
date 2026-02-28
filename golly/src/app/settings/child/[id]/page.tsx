"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type ChildRow = {
  id: string;
  parent_id: string;
  legal_name: string;
  preferred_name: string | null;
  birthdate: string | null;
  allergies: string | null;
  immunization_notes: string | null;
  medications: string | null;
  avatar_emoji: string | null;
  interests: string[] | null;
};

const INTEREST_OPTIONS = [
  "Sports", "Arts", "STEM", "Outdoors", "Music",
  "Cooking", "Dance", "Drama", "Day camps", "Overnight camps",
];

export default function ChildDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [child, setChild] = useState<ChildRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ tone: "info" | "error" | "success"; text: string }>({
    tone: "info",
    text: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    legalName: "",
    preferredName: "",
    birthdate: "",
    allergies: "",
    immunizationNotes: "",
    medications: "",
    avatarEmoji: "🧒",
    interests: [] as string[],
  });

  useEffect(() => {
    let isMounted = true;

    const normalizeBirthdate = (value: string | null) => {
      if (!value) return "";
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return "";
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };

    const init = async () => {
      if (!id) {
        if (!isMounted) return;
        setMessage({ tone: "error", text: "We couldn't find that child." });
        setLoading(false);
        return;
      }
      const { data: userData } = await supabase.auth.getUser();
      if (!isMounted) return;
      if (!userData.user) { router.push("/"); return; }

      const decodedId = (() => { try { return decodeURIComponent(id); } catch { return id; } })();

      const { data, error } = await supabase
        .from("children")
        .select("*")
        .eq("id", decodedId)
        .eq("parent_id", userData.user.id)
        .maybeSingle();

      if (!isMounted) return;
      if (error || !data) {
        setMessage({ tone: "error", text: "We couldn't load this child's details." });
        setLoading(false);
        return;
      }

      const row = data as ChildRow;
      setChild(row);
      setForm({
        legalName: row.legal_name || "",
        preferredName: row.preferred_name || "",
        birthdate: normalizeBirthdate(row.birthdate),
        allergies: row.allergies || "",
        immunizationNotes: row.immunization_notes || "",
        medications: row.medications || "",
        avatarEmoji: row.avatar_emoji || "🧒",
        interests: Array.isArray(row.interests) ? row.interests : [],
      });
      setLoading(false);
    };

    void init();
    return () => { isMounted = false; };
  }, [id, router]);

  const setField = (name: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleInterest = (interest: string) => {
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const removeInterest = (interest: string) => {
    setForm((prev) => ({ ...prev, interests: prev.interests.filter((i) => i !== interest) }));
  };

  const ageLabel = useMemo(() => {
    if (!form.birthdate) return "";
    const [yyyyStr, mmStr, ddStr] = form.birthdate.split("-");
    const yyyy = Number(yyyyStr), mm = Number(mmStr), dd = Number(ddStr);
    if (!yyyy || !mm || !dd) return "";
    const d = new Date(yyyy, mm - 1, dd);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
    if (age < 0 || age > 120) return "";
    return `Age ${age}`;
  }, [form.birthdate]);

  const saveChild = async () => {
    if (!child) return;
    if (!form.legalName.trim()) {
      setMessage({ tone: "error", text: "Please add your child's legal name." });
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setMessage({ tone: "error", text: "Please sign in again." });
      return;
    }
    setSaving(true);
    setMessage({ tone: "info", text: "Saving..." });
    try {
      const { data, error } = await supabase
        .from("children")
        .update({
          legal_name: form.legalName.trim(),
          preferred_name: form.preferredName.trim() || null,
          birthdate: form.birthdate || null,
          allergies: form.allergies.trim() || null,
          immunization_notes: form.immunizationNotes.trim() || null,
          medications: form.medications.trim() || null,
          avatar_emoji: form.avatarEmoji || "🧒",
          interests: form.interests.length > 0 ? form.interests : null,
        })
        .eq("id", child.id)
        .eq("parent_id", userData.user.id)
        .select("*")
        .maybeSingle();

      if (error) {
        setMessage({ tone: "error", text: "We couldn't save these changes. Please try again." });
        return;
      }
      if (!data) {
        setMessage({ tone: "error", text: "Nothing was saved. This may be a permissions issue." });
        return;
      }
      setChild(data as ChildRow);
      setMessage({ tone: "success", text: "Changes saved." });
      router.push("/settings?tab=children");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!child) return;
    const ok = window.confirm("Remove this child from your Golly account? This cannot be undone.");
    if (!ok) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("children").delete().eq("id", child.id).eq("parent_id", userData.user.id);
      if (error) { window.alert("We couldn't remove this child. Please try again."); return; }
      router.push("/settings?tab=children");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 text-sm text-muted-foreground">Loading child...</div>;
  }

  if (!child) {
    return <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 text-sm text-destructive">{message.text || "We couldn't load this child."}</div>;
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
      <div className="mb-4">
        <Link href="/settings?tab=children" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <span>&larr;</span> Back to settings
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-2xl">
            {form.avatarEmoji || "🧒"}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {form.preferredName || form.legalName || "Child"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">{ageLabel}</p>
            {form.interests.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {form.interests.map((i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-[11px] text-foreground">
                    {i}
                    <button type="button" onClick={() => removeInterest(i)} className="ml-1 text-muted-foreground hover:text-foreground">&#10005;</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="inline-flex items-center rounded-md border border-destructive/20 bg-destructive/5 px-4 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-70"
        >
          {deleting ? "Removing..." : "Remove child from account"}
        </button>
      </div>

      <section className="rounded-2xl bg-card px-4 sm:px-6 py-6 space-y-6 text-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Child details</h2>
          {message.text && (
            <p className={`text-[11px] ${message.tone === "error" ? "text-destructive" : message.tone === "success" ? "text-green-600" : "text-muted-foreground"}`}>
              {message.text}
            </p>
          )}
        </div>

        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); void saveChild(); }}>
          <div>
            <label htmlFor="legalName" className="block text-xs font-medium text-muted-foreground mb-1">Legal name</label>
            <Input id="legalName" value={form.legalName} onChange={(e) => setField("legalName", e.target.value)} required disabled={saving} />
          </div>
          <div>
            <label htmlFor="preferredName" className="block text-xs font-medium text-muted-foreground mb-1">Preferred first name</label>
            <Input id="preferredName" value={form.preferredName} onChange={(e) => setField("preferredName", e.target.value)} placeholder="Leave blank if they prefer their legal name" disabled={saving} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="birthdate" className="block text-xs font-medium text-muted-foreground mb-1">Birthdate</label>
              <Input id="birthdate" type="date" value={form.birthdate} onChange={(e) => setField("birthdate", e.target.value)} disabled={saving} />
              <p className="mt-1 text-[11px] text-muted-foreground">Age shown on Golly is calculated from this date.</p>
            </div>
            <div>
              <p className="block text-xs font-medium text-muted-foreground mb-1">Icon</p>
              <div className="grid grid-cols-6 gap-2 text-xl">
                {["🧒", "👧", "🧑‍🎓", "🧑‍🎨", "🧑‍🔬", "🧑‍🚀"].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setField("avatarEmoji", emoji)}
                    disabled={saving}
                    className={`h-9 w-9 flex items-center justify-center rounded-xl border border-border bg-card hover:bg-primary/5 ${
                      form.avatarEmoji === emoji ? "ring-2 ring-primary bg-primary/5" : ""
                    } ${saving ? "opacity-70 cursor-not-allowed" : ""}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className="block text-xs font-medium text-muted-foreground mb-2">Interests</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {INTEREST_OPTIONS.map((interest) => {
                const selected = form.interests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    disabled={saving}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer transition-colors ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              This helps Golly recommend better camps and helps hosts prepare.
            </p>
          </div>

          <div>
            <label htmlFor="allergies" className="block text-xs font-medium text-muted-foreground mb-1">Allergies</label>
            <Textarea id="allergies" rows={2} value={form.allergies} onChange={(e) => setField("allergies", e.target.value)} placeholder="Example: Tree nuts, penicillin, seasonal pollen" disabled={saving} />
          </div>
          <div>
            <label htmlFor="immunizationNotes" className="block text-xs font-medium text-muted-foreground mb-1">Immunization &amp; health notes</label>
            <Textarea id="immunizationNotes" rows={3} value={form.immunizationNotes} onChange={(e) => setField("immunizationNotes", e.target.value)} placeholder="Anything you want hosts to know about vaccines, health forms, or accommodations." disabled={saving} />
          </div>
          <div>
            <label htmlFor="medications" className="block text-xs font-medium text-muted-foreground mb-1">Medications</label>
            <Textarea id="medications" rows={2} value={form.medications} onChange={(e) => setField("medications", e.target.value)} placeholder="Example: Albuterol inhaler as needed, EpiPen Jr" disabled={saving} />
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => void saveChild()} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
            <p className="text-[11px] text-muted-foreground">These details are shared with hosts when you book.</p>
          </div>
        </form>
      </section>
    </main>
  );
}
