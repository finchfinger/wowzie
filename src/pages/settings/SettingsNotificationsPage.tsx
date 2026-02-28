// src/pages/settings/SettingsNotificationsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { NotificationEditPanel } from "../../components/settings/NotificationEditPanel";
import { Snackbar } from "../../components/ui/Snackbar";
import { SettingsRow } from "../../components/settings/SettingsRow";

/** Map each category id to a Material Symbol icon name */
const CATEGORY_ICONS: Record<string, string> = {
  account_activity: "account_circle",
  two_factor:        "security",
  camper_policies:   "policy",
  host_policies:     "gavel",
  reminders:         "notifications",
  messages:          "chat_bubble",
  news_updates:      "newspaper",
  feedback:          "rate_review",
};

/** Subtitle for each section group */
const SECTION_SUBTITLES: Record<string, string> = {
  "Account activity and policies":
    "Confirm booking and account activity, and learn about important Wowzie policies.",
  "Reminders":
    "Get important reminders about your reservations, listings, and account activity.",
  "Guest and Host messages":
    "Keep in touch with your host or guests before and during your class.",
  "Wowzie updates":
    "Stay up to date on the latest news from Wowzie and let us know how we can improve.",
};

type CategoryId =
  | "account_activity"
  | "two_factor"
  | "camper_policies"
  | "host_policies"
  | "reminders"
  | "messages"
  | "news_updates"
  | "feedback";

type NotificationPreferenceRow = {
  id?: string;
  profile_id: string;
  category: CategoryId;
  email_enabled: boolean;
  sms_enabled: boolean;
  created_at?: string;
  updated_at?: string;
};

type CategoryConfig = {
  id: CategoryId;
  section: string;
  label: string;
  description: string;
  defaultEmail: boolean;
  defaultSms: boolean;
};

const CATEGORIES: CategoryConfig[] = [
  {
    id: "account_activity",
    section: "Account activity and policies",
    label: "Account activity",
    description: "Receive notifications about your account and payment activity.",
    defaultEmail: true,
    defaultSms: true,
  },
  {
    id: "two_factor",
    section: "Account activity and policies",
    label: "Two-factor authentication",
    description: "Get alerts when two-factor authentication is used or updated.",
    defaultEmail: true,
    defaultSms: true,
  },
  {
    id: "camper_policies",
    section: "Account activity and policies",
    label: "Camper policies",
    description: "Stay informed about important camper policy updates and changes.",
    defaultEmail: true,
    defaultSms: true,
  },
  {
    id: "host_policies",
    section: "Account activity and policies",
    label: "Host policies",
    description: "Stay informed about important host policy updates and changes.",
    defaultEmail: true,
    defaultSms: true,
  },
  {
    id: "reminders",
    section: "Reminders",
    label: "Reminders",
    description:
      "Get helpful reminders about your reservations, listings, and account activity.",
    defaultEmail: true,
    defaultSms: true,
  },
  {
    id: "messages",
    section: "Guest and Host messages",
    label: "Messages",
    description: "Keep in touch with your host or guests before and during your class.",
    defaultEmail: true,
    defaultSms: true,
  },
  {
    id: "news_updates",
    section: "Wowzie updates",
    label: "News and updates",
    description: "Stay up to date on new features, ideas, and news from Wowzie.",
    defaultEmail: false,
    defaultSms: false,
  },
  {
    id: "feedback",
    section: "Wowzie updates",
    label: "Feedback",
    description: "Receive invitations to share feedback and help us improve Wowzie.",
    defaultEmail: false,
    defaultSms: false,
  },
];

type PrefMap = Record<CategoryId, NotificationPreferenceRow>;

