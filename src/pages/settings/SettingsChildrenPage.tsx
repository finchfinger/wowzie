// src/pages/settings/SettingsChildrenPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

import { Modal } from "../../components/ui/Modal";
import { ToggleChip } from "../../components/ui/ToggleChip";
import { Tag } from "../../components/ui/Tag";
import { Snackbar } from "../../components/ui/Snackbar";

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

type AddChildMessage = {
  tone: "info" | "error" | "success";
  text: string;
};

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

// Safer age calculation (avoids UTC parsing edge cases)
const getAgeLabel = (birthdateStr: string | null, ageYears?: number | null) => {
  if (typeof ageYears === "number" && ageYears >= 0 && ageYears <= 18) {
    return `Age ${ageYears}`;
  }

  if (!birthdateStr) return "";

  // birthdateStr may come from Postgres date as "YYYY-MM-DD"
  // Parse as local time to avoid timezone surprises.
  const parts = birthdateStr.split("-");
  if (parts.length === 3) {
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (year && month && day) {
      const birth = new Date(year, month - 1, day);
      const today = new Date();

      let age = today.getFullYear() - birth.getFullYear();
      const hasHadBirthdayThisYear =
        today.getMonth() > birth.getMonth() ||
        (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());

      if (!hasHadBirthdayThisYear) age -= 1;
      if (age < 0 || age > 120) return "";
      return `Age ${age}`;
    }
  }

  // Fallback (if format is different)
  const d = new Date(birthdateStr);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  if (age < 0 || age > 120) return "";
  return `Age ${age}`;
};

