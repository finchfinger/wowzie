// src/pages/host/ActivityGuestsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/Button";
import { ActionsMenu } from "../../components/ui/ActionsMenu";
import { Input } from "../../components/ui/Input";
import type { ActivityOutletContext } from "./ActivityLayoutPage";

type BookingStatus = "pending" | "confirmed" | "declined" | "waitlisted";

type Child = {
  id: string;
  legal_name: string;
  preferred_name: string | null;
  birthdate: string | null;
  age_years: number | null;
  avatar_emoji: string | null;
};

type CampBookingRow = {
  id: string;
  camp_id: string;
  parent_id: string;
  child_id: string | null;
  status: BookingStatus;
  waitlist_position: number | null;
  created_at: string;
  updated_at: string;
  child: Child | null;
};

function computeAgeFromBirthdate(birthdate?: string | null): number | null {
  if (!birthdate) return null;
  const b = new Date(birthdate);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1;
  return age;
}

function whenLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfThatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfThatDay) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString();
}

type StatusFilter = "all" | BookingStatus;
type SortKey = "newest" | "name";

const STATUS_TABS: Array<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "confirmed", label: "Confirmed" },
  { id: "declined", label: "Declined" },
  { id: "waitlisted", label: "Waitlisted" },
];

function AddGuestModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [childName, setChildName] = useState("");
  const [parentEmail, setParentEmail] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setChildName("");
    setParentEmail("");
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />
      <div className="relative mx-auto mt-24 w-[92%] max-w-md rounded-2xl border border-black/10 bg-white p-5 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">Add guest</p>
            <p className="mt-1 text-xs text-gray-600">
              This is a placeholder UI. We can wire it to create a booking or invite flow next.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Child name
            </label>
            <Input
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              placeholder="Avery"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Parent email
            </label>
            <Input
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              placeholder="parent@example.com"
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="subtle" className="text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="text-xs bg-gray-900 text-white"
            onClick={onClose}
            disabled={!childName.trim() || !parentEmail.trim()}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

export const ActivityGuestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { activityId } = useParams<{ activityId: string }>();
  const { error } = useOutletContext<ActivityOutletContext>();

  const [rows, setRows] = useState<CampBookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      if (!activityId) return;

      setLoading(true);

      const query = supabase
        .from("camp_bookings")
        .select(
          `
          id,
          camp_id,
          parent_id,
          child_id,
          status,
          waitlist_position,
          created_at,
          updated_at,
          child:children!camp_bookings_child_id_fkey (
            id,
            legal_name,
            preferred_name,
            birthdate,
            age_years,
            avatar_emoji
          )
        `
        )
        .eq("camp_id", activityId)
        .not("child_id", "is", null)
        .order("created_at", { ascending: false })
        .returns<CampBookingRow[]>();

      const { data, error: dbError } = await query;

      if (!alive) return;

      if (dbError) {
        console.error("camp_bookings load error:", dbError);
        setRows([]);
        setLoading(false);
        return;
      }

      setRows(data ?? []);
      setLoading(false);
    };

    void load();

    return () => {
      alive = false;
    };
  }, [activityId]);

  const filteredRows = useMemo(() => {
    if (statusFilter === "all") return rows;
    return rows.filter((r) => r.status === statusFilter);
  }, [rows, statusFilter]);

  const sortedRows = useMemo(() => {
    const items = [...filteredRows];

    if (sortKey === "name") {
      items.sort((a, b) => {
        const aName = (a.child?.preferred_name || a.child?.legal_name || "Guest").toLowerCase();
        const bName = (b.child?.preferred_name || b.child?.legal_name || "Guest").toLowerCase();
        return aName.localeCompare(bName);
      });
      return items;
    }

    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return items;
  }, [filteredRows, sortKey]);

  const updateStatus = async (campBookingId: string, status: BookingStatus) => {
    setRows((prev) => prev.map((r) => (r.id === campBookingId ? { ...r, status } : r)));

    const { error: upError } = await supabase
      .from("camp_bookings")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", campBookingId);

    if (upError) {
      console.error("camp_bookings status update error:", upError);
      setRows((prev) =>
        prev.map((r) => (r.id === campBookingId ? { ...r, status: "pending" } : r))
      );
    }
  };

  if (error) return <p className="text-xs text-red-600">{error}</p>;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_TABS.map((t) => {
            const active = statusFilter === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setStatusFilter(t.id)}
                className={[
                  "rounded-full px-3 py-1.5 text-xs border",
                  active
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-black/10 hover:bg-gray-50",
                ].join(" ")}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <select
            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value === "name" ? "name" : "newest")}
          >
            <option value="newest">Newest</option>
            <option value="name">Name</option>
          </select>

          <Button
            variant="subtle"
            className="text-xs px-3 py-1.5"
            onClick={() => setAddOpen(true)}
          >
            Add guest
          </Button>

          <Button
            variant="subtle"
            className="text-xs px-3 py-1.5"
            onClick={() => {
              // placeholder hook, wire to bulk message or email later
              console.log("Send update clicked");
            }}
          >
            Send update
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-1">
        {loading ? (
          <div className="py-8 text-xs text-gray-500">Loading guests…</div>
        ) : sortedRows.length === 0 ? (
          <div className="py-8 text-xs text-gray-500">No guests yet.</div>
        ) : (
          sortedRows.map((r) => {
            const displayName =
              r.child?.preferred_name?.trim() || r.child?.legal_name?.trim() || "Guest";

            const age = r.child?.age_years ?? computeAgeFromBirthdate(r.child?.birthdate);
            const ageLabel = age != null ? `Age ${age}` : "Age —";
            const when = whenLabel(r.created_at);
            const emoji = r.child?.avatar_emoji || "🙂";
            const showApproveDecline = r.status === "pending";

            return (
              <div
                key={r.id}
                className="flex w-full items-center justify-between rounded-2xl border border-black/5 bg-white px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-yellow-100 flex items-center justify-center text-[13px]">
                    {emoji}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-medium text-gray-900">{displayName}</p>
                    <p className="text-xs text-gray-500">{ageLabel}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {showApproveDecline ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateStatus(r.id, "declined")}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Decline
                      </button>

                      <button
                        type="button"
                        onClick={() => updateStatus(r.id, "confirmed")}
                        className="inline-flex items-center rounded-full bg-emerald-500 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600"
                      >
                        Approve
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500 capitalize">{r.status}</span>
                  )}

                  <span className="text-xs text-gray-500">{when}</span>

                  <ActionsMenu
                    items={[
                      {
                        label: "View child",
                        onSelect: () => {
                          if (r.child?.id) navigate(`/host/children/${r.child.id}`);
                        },
                      },
                      { label: "Mark pending", onSelect: () => updateStatus(r.id, "pending") },
                      { label: "Confirm", onSelect: () => updateStatus(r.id, "confirmed") },
                      { label: "Decline", onSelect: () => updateStatus(r.id, "declined") },
                      { label: "Waitlist", onSelect: () => updateStatus(r.id, "waitlisted") },
                    ]}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      <AddGuestModal isOpen={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
};

export default ActivityGuestsPage;
