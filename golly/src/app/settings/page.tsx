"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { NavTabs } from "@/components/ui/nav-tabs";
import {
  Lock,
  ShieldCheck,
  Monitor,
  CalendarSync,
  UserCircle,
  ShieldAlert,
  BookOpen,
  Gavel,
  Bell,
  MessageCircle,
  Newspaper,
  MessageSquareMore,
  ChevronRight,
  Plus,
} from "lucide-react";

// Reads searchParams — must be wrapped in Suspense
function TabReader({ onInit }: { onInit: (t: SettingsTab) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const t = (searchParams.get("tab") as SettingsTab) || "account";
    onInit(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export default function SettingsPageWrapper() {
  const [tab, setTab] = useState<SettingsTab>("account");

  const handleTabChange = (id: SettingsTab) => {
    setTab(id);
    window.history.replaceState(null, "", `/settings?tab=${id}`);
  };

  return (
    <>
      {/* Suspense only wraps the tiny searchParams reader, not the whole page */}
      <Suspense fallback={null}>
        <TabReader onInit={setTab} />
      </Suspense>
      <SettingsPageInner tab={tab} onTabChange={handleTabChange} />
    </>
  );
}

type SettingsTab = "account" | "children" | "login" | "notifications";

type Child = {
  id: string;
  parent_id: string;
  legal_name: string;
  preferred_name: string | null;
  birthdate: string | null;
  allergies: string | null;
  immunization_notes: string | null;
  medications: string | null;
  avatar_emoji: string | null;
  created_at: string;
  interests?: string[] | null;
};

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

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "children", label: "Children" },
  { id: "login", label: "Security" },
  { id: "notifications", label: "Notifications" },
];

/* ─── Editable field row ─── */
type EditableRowProps = {
  label: string;
  value: string;
  helper?: string;
  multiline?: boolean;
  onSave: (val: string) => Promise<void>;
};

function EditableRow({ label, value, helper, multiline, onSave }: EditableRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEdit = () => {
    setDraft(value);
    setError(null);
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setDraft(value);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(draft.trim());
      setEditing(false);
    } catch {
      setError("Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-start justify-between px-5 py-3.5 gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">{label}</p>
        {editing ? (
          <div className="space-y-2 mt-1">
            {multiline ? (
              <textarea
                rows={3}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="block w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 resize-none"
                disabled={saving}
              />
            ) : (
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="block w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10"
                disabled={saving}
                autoFocus
              />
            )}
            {error && <p className="text-[11px] text-destructive">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background hover:opacity-90 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="inline-flex items-center rounded-full border border-input bg-transparent px-4 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-foreground">{value || <span className="text-muted-foreground italic">Not set</span>}</p>
            {helper && <p className="mt-0.5 text-[11px] text-muted-foreground">{helper}</p>}
          </>
        )}
      </div>
      {!editing && (
        <button
          type="button"
          onClick={handleEdit}
          className="shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mt-0.5"
        >
          Edit
        </button>
      )}
    </div>
  );
}

function SettingsPageInner({
  tab,
  onTabChange,
}: {
  tab: SettingsTab;
  onTabChange: (id: SettingsTab) => void;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  const [children, setChildren] = useState<Child[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [childrenError, setChildrenError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [childName, setChildName] = useState("");
  const [childBirthdate, setChildBirthdate] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [addChildMessage, setAddChildMessage] = useState<{
    tone: "info" | "error" | "success";
    text: string;
  }>({ tone: "info", text: "" });
  const [addingChild, setAddingChild] = useState(false);

  // Profile data for account tab
  const [profile, setProfile] = useState<{
    legal_name: string | null;
    preferred_first_name: string | null;
    phone: string | null;
    email: string | null;
    address_line1: string | null;
    city: string | null;
    about: string | null;
    avatar_url: string | null;
  } | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        router.push("/");
        return;
      }
      setUser(data.user);
      await loadChildren(data.user);
      await loadProfile(data.user.id);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("legal_name, preferred_first_name, phone, email, address_line1, city, about, avatar_url")
      .eq("id", userId)
      .maybeSingle();
    if (data) setProfile(data as any);
  };

  const saveProfileField = async (field: string, value: string) => {
    if (!user) throw new Error("Not signed in");
    const { error } = await supabase
      .from("profiles")
      .update({ [field]: value || null, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (error) throw error;
    setProfile((prev) => (prev ? { ...prev, [field]: value || null } : prev));
  };

  const loadChildren = async (u: User) => {
    setLoadingChildren(true);
    setChildrenError(null);
    try {
      const { data, error } = await supabase
        .from("children")
        .select("*")
        .eq("parent_id", u.id)
        .order("created_at", { ascending: true });
      if (error) {
        setChildrenError("We couldn't load your children right now.");
        setChildren([]);
      } else {
        setChildren((data || []) as Child[]);
      }
    } finally {
      setLoadingChildren(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const resetModal = () => {
    setChildName("");
    setChildBirthdate("");
    setSelectedInterests([]);
    setAddChildMessage({ tone: "info", text: "" });
  };

  const handleAddChildSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setAddChildMessage({ tone: "error", text: "Please sign in again." });
      return;
    }
    const legalName = childName.trim();
    if (!legalName) {
      setAddChildMessage({ tone: "error", text: "Please add your child's name." });
      return;
    }
    setAddingChild(true);
    setAddChildMessage({ tone: "info", text: "" });
    try {
      const avatarOptions = ["🧒", "👧", "🧑‍🎓", "🧑‍🚀", "🧑‍🎨", "🧑‍🔬"];
      const avatar = avatarOptions[Math.floor(Math.random() * avatarOptions.length)];
      const birthdate = childBirthdate.trim() || null;
      const { error } = await supabase.from("children").insert([
        {
          parent_id: user.id,
          legal_name: legalName,
          preferred_name: null,
          birthdate,
          allergies: null,
          immunization_notes: null,
          medications: null,
          avatar_emoji: avatar,
          interests: selectedInterests.length ? selectedInterests : null,
        },
      ]);
      if (error) {
        setAddChildMessage({ tone: "error", text: "We couldn't save this child. Please try again." });
        return;
      }
      setAddChildMessage({ tone: "success", text: "Child added." });
      await loadChildren(user);
      setTimeout(() => {
        setModalOpen(false);
        resetModal();
      }, 350);
    } catch {
      setAddChildMessage({ tone: "error", text: "We couldn't save this child. Please try again." });
    } finally {
      setAddingChild(false);
    }
  };

  const getAgeLabel = (birthdateStr: string | null) => {
    if (!birthdateStr) return "";
    const parts = birthdateStr.split("-");
    if (parts.length === 3) {
      const year = Number(parts[0]);
      const month = Number(parts[1]);
      const day = Number(parts[2]);
      if (year && month && day) {
        const birth = new Date(year, month - 1, day);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const hasHadBirthday =
          today.getMonth() > birth.getMonth() ||
          (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
        if (!hasHadBirthday) age -= 1;
        if (age < 0 || age > 120) return "";
        return `Age ${age}`;
      }
    }
    return "";
  };


  return (
    <>
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-xl">🍓</span>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Settings
            </h1>
          </div>
          <Link
            href="/profile"
            className="inline-flex items-center rounded-full border border-input bg-transparent px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            See Profile
          </Link>
        </div>

        {/* Tabs */}
        <NavTabs
          tabs={TABS}
          activeId={tab}
          onChange={onTabChange}
        />

        {/* ACCOUNT TAB */}
        {tab === "account" && (
          <section className="space-y-4">
            {/* Name group */}
            <Card className="overflow-hidden py-0 gap-0">
              <CardHeader className="px-5 pt-4 pb-3 border-b border-black/5">
                <h2 className="text-sm font-semibold text-foreground">Name</h2>
                <p className="text-[11px] text-muted-foreground">Your name as it appears to hosts and guests.</p>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-black/5">
                <EditableRow
                  label="Legal name"
                  value={profile?.legal_name || ""}
                  onSave={(v) => saveProfileField("legal_name", v)}
                />
                <EditableRow
                  label="Preferred first name"
                  value={profile?.preferred_first_name || ""}
                  helper="This is how your name appears to others on Golly."
                  onSave={(v) => saveProfileField("preferred_first_name", v)}
                />
              </CardContent>
            </Card>

            {/* Contact group */}
            <Card className="overflow-hidden py-0 gap-0">
              <CardHeader className="px-5 pt-4 pb-3 border-b border-black/5">
                <h2 className="text-sm font-semibold text-foreground">Contact info</h2>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-black/5">
                <EditableRow
                  label="Phone number"
                  value={profile?.phone || ""}
                  helper="Contact number for confirmed guests and Golly to get in touch."
                  onSave={(v) => saveProfileField("phone", v)}
                />
                <EditableRow
                  label="Email address"
                  value={profile?.email || user?.email || ""}
                  onSave={(v) => saveProfileField("email", v)}
                />
              </CardContent>
            </Card>

            {/* Address group */}
            <Card className="overflow-hidden py-0 gap-0">
              <CardHeader className="px-5 pt-4 pb-3 border-b border-black/5">
                <h2 className="text-sm font-semibold text-foreground">Address</h2>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-black/5">
                <EditableRow
                  label="Street address"
                  value={profile?.address_line1 || ""}
                  onSave={(v) => saveProfileField("address_line1", v)}
                />
                <EditableRow
                  label="City"
                  value={profile?.city || ""}
                  onSave={(v) => saveProfileField("city", v)}
                />
              </CardContent>
            </Card>

            {/* About group */}
            <Card className="overflow-hidden py-0 gap-0">
              <CardHeader className="px-5 pt-4 pb-3 border-b border-black/5">
                <h2 className="text-sm font-semibold text-foreground">About</h2>
              </CardHeader>
              <CardContent className="p-0">
                <EditableRow
                  label="About you"
                  value={profile?.about || ""}
                  helper="Tell hosts and other families a bit about yourself."
                  multiline
                  onSave={(v) => saveProfileField("about", v)}
                />
              </CardContent>
            </Card>

            {/* Deactivate group */}
            <Card className="overflow-hidden py-0 gap-0">
              <CardHeader className="px-5 pt-4 pb-3 border-b border-black/5">
                <h2 className="text-sm font-semibold text-foreground">Deactivate account</h2>
              </CardHeader>
              <CardContent className="px-5 py-4">
                <p className="text-xs text-muted-foreground mb-3">
                  Permanently delete your account. This action cannot be undone.
                  If you&apos;re hosting active events, they&apos;ll be cancelled and guests will be notified.
                </p>
                <button
                  type="button"
                  className="inline-flex items-center rounded-full bg-destructive px-4 py-2 text-xs font-medium text-white hover:bg-destructive/90 transition-colors"
                >
                  Deactivate account
                </button>
              </CardContent>
            </Card>
          </section>
        )}

        {/* CHILDREN TAB */}
        {tab === "children" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Children</h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Manage your kids&apos; profiles, interests, and health info.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { resetModal(); setModalOpen(true); }}
                className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background hover:opacity-90 transition-opacity"
              >
                <Plus className="h-3.5 w-3.5" />
                Add child
              </button>
            </div>

            <Card className="overflow-hidden py-0 gap-0">
              {loadingChildren && (
                <div className="px-5 py-4 text-xs text-muted-foreground">Loading children…</div>
              )}
              {!loadingChildren && childrenError && (
                <div className="px-5 py-4 text-xs text-destructive">{childrenError}</div>
              )}

              {!loadingChildren && !childrenError && children.length > 0 && (
                <div className="divide-y divide-black/5">
                  {children.map((child) => {
                    const avatar = child.avatar_emoji || "🧒";
                    const name = child.preferred_name || child.legal_name || "Child";
                    const ageLabel = getAgeLabel(child.birthdate);
                    const interests = child.interests ?? [];
                    return (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => router.push(`/settings/child/${encodeURIComponent(child.id)}`)}
                        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
                            {avatar}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{name}</p>
                            <p className="text-xs text-muted-foreground">
                              {[ageLabel, interests.length > 0 ? interests.slice(0, 2).join(", ") : null]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}

              {!loadingChildren && !childrenError && children.length === 0 && (
                <div className="px-5 py-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-2xl">
                    🧒
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No children yet</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Add your kids to get age-appropriate recommendations.
                  </p>
                  <button
                    type="button"
                    onClick={() => { resetModal(); setModalOpen(true); }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background hover:opacity-90 transition-opacity"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add your first child
                  </button>
                </div>
              )}
            </Card>
          </section>
        )}

        {/* SECURITY TAB */}
        {tab === "login" && (
          <LoginSecurityTab user={user} />
        )}

        {/* NOTIFICATIONS TAB */}
        {tab === "notifications" && (
          <NotificationsTab userId={user?.id ?? null} />
        )}
      </main>

      {/* ADD CHILD MODAL */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !addingChild) setModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-lg rounded-3xl bg-card shadow-xl max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => { if (!addingChild) { setModalOpen(false); } }}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
            >
              ✕
            </button>

            <form className="px-6 pt-8 pb-6 space-y-6 text-sm" onSubmit={handleAddChildSubmit}>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Let&apos;s add a child
              </h2>

              <div>
                <label htmlFor="childName" className="block text-xs font-medium text-muted-foreground mb-1">
                  What&apos;s your child&apos;s name?
                </label>
                <Input
                  id="childName"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  required
                  disabled={addingChild}
                />
              </div>

              <div>
                <label htmlFor="childBirthdate" className="block text-xs font-medium text-muted-foreground mb-1">
                  Birthdate <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <Input
                  id="childBirthdate"
                  type="date"
                  value={childBirthdate}
                  onChange={(e) => setChildBirthdate(e.target.value)}
                  disabled={addingChild}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Age shown on Golly is calculated from this date.
                </p>
              </div>

              <div>
                <p className="block text-xs font-medium text-muted-foreground mb-2">
                  Interests
                </p>
                {selectedInterests.length === 0 && (
                  <p className="mb-3 text-[11px] text-muted-foreground">
                    Choose a few to personalise recommendations.
                  </p>
                )}
                {selectedInterests.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedInterests.map((interest) => (
                      <span
                        key={interest}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                      >
                        {interest}
                        <button
                          type="button"
                          onClick={() => setSelectedInterests((prev) => prev.filter((i) => i !== interest))}
                          className="ml-0.5 hover:text-primary/70"
                          disabled={addingChild}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {INTEREST_OPTIONS.map((interest) => {
                    const selected = selectedInterests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        disabled={addingChild}
                        className={`flex items-center rounded-xl px-3 py-2 text-xs cursor-pointer transition-colors ${
                          selected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground hover:bg-muted/80"
                        }`}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>

                {addChildMessage.text && (
                  <p
                    className={`mt-3 text-[11px] ${
                      addChildMessage.tone === "error"
                        ? "text-destructive"
                        : addChildMessage.tone === "success"
                        ? "text-green-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    {addChildMessage.text}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { if (!addingChild) { setModalOpen(false); resetModal(); } }}
                  disabled={addingChild}
                  className="flex-1 inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium bg-muted text-foreground hover:bg-muted/80 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingChild}
                  className="flex-1 inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium bg-foreground text-background hover:opacity-90 disabled:opacity-60"
                >
                  {addingChild ? "Saving…" : "Continue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────
   SECURITY TAB
   ───────────────────────────────────────────── */

type Device = { id: string; label: string; detail: string; isCurrent: boolean };

/* Reusable settings row: icon + label + description + action */
function SettingsRow({
  icon,
  label,
  description,
  action,
  children: expandedContent,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-3.5">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{label}</p>
              {description && (
                <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
              )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
          {expandedContent && <div className="mt-3">{expandedContent}</div>}
        </div>
      </div>
    </div>
  );
}

function LoginSecurityTab({ user }: { user: User | null }) {
  const userEmail = user?.email ?? null;

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [devices, setDevices] = useState<Device[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadDevices = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        const ua = window.navigator.userAgent;
        let browser = "This browser";
        if (ua.includes("Chrome")) browser = "Chrome";
        else if (ua.includes("Safari")) browser = "Safari";
        else if (ua.includes("Firefox")) browser = "Firefox";
        let platform = "Unknown device";
        if (ua.includes("Mac OS X")) platform = "macOS";
        else if (ua.includes("Windows")) platform = "Windows";
        else if (/iPhone|iPad|iPod/.test(ua)) platform = "iOS";
        else if (/Android/.test(ua)) platform = "Android";
        const lastActive =
          session?.expires_at != null
            ? new Date(session.expires_at * 1000).toLocaleString()
            : "Currently signed in";
        if (mounted)
          setDevices([{ id: "current", label: `${browser} on ${platform}`, detail: `Active · ${lastActive}`, isCurrent: true }]);
      } catch {
        if (mounted) setDevices([]);
      } finally {
        if (mounted) setDevicesLoading(false);
      }
    };
    void loadDevices();
    return () => { mounted = false; };
  }, []);

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordStatus(null);
    if (!userEmail) { setPasswordError("You need to be signed in to change your password."); return; }
    if (!currentPassword || !newPassword || !confirmPassword) { setPasswordError("Please fill in all password fields."); return; }
    if (newPassword.length < 8) { setPasswordError("New password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("New password and confirmation do not match."); return; }
    setPasswordSaving(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: userEmail, password: currentPassword });
      if (signInError) { setPasswordError("Current password is incorrect."); setPasswordSaving(false); return; }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) { setPasswordError("We could not update your password. Try again."); setPasswordSaving(false); return; }
      setPasswordStatus("Your password has been updated.");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setShowPasswordForm(false);
    } catch {
      setPasswordError("Something went wrong. Please try again.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleDisconnectDevice = async (deviceId: string) => {
    if (deviceId === "current") {
      await supabase.auth.signOut();
      window.location.href = "/";
    }
  };

  return (
    <section className="space-y-4">
      {/* Password & security */}
      <Card className="overflow-hidden py-0 gap-0">
        <CardHeader className="px-5 pt-4 pb-3 border-b border-black/5">
          <h2 className="text-sm font-semibold text-foreground">Password and security</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Keep your account secure with a strong password and two-factor authentication.
          </p>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-black/5">
          {/* Password row */}
          <SettingsRow
            icon={<Lock className="h-4 w-4" />}
            label="Account password"
            description="Update the password you use to sign in to Golly."
            action={
              !showPasswordForm ? (
                <button
                  type="button"
                  className="text-xs font-medium rounded-full bg-foreground px-3 py-1.5 text-background hover:opacity-90 whitespace-nowrap"
                  onClick={() => setShowPasswordForm(true)}
                >
                  {userEmail ? "Change" : "Set password"}
                </button>
              ) : undefined
            }
          >
            {showPasswordForm && (
              <form onSubmit={handlePasswordSave} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="current-password" className="block text-xs font-medium text-muted-foreground">
                      Current password
                    </label>
                    <Input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={passwordSaving} />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="new-password" className="block text-xs font-medium text-muted-foreground">
                      New password
                    </label>
                    <Input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={passwordSaving} />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="confirm-password" className="block text-xs font-medium text-muted-foreground">
                      Confirm new password
                    </label>
                    <Input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={passwordSaving} />
                  </div>
                </div>
                {(passwordStatus || passwordError) && (
                  <div className="space-y-1">
                    {passwordStatus && <p className="text-[11px] text-green-600">{passwordStatus}</p>}
                    {passwordError && <p className="text-[11px] text-destructive">{passwordError}</p>}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button type="submit" disabled={passwordSaving} className="inline-flex items-center rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background hover:opacity-90 disabled:opacity-60">
                    {passwordSaving ? "Saving…" : "Save password"}
                  </button>
                  <button
                    type="button"
                    disabled={passwordSaving}
                    className="inline-flex items-center rounded-full border border-input bg-transparent px-4 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-60"
                    onClick={() => { setShowPasswordForm(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setPasswordError(null); setPasswordStatus(null); }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </SettingsRow>

          {/* 2FA row */}
          <SettingsRow
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Two-factor authentication"
            description="Add an extra layer of security with a one-time code when signing in."
            action={
              <button type="button" className="text-xs font-medium rounded-full border border-input bg-transparent px-3 py-1.5 text-muted-foreground cursor-not-allowed whitespace-nowrap" disabled>
                Coming soon
              </button>
            }
          />
        </CardContent>
      </Card>

      {/* Active devices */}
      <Card className="overflow-hidden py-0 gap-0">
        <CardHeader className="px-5 pt-4 pb-3 border-b border-black/5">
          <h2 className="text-sm font-semibold text-foreground">Active devices</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Devices where you&apos;re currently signed in. Sign out if something looks unfamiliar.
          </p>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-black/5">
          {devicesLoading && (
            <div className="px-5 py-3 text-xs text-muted-foreground">Loading devices…</div>
          )}
          {!devicesLoading && devices.length === 0 && (
            <div className="px-5 py-3 text-xs text-muted-foreground">No active devices found.</div>
          )}
          {!devicesLoading && devices.map((device) => (
            <SettingsRow
              key={device.id}
              icon={<Monitor className="h-4 w-4" />}
              label={device.label}
              description={device.detail}
              action={
                <button
                  type="button"
                  className="text-xs font-medium text-muted-foreground hover:text-foreground whitespace-nowrap"
                  onClick={() => handleDisconnectDevice(device.id)}
                >
                  {device.isCurrent ? "Sign out" : "Disconnect"}
                </button>
              }
            />
          ))}
        </CardContent>
      </Card>

      {/* Account syncing */}
      <Card className="overflow-hidden py-0 gap-0">
        <CardHeader className="px-5 pt-4 pb-3 border-b border-black/5">
          <h2 className="text-sm font-semibold text-foreground">Account syncing</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Connect calendars and contacts to make planning and inviting easier.
          </p>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-black/5">
          <SettingsRow
            icon={<CalendarSync className="h-4 w-4" />}
            label="Calendar syncing"
            description="Sync your Golly activities with Google, Outlook, or Apple calendar."
            action={
              <button type="button" className="text-xs font-medium rounded-full border border-input bg-transparent px-3 py-1.5 text-foreground hover:bg-muted whitespace-nowrap">
                Add iCal
              </button>
            }
          />
          <SettingsRow
            icon={<UserCircle className="h-4 w-4" />}
            label="Sync contacts with Google"
            description="Sync your Gmail contacts to easily invite families to your events."
            action={
              <button type="button" className="text-xs font-medium rounded-full border border-input bg-transparent px-3 py-1.5 text-foreground hover:bg-muted whitespace-nowrap">
                Connect
              </button>
            }
          />
        </CardContent>
      </Card>
    </section>
  );
}

/* ─────────────────────────────────────────────
   NOTIFICATIONS TAB
   ───────────────────────────────────────────── */

type CategoryId =
  | "account_activity"
  | "two_factor"
  | "camper_policies"
  | "host_policies"
  | "reminders"
  | "messages"
  | "news_updates"
  | "feedback";

type NotificationPref = {
  id?: string;
  profile_id: string;
  category: CategoryId;
  email_enabled: boolean;
  sms_enabled: boolean;
};

type CategoryConfig = {
  id: CategoryId;
  section: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  defaultEmail: boolean;
  defaultSms: boolean;
};

const NOTIF_CATEGORIES: CategoryConfig[] = [
  { id: "account_activity", section: "Account activity and policies", label: "Account activity", description: "Notifications about your account and payment activity.", icon: <UserCircle className="h-4 w-4" />, defaultEmail: true, defaultSms: true },
  { id: "two_factor", section: "Account activity and policies", label: "Two-factor authentication", description: "Alerts when two-factor authentication is used or updated.", icon: <ShieldAlert className="h-4 w-4" />, defaultEmail: true, defaultSms: true },
  { id: "camper_policies", section: "Account activity and policies", label: "Camper policies", description: "Important camper policy updates and changes.", icon: <BookOpen className="h-4 w-4" />, defaultEmail: true, defaultSms: true },
  { id: "host_policies", section: "Account activity and policies", label: "Host policies", description: "Important host policy updates and changes.", icon: <Gavel className="h-4 w-4" />, defaultEmail: true, defaultSms: true },
  { id: "reminders", section: "Reminders", label: "Reminders", description: "Helpful reminders about reservations, listings, and account activity.", icon: <Bell className="h-4 w-4" />, defaultEmail: true, defaultSms: true },
  { id: "messages", section: "Guest and Host messages", label: "Messages", description: "Stay in touch with your host or guests before and during your class.", icon: <MessageCircle className="h-4 w-4" />, defaultEmail: true, defaultSms: true },
  { id: "news_updates", section: "Golly updates", label: "News and updates", description: "New features, ideas, and news from Golly.", icon: <Newspaper className="h-4 w-4" />, defaultEmail: false, defaultSms: false },
  { id: "feedback", section: "Golly updates", label: "Feedback", description: "Invitations to share feedback and help us improve Golly.", icon: <MessageSquareMore className="h-4 w-4" />, defaultEmail: false, defaultSms: false },
];

const SECTION_DESCRIPTIONS: Record<string, string> = {
  "Account activity and policies": "Confirm your booking and account activity, and learn about important Golly policies.",
  Reminders: "Get important reminders about your reservations, listings, and account activity.",
  "Guest and Host messages": "Keep in touch with your host or guests before and during your class.",
  "Golly updates": "Stay up to date on the latest news from Golly and let us know how we can improve.",
};

type PrefMap = Record<CategoryId, NotificationPref>;

function NotificationsTab({ userId }: { userId: string | null }) {
  const [prefsByCategory, setPrefsByCategory] = useState<PrefMap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingCategoryId, setEditingCategoryId] = useState<CategoryId | null>(null);
  const [editingEmail, setEditingEmail] = useState(true);
  const [editingSms, setEditingSms] = useState(true);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingUnsubscribe, setSavingUnsubscribe] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const editingCategory = useMemo(
    () => NOTIF_CATEGORIES.find((c) => c.id === editingCategoryId) || null,
    [editingCategoryId],
  );

  const groupedCategories = useMemo(() => {
    const groups: Record<string, CategoryConfig[]> = {};
    for (const cat of NOTIF_CATEGORIES) {
      if (!groups[cat.section]) groups[cat.section] = [];
      groups[cat.section].push(cat);
    }
    return groups;
  }, []);

  const buildPrefMap = useCallback((uid: string, rows: NotificationPref[]): PrefMap => {
    const byCategory = new Map<CategoryId, NotificationPref>();
    rows.forEach((row) => { if (NOTIF_CATEGORIES.some((c) => c.id === row.category)) byCategory.set(row.category, row); });
    const map: Partial<PrefMap> = {};
    for (const cfg of NOTIF_CATEGORIES) {
      const existing = byCategory.get(cfg.id);
      map[cfg.id] = existing || { profile_id: uid, category: cfg.id, email_enabled: cfg.defaultEmail, sms_enabled: cfg.defaultSms };
    }
    return map as PrefMap;
  }, []);

  useEffect(() => {
    if (!userId) { setLoading(false); setError("You need to be signed in to manage notifications."); return; }
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      const { data, error: prefsError } = await supabase.from("notification_preferences").select("*").eq("profile_id", userId);
      if (!mounted) return;
      if (prefsError) { setError("We could not load your notification settings."); setLoading(false); return; }
      setPrefsByCategory(buildPrefMap(userId, (data || []) as NotificationPref[]));
      setLoading(false);
    };
    void load();
    return () => { mounted = false; };
  }, [userId, buildPrefMap]);

  const summarize = (cat: CategoryConfig): string => {
    if (!prefsByCategory) return "";
    const row = prefsByCategory[cat.id];
    if (row.email_enabled && row.sms_enabled) return "Email and SMS";
    if (row.email_enabled) return "Email only";
    if (row.sms_enabled) return "SMS only";
    return "Off";
  };

  const openEdit = (cat: CategoryConfig) => {
    if (!prefsByCategory) return;
    const row = prefsByCategory[cat.id];
    setEditingCategoryId(cat.id);
    setEditingEmail(row.email_enabled);
    setEditingSms(row.sms_enabled);
  };

  const closeEdit = () => { setEditingCategoryId(null); setSavingCategory(false); };

  const handleSaveCategory = async () => {
    if (!userId || !prefsByCategory || !editingCategory) return;
    setSavingCategory(true);
    const payload = { ...prefsByCategory[editingCategory.id], profile_id: userId, category: editingCategory.id, email_enabled: editingEmail, sms_enabled: editingSms };
    const { data, error: upsertError } = await supabase.from("notification_preferences").upsert(payload, { onConflict: "profile_id,category" }).select("*").single();
    if (upsertError) { setError("We could not save your changes. Try again."); setSavingCategory(false); return; }
    const updated = data as NotificationPref;
    setPrefsByCategory((prev) => prev ? { ...prev, [editingCategory.id]: updated } : prev);
    closeEdit();
    setToast("Notification settings saved.");
    setTimeout(() => setToast(null), 2500);
  };

  const handleUnsubscribeAll = async () => {
    if (!userId || !prefsByCategory) return;
    setSavingUnsubscribe(true);
    setError(null);
    const marketingIds: CategoryId[] = ["news_updates", "feedback"];
    const payloads = marketingIds.map((id) => ({ ...prefsByCategory[id], profile_id: userId, category: id, email_enabled: false, sms_enabled: false }));
    const { data, error: upsertError } = await supabase.from("notification_preferences").upsert(payloads, { onConflict: "profile_id,category" }).select("*");
    if (upsertError) { setError("We could not update your marketing preferences."); setSavingUnsubscribe(false); return; }
    const updatedRows = (data || []) as NotificationPref[];
    const updatedMap = new Map<CategoryId, NotificationPref>();
    updatedRows.forEach((r) => updatedMap.set(r.category, r));
    setPrefsByCategory((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      marketingIds.forEach((id) => { const rep = updatedMap.get(id); if (rep) next[id] = rep; else next[id] = { ...prev[id], email_enabled: false, sms_enabled: false }; });
      return next;
    });
    setSavingUnsubscribe(false);
    setToast("Marketing preferences updated.");
    setTimeout(() => setToast(null), 2500);
  };

  if (loading || !prefsByCategory) {
    return <section className="space-y-4 text-xs text-muted-foreground">Loading your notification settings…</section>;
  }

  return (
    <>
      <section className="space-y-4">
        {Object.entries(groupedCategories).map(([sectionName, categories]) => (
          <Card key={sectionName} className="overflow-hidden py-0 gap-0">
            <CardHeader className="px-5 pt-4 pb-3 border-b border-black/5">
              <h2 className="text-sm font-semibold text-foreground">{sectionName}</h2>
              {SECTION_DESCRIPTIONS[sectionName] && (
                <p className="mt-0.5 text-[11px] text-muted-foreground">{SECTION_DESCRIPTIONS[sectionName]}</p>
              )}
            </CardHeader>
            <CardContent className="p-0 divide-y divide-black/5">
              {categories.map((cat) => (
                <SettingsRow
                  key={cat.id}
                  icon={cat.icon}
                  label={cat.label}
                  description={summarize(cat)}
                  action={
                    <button
                      type="button"
                      className="text-xs font-medium text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(cat)}
                    >
                      Edit
                    </button>
                  }
                />
              ))}
            </CardContent>
          </Card>
        ))}

        {/* Unsubscribe all marketing */}
        <Card className="overflow-hidden py-0 gap-0">
          <CardContent className="px-5 py-4">
            <button
              type="button"
              className="inline-flex items-center rounded-full border border-input bg-transparent px-4 py-2 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-60 transition-colors"
              onClick={handleUnsubscribeAll}
              disabled={savingUnsubscribe}
            >
              {savingUnsubscribe ? "Updating preferences…" : "Unsubscribe from all marketing messages"}
            </button>
            <p className="mt-3 text-[11px] text-muted-foreground">
              By opting in to text messages, you agree to receive automated messaging from Golly at your saved phone number.
            </p>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-2xl bg-destructive/10 px-5 py-3 text-xs text-destructive">
            {error}
          </div>
        )}
      </section>

      {/* Edit notification modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={(e) => { if (e.target === e.currentTarget) closeEdit(); }}>
          <div className="relative w-full max-w-md rounded-3xl bg-card shadow-xl max-h-[90vh] overflow-y-auto">
            <button type="button" onClick={closeEdit} className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80">
              ✕
            </button>
            <div className="px-6 pt-8 pb-6 space-y-5 text-sm">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">{editingCategory.label}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{editingCategory.description}</p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-foreground">Email</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={editingEmail}
                    onClick={() => setEditingEmail(!editingEmail)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${editingEmail ? "bg-primary" : "bg-muted"}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${editingEmail ? "translate-x-5" : "translate-x-0.5"} mt-0.5`} />
                  </button>
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-foreground">SMS</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={editingSms}
                    onClick={() => setEditingSms(!editingSms)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${editingSms ? "bg-primary" : "bg-muted"}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${editingSms ? "translate-x-5" : "translate-x-0.5"} mt-0.5`} />
                  </button>
                </label>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={savingCategory}
                  onClick={handleSaveCategory}
                  className="inline-flex items-center rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background hover:opacity-90 disabled:opacity-60"
                >
                  {savingCategory ? "Saving…" : "Save"}
                </button>
                <button type="button" onClick={closeEdit} className="inline-flex items-center rounded-full border border-input bg-transparent px-4 py-2 text-xs font-medium text-foreground hover:bg-muted">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-full bg-foreground px-5 py-2.5 text-xs font-medium text-background shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}
