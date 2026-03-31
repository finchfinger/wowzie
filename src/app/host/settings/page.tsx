"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ContentCard } from "@/components/ui/ContentCard";
import { EditableFieldRow } from "@/components/ui/EditableFieldRow";

/* ── types ── */

type EditableField =
  | "business_name"
  | "logo_emoji"
  | "about"
  | "instagram"
  | "x"
  | "youtube"
  | "tiktok"
  | "website"
  | "cancellation_policy"
  | "house_rules"
  | "what_to_bring"
  | null;

type HostSettings = {
  business_name: string;
  logo_emoji: string;
  about: string;
  instagram: string;
  x_handle: string;
  youtube: string;
  tiktok: string;
  website: string;
  cancellation_policy: string;
  house_rules: string;
  what_to_bring: string;
};

const DEFAULTS: HostSettings = {
  business_name: "",
  logo_emoji: "🏕️",
  about: "",
  instagram: "",
  x_handle: "",
  youtube: "",
  tiktok: "",
  website: "",
  cancellation_policy: "",
  house_rules: "",
  what_to_bring: "",
};

const CANCELLATION_OPTIONS = ["Flexible", "Moderate", "Strict"];

const EMOJIS = [
  "🏕️","🎨","⚽","🎭","🎸","🔬","🌿","🏄","🎯","🌟",
  "🦋","🐾","🎪","📚","🍳","🏔️","🌊","🎮","🦄","🐝",
  "🎻","🧩","🎤","🏆","🌈","🐘","🦊","🌻","🧪","🎺",
  "🖼️","🚴","🧘","🌺","🎋","🪁","🛶","🪡","🧸","🎠",
];

/* ── helpers ── */