export const SettingsChildrenPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState<User | null>(null);

  const [children, setChildren] = useState<Child[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [childrenError, setChildrenError] = useState<string | null>(null);

  // Snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // Add child modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [childName, setChildName] = useState("");
  const [childBirthdate, setChildBirthdate] = useState<string>("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [addChildMessage, setAddChildMessage] = useState<AddChildMessage>({
    tone: "info",
    text: "",
  });
  const [addingChild, setAddingChild] = useState(false);

  // ─────────────────────────────
  // Show toast from query param (one-time)
  // ─────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const toast = params.get("toast");

    if (toast === "saved") {
      setSnackbarMessage("Your information has been saved.");
      setSnackbarOpen(true);

      // Remove the query param so it doesn't replay on refresh
      params.delete("toast");
      navigate(
        { pathname: location.pathname, search: params.toString() },
        { replace: true }
      );
    }
  }, [location.pathname, location.search, navigate]);

  // ─────────────────────────────
  // Init user + load children
  // ─────────────────────────────
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!isMounted) return;

      if (error) {
        console.error("Error fetching user in settings (children):", error);
        setUser(null);
        setChildrenError("You need to be signed in to view your children.");
        setLoadingChildren(false);
        return;
      }

      if (!data.user) {
        navigate("/");
        return;
      }

      setUser(data.user);
      await loadChildren(data.user);
    };

    void init();

    return () => {
      isMounted = false;
    };
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
        return;
      }

      setChildren((data || []) as Child[]);
    } finally {
      setLoadingChildren(false);
    }
  };

  // ─────────────────────────────
  // Helpers
  // ─────────────────────────────
  const resetModal = () => {
    setChildName("");
    setChildBirthdate("");
    setSelectedInterests([]);
    setAddChildMessage({ tone: "info", text: "" });
  };

  const openAddChild = () => {
    resetModal();
    setModalOpen(true);
  };

  const closeAddChild = () => {
    if (addingChild) return;
    setModalOpen(false);
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const removeInterest = (interest: string) => {
    setSelectedInterests((prev) => prev.filter((i) => i !== interest));
  };

  const handleChildClick = (childId: string) => {
    navigate(`/settings/child/${encodeURIComponent(childId)}`);
  };

  const addChildMessageClass = useMemo(() => {
    const base = "mt-3 text-[11px]";
    if (!addChildMessage.text) return `${base} text-gray-500`;
    if (addChildMessage.tone === "error") return `${base} text-red-600`;
    if (addChildMessage.tone === "success") return `${base} text-emerald-600`;
    return `${base} text-gray-500`;
  }, [addChildMessage]);

  // ─────────────────────────────
  // Submit
  // ─────────────────────────────
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

    const birthdate = childBirthdate.trim() ? childBirthdate.trim() : null;

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
          birthdate,
          allergies: null,
          immunization_notes: null,
          medications: null,
          avatar_emoji: avatar,
          age_years: null,
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

      window.setTimeout(() => {
        setModalOpen(false);
        resetModal();
      }, 250);
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

  // ─────────────────────────────
  // Render
  // ─────────────────────────────
  return (
    <>
      <Snackbar
        open={snackbarOpen}
        message={snackbarMessage}
        onClose={() => setSnackbarOpen(false)}
      />

      <section className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900">Children</h2>
          <button
            type="button"
            onClick={openAddChild}
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
              const name = child.preferred_name || child.legal_name || "Child";
              const ageLabel = getAgeLabel(child.birthdate, child.age_years);

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
                      <p className="text-sm font-medium text-gray-900">{name}</p>
                      {ageLabel && (
                        <p className="text-xs text-gray-500">{ageLabel}</p>
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

        {!loadingChildren && !childrenError && children.length === 0 && (
          <div className="rounded-2xl border border-dashed border-black/10 bg-white/70 px-5 py-6 text-sm text-gray-600 text-center">
            <p className="mb-3">You haven’t added any children yet.</p>
            <button
              type="button"
              onClick={openAddChild}
              className="inline-flex items-center rounded-full bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-black"
            >
              Add your first child
            </button>
          </div>
        )}
      </section>

      <Modal isOpen={modalOpen} onClose={closeAddChild} title="Let’s add a child">
        <form onSubmit={handleAddChildSubmit} className="space-y-6 text-sm">
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
              disabled={addingChild}
            />
          </div>

          <div>
            <label
              htmlFor="childBirthdate"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Birthdate (optional)
            </label>
            <input
              id="childBirthdate"
              type="date"
              value={childBirthdate}
              onChange={(e) => setChildBirthdate(e.target.value)}
              className="block w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              disabled={addingChild}
            />
            <p className="mt-1 text-[11px] text-gray-500">
              Age shown on Wowzie is calculated from this date.
            </p>
          </div>

          <div>
            <p className="block text-xs font-medium text-gray-700 mb-2">
              Interests
            </p>

            {selectedInterests.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedInterests.map((interest) => (
                  <Tag
                    key={interest}
                    label={interest}
                    onRemove={() => removeInterest(interest)}
                    disabled={addingChild}
                  />
                ))}
              </div>
            ) : (
              <p className="mb-3 text-[11px] text-gray-500">
                Choose a few to personalize recommendations.
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              {INTEREST_OPTIONS.map((interest) => (
                <ToggleChip
                  key={interest}
                  label={interest}
                  selected={selectedInterests.includes(interest)}
                  onToggle={() => toggleInterest(interest)}
                  disabled={addingChild}
                />
              ))}
            </div>

            {addChildMessage.text && (
              <p className={addChildMessageClass}>{addChildMessage.text}</p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={closeAddChild}
              disabled={addingChild}
              className={cx(
                "flex-1 inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium",
                "bg-gray-100 text-gray-900 hover:bg-gray-200",
                "disabled:opacity-70 disabled:cursor-not-allowed"
              )}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={addingChild}
              className={cx(
                "flex-1 inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium text-white",
                "bg-gray-900 hover:bg-black",
                "disabled:opacity-70 disabled:cursor-not-allowed"
              )}
            >
              {addingChild ? "Saving…" : "Continue"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default SettingsChildrenPage;
