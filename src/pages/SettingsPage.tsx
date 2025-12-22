import React, { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Tabs } from "../components/ui/Tabs";
import type { TabItem } from "../components/ui/Tabs";

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
  age_years?: number | null;
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

const SETTINGS_TABS: TabItem[] = [
  { id: "account", label: "Account" },
  { id: "children", label: "Children" },
  { id: "login", label: "Login and Security" },
  { id: "notifications", label: "Notifications" },
];

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = (searchParams.get("tab") as SettingsTab) || "account";

  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const [user, setUser] = useState<User | null>(null);

  const [children, setChildren] = useState<Child[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [childrenError, setChildrenError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState<string>("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [addChildMessage, setAddChildMessage] = useState<{
    tone: "info" | "error" | "success";
    text: string;
  }>({ tone: "info", text: "" });
  const [addingChild, setAddingChild] = useState(false);

  // keep ?tab= in URL
  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    });
  }, [tab, setSearchParams]);

  // load user + children
  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error fetching user in settings:", error);
        setUser(null);
        return;
      }
      if (!data.user) {
        navigate("/");
        return;
      }
      setUser(data.user);
      await loadChildren(data.user);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        console.error("Error loading children:", error);
        setChildrenError("We couldn’t load your children right now.");
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
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const resetModal = () => {
    setChildName("");
    setChildAge("");
    setSelectedInterests([]);
    setAddChildMessage({ tone: "info", text: "" });
  };

  const handleAddChildSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setAddChildMessage({
        tone: "error",
        text: "We couldn’t verify your account. Please sign in again.",
      });
      return;
    }

    const legalName = childName.trim();
    if (!legalName) {
      setAddChildMessage({
        tone: "error",
        text: "Please add your child’s name.",
      });
      return;
    }

    setAddingChild(true);
    setAddChildMessage({ tone: "info", text: "" });

    try {
      const avatarOptions = ["🧒", "👧", "🧑‍🎓", "🧑‍🚀", "🧑‍🎨", "🧑‍🔬"];
      const avatar =
        avatarOptions[Math.floor(Math.random() * avatarOptions.length)];

      const { error } = await supabase.from("children").insert([
        {
          parent_id: user.id,
          legal_name: legalName,
          preferred_name: null,
          birthdate: null,
          allergies: null,
          immunization_notes: null,
          medications: null,
          avatar_emoji: avatar,
          interests: selectedInterests.length ? selectedInterests : null,
        },
      ]);

      if (error) {
        console.error("Error inserting child:", error);
        setAddChildMessage({
          tone: "error",
          text: "We couldn’t save this child. Please try again.",
        });
        return;
      }

      setAddChildMessage({ tone: "success", text: "Child added." });
      await loadChildren(user);

      setTimeout(() => {
        setModalOpen(false);
        resetModal();
      }, 350);
    } catch (err) {
      console.error("Unexpected error inserting child:", err);
      setAddChildMessage({
        tone: "error",
        text: "We couldn’t save this child. Please try again.",
      });
    } finally {
      setAddingChild(false);
    }
  };

  const addChildMessageClass = useMemo(() => {
    const base = "mt-3 text-[11px]";
    if (!addChildMessage.text) return `${base} text-gray-500`;
    if (addChildMessage.tone === "error") return `${base} text-red-600`;
    if (addChildMessage.tone === "success") return `${base} text-green-600`;
    return `${base} text-gray-500`;
  }, [addChildMessage]);

  const handleChildClick = (childId: string) => {
    navigate(`/settings/child/${encodeURIComponent(childId)}`);
  };

  const getAgeLabel = (birthdateStr: string | null) => {
    if (!birthdateStr) return "";
    const d = new Date(birthdateStr);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
    if (age < 0 || age > 120) return "";
    return `Age ${age}`;
  };

  return (
    <>
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-8 lg:py-10">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-xl">🍓</span>
            <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          </div>

          <button
            type="button"
            className="inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
          >
            See Profile
          </button>
        </div>

        {/* Tabs */}
        <Tabs
          tabs={SETTINGS_TABS}
          activeId={tab}
          onChange={(id) => setTab(id as SettingsTab)}
          className="mb-6"
        />

        {/* ACCOUNT TAB */}
        {tab === "account" && (
          <section className="space-y-4">
            <div className="rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden">
              <div className="border-b border-black/5 px-4 sm:px-5 py-3 text-sm font-semibold">
                Personal information
              </div>

              <div className="divide-y divide-black/5 text-sm">
                {[
                  {
                    label: "Legal name",
                    value: "Sharon Nelson",
                    dataAttr: "data-account-legal-name",
                  },
                  {
                    label: "Preferred first name",
                    value: "Nellie",
                    dataAttr: "data-account-preferred-name",
                  },
                  {
                    label: "Phone",
                    value: "(773) 844-3349",
                    helper:
                      "Contact number for confirmed guests and Wowzie to get in touch.",
                    dataAttr: "data-account-phone",
                  },
                  {
                    label: "Email address",
                    value: "nellie@gmail.com",
                    dataAttr: "data-account-email",
                  },
                  {
                    label: "Residential address",
                    value: "2052***, Chicago",
                    dataAttr: "data-account-address",
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between px-4 sm:px-5 py-3"
                  >
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        {row.label}
                      </p>
                      <p
                        className="mt-0.5 text-gray-900"
                        {...{ [row.dataAttr]: true }}
                      >
                        {row.value}
                      </p>
                      {row.helper && (
                        <p className="mt-0.5 text-[11px] text-gray-500">
                          {row.helper}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      className="text-xs font-medium text-gray-700 hover:text-gray-900"
                    >
                      Edit
                    </button>
                  </div>
                ))}

                <div className="flex items-center justify-between px-4 sm:px-5 py-3">
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      About
                    </p>
                    <p
                      className="mt-0.5 text-gray-900 text-sm"
                      data-account-about
                    >
                      I am a former teacher and mom of two who’s been leading
                      hands-on, curiosity-driven camps for the past six summers.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ml-4 text-xs font-medium text-gray-700 hover:text-gray-900"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden">
              <div className="border-b border-black/5 px-4 sm:px-5 py-3 text-sm font-semibold">
                Deactivate account
              </div>
              <div className="px-4 sm:px-5 py-4 text-xs text-gray-700 space-y-3">
                <p>
                  Deactivate and permanently delete your account. This action
                  cannot be undone. If you’re hosting any active events, they’ll
                  be cancelled and guests will be notified.
                </p>
                <button
                  type="button"
                  className="inline-flex items-center rounded-full bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700"
                >
                  Deactivate account
                </button>
              </div>
            </div>
          </section>
        )}

        {/* CHILDREN TAB */}
        {tab === "children" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-900">Children</h2>
              <button
                type="button"
                onClick={() => {
                  resetModal();
                  setModalOpen(true);
                }}
                className="inline-flex items-center rounded-full bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-black"
              >
                Add child
              </button>
            </div>

            <div className="flex items-center justify-between text-xs mb-2">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-3 py-1.5 text-[11px] text-gray-700 hover:bg-gray-50"
              >
                <span>▾</span>
                <span>Age</span>
              </button>
            </div>

            <div className="rounded-2xl bg-white border border-black/5 shadow-sm divide-y divide-black/5 text-sm">
              {loadingChildren && (
                <div className="px-4 sm:px-5 py-4 text-xs text-gray-500">
                  Loading children…
                </div>
              )}

              {!loadingChildren && childrenError && (
                <div className="px-4 sm:px-5 py-4 text-xs text-red-600">
                  {childrenError}
                </div>
              )}

              {!loadingChildren &&
                !childrenError &&
                children.map((child) => {
                  const avatar = child.avatar_emoji || "🧒";
                  const name =
                    child.preferred_name || child.legal_name || "Child";
                  const ageLabel = getAgeLabel(child.birthdate);

                  return (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => handleChildClick(child.id)}
                      className="w-full flex items-center justify-between px-4 sm:px-5 py-3 text-left hover:bg-lime-50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{avatar}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {name}
                          </p>
                          {ageLabel && (
                            <p className="text-xs text-gray-500">
                              {ageLabel}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>Yesterday</span>
                        <span>⋮</span>
                      </div>
                    </button>
                  );
                })}
            </div>

            {!loadingChildren &&
              !childrenError &&
              children.length === 0 && (
                <div className="rounded-2xl border border-dashed border-black/10 bg-white/70 px-5 py-6 text-sm text-gray-600 text-center">
                  <p className="mb-3">
                    You haven’t added any children yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      resetModal();
                      setModalOpen(true);
                    }}
                    className="inline-flex items-center rounded-full bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-black"
                  >
                    Add your first child
                  </button>
                </div>
              )}
          </section>
        )}

        {/* LOGIN & SECURITY */}
        {tab === "login" && (
          <section className="space-y-4">
            <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-4 sm:px-5 py-5 text-sm text-gray-700">
              Login and security settings will live here (password, 2FA,
              connected accounts).
            </div>
          </section>
        )}

        {/* NOTIFICATIONS */}
        {tab === "notifications" && (
          <section className="space-y-4">
            <div className="rounded-2xl bg-white border border-black/5 shadow-sm px-4 sm:px-5 py-5 text-sm text-gray-700">
              Notification preferences (email, SMS, app) will live here.
            </div>
          </section>
        )}
      </main>

      {/* ADD CHILD MODAL */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModalOpen(false);
            }
          }}
        >
          <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
            >
              ✕
            </button>

            <form
              className="px-6 pt-8 pb-6 space-y-6 text-sm"
              onSubmit={handleAddChildSubmit}
            >
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  Let’s add a child
                </h2>
              </div>

              <div>
                <label
                  htmlFor="childName"
                  className="block text-xs font-medium text-gray-700 mb-1"
                >
                  What’s your child’s name?
                </label>
                <input
                  id="childName"
                  type="text"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  className="block w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="childAge"
                  className="block text-xs font-medium text-gray-700 mb-1"
                >
                  How old are they?
                </label>
                <input
                  id="childAge"
                  type="number"
                  min={0}
                  max={18}
                  value={childAge}
                  onChange={(e) => setChildAge(e.target.value)}
                  className="block w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  Age is optional for now. You can add more details later.
                </p>
              </div>

              <div>
                <p className="block text-xs font-medium text-gray-700 mb-2">
                  What are their interests?
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {INTEREST_OPTIONS.map((interest) => {
                    const checked = selectedInterests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 cursor-pointer text-gray-800 ${
                          checked
                            ? "border-gray-900 bg-gray-900 text-white"
                            : ""
                        }`}
                        data-interest-pill
                      >
                        <span>{interest}</span>
                      </button>
                    );
                  })}
                </div>

                {addChildMessage.text && (
                  <p className={addChildMessageClass}>
                    {addChildMessage.text}
                  </p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={addingChild}
                  className="inline-flex w-full items-center justify-center rounded-full bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-black disabled:opacity-70 disabled:cursor-not-allowed"
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
};