async function saveToSupabase(userId: string, s: HostSettings) {
  return supabase.from("host_profiles").upsert(
    {
      user_id: userId,
      about: s.about,
      settings: {
        business_name: s.business_name,
        logo_emoji: s.logo_emoji,
        instagram: s.instagram,
        x_handle: s.x_handle,
        youtube: s.youtube,
        tiktok: s.tiktok,
        website: s.website,
        cancellation_policy: s.cancellation_policy,
        house_rules: s.house_rules,
        what_to_bring: s.what_to_bring,
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

/* ── sub-components ── */

/** Icon + label for ContentCard title prop */
function SectionTitle({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className="material-symbols-rounded text-muted-foreground select-none"
        style={{ fontSize: 18, fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}
      >
        {icon}
      </span>
      {label}
    </span>
  );
}


/* ── modal field config ── */

type FieldConfig = {
  title: string;
  label: string;
  type: "input" | "textarea" | "select" | "emoji";
};

const MODAL_CONFIG: Record<string, FieldConfig> = {
  business_name:       { title: "Business or host name",           label: "Name",                        type: "input"    },
  logo_emoji:          { title: "Logo",                            label: "Pick an emoji",               type: "emoji"    },
  about:               { title: "About",                           label: "About your programs",         type: "textarea" },
  instagram:           { title: "Instagram",                       label: "Username (without @)",        type: "input"    },
  x:                   { title: "X (Twitter)",                     label: "Handle (without @)",          type: "input"    },
  youtube:             { title: "YouTube",                         label: "Channel URL or handle",       type: "input"    },
  tiktok:              { title: "TikTok",                          label: "Username (without @)",        type: "input"    },
  website:             { title: "Website",                         label: "URL (https://...)",           type: "input"    },
  cancellation_policy: { title: "Cancellation policy",             label: "Policy",                      type: "select"   },
  house_rules:         { title: "House rules",                     label: "House rules",                 type: "textarea" },
  what_to_bring:       { title: "What to bring",                   label: "What families should bring", type: "textarea" },
};

/* ── page ── */

export default function HostSettingsPage() {
  const { user } = useAuth();
  const [s, setS] = useState<HostSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<"saved" | "error" | null>(null);

  /* modal */
  const [activeField, setActiveField] = useState<EditableField>(null);
  const [draftValue, setDraftValue] = useState("");

  /* ── load ── */
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("host_profiles")
        .select("about, settings")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        const cfg = (data.settings as Partial<HostSettings>) ?? {};
        setS({
          business_name:       cfg.business_name       ?? "",
          logo_emoji:          cfg.logo_emoji          ?? "🏕️",
          about:               data.about              ?? "",
          instagram:           cfg.instagram           ?? "",
          x_handle:            cfg.x_handle            ?? "",
          youtube:             cfg.youtube             ?? "",
          tiktok:              cfg.tiktok              ?? "",
          website:             cfg.website             ?? "",
          cancellation_policy: cfg.cancellation_policy ?? "",
          house_rules:         cfg.house_rules         ?? "",
          what_to_bring:       cfg.what_to_bring       ?? "",
        });
      }
      setLoading(false);
    })();
  }, [user?.id]);

  /* ── modal helpers ── */
  const open = (field: EditableField, val: string) => {
    setActiveField(field);
    setDraftValue(val);
  };
  const close = () => { setActiveField(null); setDraftValue(""); };

  /* ── save ── */
  const confirmSave = async () => {
    if (!activeField || !user?.id) return;
    const v = draftValue.trim();
    const next: HostSettings = { ...s };
    if      (activeField === "business_name")       next.business_name       = v;
    else if (activeField === "logo_emoji")          next.logo_emoji          = draftValue; /* no trim on emoji */
    else if (activeField === "about")               next.about               = v;
    else if (activeField === "instagram")           next.instagram           = v;
    else if (activeField === "x")                   next.x_handle            = v;
    else if (activeField === "youtube")             next.youtube             = v;
    else if (activeField === "tiktok")              next.tiktok              = v;
    else if (activeField === "website")             next.website             = v;
    else if (activeField === "cancellation_policy") next.cancellation_policy = v;
    else if (activeField === "house_rules")         next.house_rules         = v;
    else if (activeField === "what_to_bring")       next.what_to_bring       = v;

    setS(next);
    close();
    setSaving(true);
    const { error } = await saveToSupabase(user.id, next);
    setSaving(false);
    setToast(error ? "error" : "saved");
    setTimeout(() => setToast(null), 2500);
  };

  /* ── loading skeleton ── */
  if (loading) {
    return (
      <div className="space-y-5">
        {[2, 5, 3].map((rows, i) => (
          <div key={i} className="rounded-2xl bg-card p-8 space-y-4">
            <div className="h-4 w-32 rounded bg-muted animate-pulse" />
            {Array.from({ length: rows }).map((_, j) => (
              <div key={j} className="flex items-center justify-between py-4 border-t border-border/50">
                <div className="space-y-1.5">
                  <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-40 rounded bg-muted animate-pulse" />
                </div>
                <div className="h-8 w-14 rounded-lg bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  const cfg = activeField ? MODAL_CONFIG[activeField] : null;

  return (
    <div className="space-y-5">
      {/* save toast */}
      {(toast || saving) && (
        <div className={`text-sm font-medium px-4 py-2.5 rounded-xl transition-all ${
          saving ? "bg-muted text-muted-foreground" :
          toast === "saved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
          "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {saving ? "Saving…" : toast === "saved" ? "✓ Changes saved" : "Could not save — please try again"}
        </div>
      )}

      {/* ── General ── */}
      <ContentCard
        bordered={false}
        title={<SectionTitle icon="manage_accounts" label="General" />}
        bodyClassName="px-8 pb-8"
      >
        <div className="divide-y divide-border/50">
          {/* Business details — logo + name together */}
          <div className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => open("logo_emoji", s.logo_emoji)}
                title="Change logo"
                className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-xl hover:bg-accent transition-colors shrink-0"
              >
                {s.logo_emoji}
              </button>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Business details</p>
                <p className={`text-[13px] font-semibold ${s.business_name ? "text-foreground" : "text-muted-foreground font-normal"}`}>
                  {s.business_name || "Your name or business name"}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => open("business_name", s.business_name)} className="shrink-0">
              {s.business_name ? "Edit" : "Add"}
            </Button>
          </div>

          <EditableFieldRow
            label="About"
            value={s.about}
            placeholder="Tell families about yourself and your programs."
            onEdit={() => open("about", s.about)}
          />
        </div>
      </ContentCard>

      {/* ── Social links ── */}
      <ContentCard
        bordered={false}
        title={<SectionTitle icon="link" label="Social links" />}
        bodyClassName="px-8 pb-8"
      >
        <div className="divide-y divide-border/50">
          <EditableFieldRow label="Instagram"  value={s.instagram} placeholder="Username"         onEdit={() => open("instagram", s.instagram)} />
          <EditableFieldRow label="X"          value={s.x_handle}  placeholder="None provided"    onEdit={() => open("x",         s.x_handle)}  />
          <EditableFieldRow label="YouTube"    value={s.youtube}   placeholder="Channel"          onEdit={() => open("youtube",   s.youtube)}   />
          <EditableFieldRow label="TikTok"     value={s.tiktok}    placeholder="Username"         onEdit={() => open("tiktok",    s.tiktok)}    />
          <EditableFieldRow label="Website"    value={s.website}   placeholder="www.example.com"  onEdit={() => open("website",   s.website)}   />
        </div>
      </ContentCard>

      {/* ── Policies & rules ── */}
      <ContentCard
        bordered={false}
        title={<SectionTitle icon="rule" label="Policies and rules" />}
        bodyClassName="px-8 pb-8"
      >
        <div className="divide-y divide-border/50">
          <EditableFieldRow label="Cancellation Policy" value={s.cancellation_policy} placeholder="Not set"                                        onEdit={() => open("cancellation_policy", s.cancellation_policy)} />
          <EditableFieldRow label="House rules"          value={s.house_rules}         placeholder="e.g. Arrive 10 minutes early for check-in…"    onEdit={() => open("house_rules",         s.house_rules)}         />
          <EditableFieldRow label="What to bring"        value={s.what_to_bring}       placeholder="e.g. Water bottle, sunscreen, snack…"          onEdit={() => open("what_to_bring",       s.what_to_bring)}       />
        </div>
      </ContentCard>

      {/* ── Edit modal ── */}
      {activeField && cfg && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <div className="relative mx-auto mt-20 w-[92%] max-w-md rounded-2xl bg-background border border-border p-5 shadow-2xl">
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-foreground">{cfg.title}</h3>

              {/* Emoji grid */}
              {cfg.type === "emoji" && (
                <div className="grid grid-cols-8 gap-1.5">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setDraftValue(emoji)}
                      className={`h-9 w-9 rounded-lg text-xl flex items-center justify-center hover:bg-muted transition-colors ${
                        draftValue === emoji ? "ring-2 ring-primary bg-primary/10" : ""
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Cancellation policy selector */}
              {cfg.type === "select" && (
                <div className="grid grid-cols-3 gap-2">
                  {CANCELLATION_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setDraftValue(opt)}
                      className={`rounded-xl border py-2.5 text-sm font-medium transition-colors ${
                        draftValue === opt
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted text-foreground"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {/* Textarea */}
              {cfg.type === "textarea" && (
                <Textarea
                  rows={5}
                  value={draftValue}
                  onChange={(e) => setDraftValue(e.target.value)}
                  placeholder={cfg.label}
                  autoFocus
                  className="resize-none"
                />
              )}

              {/* Text input */}
              {cfg.type === "input" && (
                <Input
                  value={draftValue}
                  onChange={(e) => setDraftValue(e.target.value)}
                  placeholder={cfg.label}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && confirmSave()}
                />
              )}

              <div className="flex items-center justify-between pt-1">
                {/* Clear button for non-required fields */}
                {activeField !== "logo_emoji" && activeField !== "cancellation_policy" && draftValue && (
                  <button
                    type="button"
                    onClick={() => setDraftValue("")}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  <Button variant="ghost" size="sm" onClick={close}>Cancel</Button>
                  <Button size="sm" onClick={confirmSave}>Save</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
