// src/pages/ChildDetailPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { ToggleChip } from "../components/ui/ToggleChip";

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

type MessageTone = "info" | "error" | "success";

const INTEREST_OPTIONS = [
  "Sports",
  "Arts",
  "STEM",
  "Outdoors",
  "Music",
  "Cooking",
  "Dance",
  "Drama",
  "Day camps",
  "Overnight camps",
];

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

// Local tag so this page never breaks if Tag props drift.
// If you want to use your shared Tag component, swap this for your import.
const Tag: React.FC<{ label: string; onRemove?: () => void }> = ({
  label,
  onRemove,
}) => {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-[11px] text-gray-800">
      <span className="truncate">{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-100 text-[10px] text-gray-600 hover:bg-gray-200"
          aria-label={`Remove ${label}`}
          title="Remove"
        >
          ✕
        </button>
      )}
    </span>
  );
};

const ChildDetailPage: React.FC = () => {
  const params = useParams();
  const id = params.id;
  const navigate = useNavigate();

  const [child, setChild] = useState<ChildRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ tone: MessageTone; text: string }>({
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
      // Important: birthdate is a DATE in Postgres, so Supabase often returns "YYYY-MM-DD"
      // Using new Date("YYYY-MM-DD") can shift a day in some timezones. We only need the string.
      // But if it's already in that format, keep it.
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return "";
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };

    const init = async () => {
      if (!id) {
        if (!isMounted) return;
        setMessage({ tone: "error", text: "We couldn’t find that child." });
        setLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!isMounted) return;

      if (userError) {
        console.error("Error fetching user for child detail:", userError);
      }
      if (!userData.user) {
        navigate("/");
        return;
      }

      const decodedId = (() => {
        try {
          return decodeURIComponent(id);
        } catch {
          return id;
        }
      })();

      const { data, error } = await supabase
        .from("children")
        .select("*")
        .eq("id", decodedId)
        .eq("parent_id", userData.user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        console.error("Error loading child:", error);
        setMessage({
          tone: "error",
          text: "We couldn’t load this child’s details.",
        });
        setLoading(false);
        return;
      }

      if (!data) {
        setMessage({
          tone: "error",
          text: "We couldn’t find this child on your account.",
        });
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

    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  const setField = (name: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleInterest = (interest: string) => {
    setForm((prev) => {
      const has = prev.interests.includes(interest);
      const next = has
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest];
      return { ...prev, interests: next };
    });
  };

  const removeInterest = (interest: string) => {
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.filter((i) => i !== interest),
    }));
  };

  const messageClass = useMemo(() => {
    const base = "text-[11px] min-h-[1rem]";
    if (!message.text) return `${base} text-gray-500`;
    if (message.tone === "error") return `${base} text-red-600`;
    if (message.tone === "success") return `${base} text-emerald-600`;
    return `${base} text-gray-500`;
  }, [message]);

  const ageLabel = useMemo(() => {
    if (!form.birthdate) return "";

    // Safer date parsing to avoid timezone shifting.
    // form.birthdate is "YYYY-MM-DD"
    const [yyyyStr, mmStr, ddStr] = form.birthdate.split("-");
    const yyyy = Number(yyyyStr);
    const mm = Number(mmStr);
    const dd = Number(ddStr);
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

  // Save logic that does not depend on submit events.
  const saveChild = async () => {
    console.log("[ChildDetailPage] saveChild called");

    if (!child) return;

    if (!form.legalName.trim()) {
      setMessage({ tone: "error", text: "Please add your child’s legal name." });
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setMessage({
        tone: "error",
        text: "We couldn’t verify your account. Please sign in again.",
      });
      return;
    }

    console.log("[ChildDetailPage] ids", {
      userId: userData.user.id,
      childId: child.id,
      childParentId: child.parent_id,
    });

    setSaving(true);
    setMessage({ tone: "info", text: "Saving…" });

    try {
      const interestsValue = form.interests.length > 0 ? form.interests : null;

      // Key change:
      // - maybeSingle prevents 406 when 0 rows are returned
      // - we also handle the "no data" case explicitly (usually RLS or mismatch)
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
          interests: interestsValue,
        })
        .eq("id", child.id)
        .eq("parent_id", userData.user.id)
        .select("*")
        .maybeSingle();

      if (error) {
        console.error("Error updating child:", error);
        console.log(
          "[ChildDetailPage] update error json",
          JSON.stringify(error, null, 2)
        );
        setMessage({
          tone: "error",
          text:
            error.message ||
            "We couldn’t save these changes. Please try again.",
        });
        return;
      }

      if (!data) {
        setMessage({
          tone: "error",
          text:
            "Nothing was saved. This is usually a permissions (RLS) issue or this child does not belong to your current user.",
        });
        return;
      }

      setChild(data as ChildRow);

      // ✅ Success
      setMessage({ tone: "success", text: "Changes saved." });

      // ✅ Immediately return to Children tab + trigger snackbar on that page
      navigate("/settings/children?toast=saved");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    void saveChild();
  };

  const handleDelete = async () => {
    if (!child) return;

    const ok = window.confirm(
      "Remove this child from your Wowzie account? This cannot be undone."
    );
    if (!ok) return;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setMessage({
        tone: "error",
        text: "We couldn’t verify your account. Please sign in again.",
      });
      return;
    }

    setDeleting(true);

    try {
      const { error } = await supabase
        .from("children")
        .delete()
        .eq("id", child.id)
        .eq("parent_id", userData.user.id);

      if (error) {
        console.error("Error deleting child:", error);
        window.alert("We couldn’t remove this child. Please try again.");
        return;
      }

      // ✅ Go back to the Children tab (not Account)
      navigate("/settings/children");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-8 lg:py-10 text-sm text-gray-600">
        Loading child…
      </div>
    );
  }

  if (!child) {
    return (
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-8 lg:py-10 text-sm text-red-600">
        {message.text || "We couldn’t load this child."}
      </div>
    );
  }

  return (
    <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
      <div className="mb-4">
        <Link
          // ✅ Keep children tab
          to="/settings/children"
          className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
        >
          <span>←</span>
          <span>Back to settings</span>
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm border border-black/5 text-2xl">
            {form.avatarEmoji || "🧒"}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {form.preferredName || form.legalName || "Child"}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">{ageLabel}</p>

            {form.interests.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {form.interests.map((i) => (
                  <Tag key={i} label={i} onRemove={() => removeInterest(i)} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center rounded-full border border-red-100 bg-red-50 px-4 py-2 font-medium text-red-600 hover:bg-red-100 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {deleting ? "Removing…" : "Remove child from account"}
          </button>
        </div>
      </div>

      <section className="rounded-2xl bg-white border border-black/5 shadow-sm px-4 sm:px-6 py-6 space-y-6 text-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-gray-900">Child details</h2>
          <p className={messageClass}>{message.text}</p>
        </div>

        <form className="space-y-5" onSubmit={handleSave}>
          <div>
            <label
              htmlFor="legalName"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Legal name
            </label>
            <input
              id="legalName"
              type="text"
              value={form.legalName}
              onChange={(e) => setField("legalName", e.target.value)}
              className="block w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              required
              disabled={saving}
            />
          </div>

          <div>
            <label
              htmlFor="preferredName"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Preferred first name
            </label>
            <input
              id="preferredName"
              type="text"
              value={form.preferredName}
              onChange={(e) => setField("preferredName", e.target.value)}
              className="block w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              placeholder="Leave blank if they prefer their legal name"
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="birthdate"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                Birthdate
              </label>
              <input
                id="birthdate"
                type="date"
                value={form.birthdate}
                onChange={(e) => setField("birthdate", e.target.value)}
                className="block w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                disabled={saving}
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Age shown on Wowzie is calculated from this date.
              </p>
            </div>

            <div>
              <p className="block text-xs font-medium text-gray-700 mb-1">
                Icon
              </p>
              <div className="grid grid-cols-6 gap-2 text-xl">
                {["🧒", "👧", "🧑‍🎓", "🧑‍🎨", "🧑‍🔬", "🧑‍🚀"].map((emoji) => {
                  const selected = form.avatarEmoji === emoji;
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setField("avatarEmoji", emoji)}
                      disabled={saving}
                      className={cx(
                        "h-9 w-9 flex items-center justify-center rounded-xl border border-black/10 bg-white hover:bg-lime-50",
                        selected && "ring-2 ring-violet-500 bg-lime-50",
                        saving && "opacity-70 cursor-not-allowed"
                      )}
                      aria-pressed={selected}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="block text-xs font-medium text-gray-700">Interests</p>
              {form.interests.length > 0 && (
                <p className="text-[11px] text-gray-500">
                  Selected: {form.interests.length}
                </p>
              )}
            </div>

            {form.interests.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {form.interests.map((i) => (
                  <Tag key={i} label={i} onRemove={() => removeInterest(i)} />
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {INTEREST_OPTIONS.map((interest) => (
                <ToggleChip
                  key={interest}
                  label={interest}
                  selected={form.interests.includes(interest)}
                  onToggle={() => toggleInterest(interest)}
                  disabled={saving}
                />
              ))}
            </div>

            <p className="mt-2 text-[11px] text-gray-500">
              This helps Wowzie recommend better camps and helps hosts prepare.
            </p>
          </div>

          <div>
            <label
              htmlFor="allergies"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Allergies
            </label>
            <textarea
              id="allergies"
              rows={2}
              value={form.allergies}
              onChange={(e) => setField("allergies", e.target.value)}
              className="block w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              placeholder="Example: Tree nuts, penicillin, seasonal pollen"
              disabled={saving}
            />
          </div>

          <div>
            <label
              htmlFor="immunizationNotes"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Immunization &amp; health notes
            </label>
            <textarea
              id="immunizationNotes"
              rows={3}
              value={form.immunizationNotes}
              onChange={(e) => setField("immunizationNotes", e.target.value)}
              className="block w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              placeholder="Anything you want hosts to know about vaccines, health forms, or accommodations."
              disabled={saving}
            />
          </div>

          <div>
            <label
              htmlFor="medications"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Medications
            </label>
            <textarea
              id="medications"
              rows={2}
              value={form.medications}
              onChange={(e) => setField("medications", e.target.value)}
              className="block w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              placeholder="Example: Albuterol inhaler as needed, EpiPen Jr"
              disabled={saving}
            />
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            {/* Use explicit click so save always fires even if submit is swallowed */}
            <button
              type="button"
              onClick={() => void saveChild()}
              disabled={saving}
              className="inline-flex items-center rounded-full bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "Save"}
            </button>

            <p className="text-[11px] text-gray-500">
              These details are shared with hosts when you book.
            </p>
          </div>
        </form>
      </section>
    </main>
  );
};

export default ChildDetailPage;