export const SettingsNotificationsPage: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [prefsByCategory, setPrefsByCategory] = useState<PrefMap | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingCategoryId, setEditingCategoryId] = useState<CategoryId | null>(null);
  const [editingEmail, setEditingEmail] = useState<boolean>(true);
  const [editingSms, setEditingSms] = useState<boolean>(true);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingUnsubscribe, setSavingUnsubscribe] = useState(false);

  // Snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");

  const showSnackbar = (msg: string) => {
    setSnackbarMessage(msg);
    setSnackbarOpen(true);
  };

  const editingCategory = useMemo(
    () => CATEGORIES.find((c) => c.id === editingCategoryId) || null,
    [editingCategoryId]
  );

  const groupedCategories = useMemo(() => {
    const groups: Record<string, CategoryConfig[]> = {};
    for (const cat of CATEGORIES) {
      if (!groups[cat.section]) groups[cat.section] = [];
      groups[cat.section].push(cat);
    }
    return groups;
  }, []);

  const buildPrefMap = (uid: string, rows: NotificationPreferenceRow[]): PrefMap => {
    const map: Partial<PrefMap> = {};
    const byCategory = new Map<CategoryId, NotificationPreferenceRow>();

    rows.forEach((row) => {
      if (CATEGORIES.some((c) => c.id === row.category)) {
        byCategory.set(row.category, row);
      }
    });

    for (const cfg of CATEGORIES) {
      const existing = byCategory.get(cfg.id);
      if (existing) {
        map[cfg.id] = existing;
      } else {
        map[cfg.id] = {
          profile_id: uid,
          category: cfg.id,
          email_enabled: cfg.defaultEmail,
          sms_enabled: cfg.defaultSms,
        };
      }
    }

    return map as PrefMap;
  };

  useEffect(() => {
    let isMounted = true;

    const loadPrefs = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (userError || !user) {
        setError("You need to be signed in to manage notifications.");
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data, error: prefsError } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("profile_id", user.id);

      if (!isMounted) return;

      if (prefsError) {
        console.error("Error loading notification preferences:", prefsError);
        setError("We could not load your notification settings.");
        setLoading(false);
        return;
      }

      const rows = (data || []) as NotificationPreferenceRow[];
      const map = buildPrefMap(user.id, rows);
      setPrefsByCategory(map);
      setLoading(false);
    };

    void loadPrefs();

    return () => {
      isMounted = false;
    };
  }, []);

  const openCategoryModal = (category: CategoryConfig) => {
    if (!prefsByCategory) return;
    const row = prefsByCategory[category.id];
    setEditingCategoryId(category.id);
    setEditingEmail(row.email_enabled);
    setEditingSms(row.sms_enabled);
  };

  const closeCategoryModal = () => {
    setEditingCategoryId(null);
    setSavingCategory(false);
  };

  const handleSaveCategory = async () => {
    if (!userId || !prefsByCategory || !editingCategory) return;
    setSavingCategory(true);

    const currentRow = prefsByCategory[editingCategory.id];

    const payload: NotificationPreferenceRow = {
      ...currentRow,
      profile_id: userId,
      category: editingCategory.id,
      email_enabled: editingEmail,
      sms_enabled: editingSms,
    };

    const { data, error: upsertError } = await supabase
      .from("notification_preferences")
      .upsert(payload, { onConflict: "profile_id,category" })
      .select("*")
      .single();

    if (upsertError) {
      console.error("Error saving notification preference:", upsertError);
      setError("We could not save your changes. Try again.");
      setSavingCategory(false);
      return;
    }

    const updated = data as NotificationPreferenceRow;

    setPrefsByCategory((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [editingCategory.id]: updated,
      };
    });

    closeCategoryModal();
    showSnackbar("Notification settings saved.");
  };

  const handleUnsubscribeAllMarketing = async () => {
    if (!userId || !prefsByCategory) return;
    setSavingUnsubscribe(true);
    setError(null);

    const marketingIds: CategoryId[] = ["news_updates", "feedback"];

    const payloads: NotificationPreferenceRow[] = marketingIds.map((id) => {
      const existing = prefsByCategory[id];
      return {
        ...existing,
        profile_id: userId,
        category: id,
        email_enabled: false,
        sms_enabled: false,
      };
    });

    const { data, error: upsertError } = await supabase
      .from("notification_preferences")
      .upsert(payloads, { onConflict: "profile_id,category" })
      .select("*");

    if (upsertError) {
      console.error("Error updating marketing preferences:", upsertError);
      setError("We could not update your marketing preferences.");
      setSavingUnsubscribe(false);
      return;
    }

    const updatedRows = (data || []) as NotificationPreferenceRow[];
    const updatedByCategory = new Map<CategoryId, NotificationPreferenceRow>();
    updatedRows.forEach((row) => updatedByCategory.set(row.category, row));

    setPrefsByCategory((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      marketingIds.forEach((id) => {
        const replacement = updatedByCategory.get(id);
        if (replacement) next[id] = replacement;
        else {
          next[id] = {
            ...prev[id],
            profile_id: userId,
            category: id,
            email_enabled: false,
            sms_enabled: false,
          };
        }
      });
      return next;
    });

    setSavingUnsubscribe(false);
    showSnackbar("Marketing preferences updated.");
  };

  const summarizeChannel = (prefsMap: PrefMap, category: CategoryConfig): string => {
    const row = prefsMap[category.id];
    const emailOn = row.email_enabled;
    const smsOn = row.sms_enabled;

    if (emailOn && smsOn) return "On: Email and SMS";
    if (emailOn) return "On: Email";
    if (smsOn) return "On: SMS";
    return "Off";
  };

  if (loading || !prefsByCategory) {
    return (
      <section className="space-y-4 text-xs text-gray-500">
        Loading your notification settings…
      </section>
    );
  }

  return (
    <>
      <section className="space-y-4">
        {Object.entries(groupedCategories).map(([sectionName, categories]) => (
          <Card key={sectionName}>
            {/* Section header */}
            <div className="px-4 sm:px-5 py-3 border-b border-black/5">
              <h2 className="text-sm font-semibold text-gray-900">{sectionName}</h2>
              {SECTION_SUBTITLES[sectionName] && (
                <p className="mt-0.5 text-[11px] text-gray-500">
                  {SECTION_SUBTITLES[sectionName]}
                </p>
              )}
            </div>

            {/* Category rows */}
            {categories.map((category) => (
              <SettingsRow
                key={category.id}
                icon={CATEGORY_ICONS[category.id] ?? "notifications"}
                label={category.label}
                description={summarizeChannel(prefsByCategory, category)}
                action={
                  <button
                    type="button"
                    className="text-xs font-medium text-violet-600 hover:text-violet-700"
                    onClick={() => openCategoryModal(category)}
                  >
                    Edit
                  </button>
                }
              />
            ))}
          </Card>
        ))}

        {/* Unsubscribe footer card */}
        <Card>
          <div className="px-4 sm:px-5 py-4">
            <button
              type="button"
              className="inline-flex items-center rounded-full bg-gray-100 px-4 py-2 text-xs font-medium text-gray-900 hover:bg-gray-200 disabled:opacity-60"
              onClick={handleUnsubscribeAllMarketing}
              disabled={savingUnsubscribe}
            >
              {savingUnsubscribe
                ? "Updating preferences…"
                : "Unsubscribe from all marketing messages"}
            </button>

            <p className="mt-3 text-[11px] text-gray-500 max-w-2xl">
              By opting in to text messages, you agree to receive automated messaging from
              Wowzie at your saved phone number. To receive messages at a different number,
              update your phone number in{" "}
              <span className="font-medium text-gray-700">Account → Contact</span>.
            </p>
          </div>
        </Card>

        {error && (
          <Card className="px-4 sm:px-5 py-3 text-xs text-red-700 !bg-red-50">
            {error}
          </Card>
        )}

        {/* Edit-preferences modal */}
        <Modal
          isOpen={!!editingCategory}
          onClose={closeCategoryModal}
          title={editingCategory ? editingCategory.label : "Edit notifications"}
        >
          {editingCategory && (
            <NotificationEditPanel
              title={editingCategory.label}
              description={editingCategory.description}
              emailEnabled={editingEmail}
              smsEnabled={editingSms}
              onEmailChange={setEditingEmail}
              onSmsChange={setEditingSms}
              onCancel={closeCategoryModal}
              onSave={handleSaveCategory}
              saving={savingCategory}
            />
          )}
        </Modal>
      </section>

      <Snackbar
        open={snackbarOpen}
        message={snackbarMessage}
        onClose={() => setSnackbarOpen(false)}
      />
    </>
  );
};

export default SettingsNotificationsPage;
