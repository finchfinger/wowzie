"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ContentCard } from "@/components/ui/ContentCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SortDropdown } from "@/components/ui/SortDropdown";
import { GuestRosterItem, type GuestRosterItemData } from "@/components/host/GuestRosterItem";
import { RowSkeletons } from "@/components/ui/skeleton";

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (!digits) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

type SortOrder = "asc" | "desc";

const GUEST_SORT_OPTIONS = [
  { value: "asc" as SortOrder,  label: "Alphabetical (A–Z)" },
  { value: "desc" as SortOrder, label: "Alphabetical (Z–A)" },
];

export default function HostGuestsPage() {
  const [guests, setGuests] = useState<GuestRosterItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Add person modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [childrenCount, setChildrenCount] = useState("0");
  const [sendInvite, setSendInvite] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        setError("We couldn't load your account.");
        setLoading(false);
        return;
      }
      const { data, error: dbError } = await supabase
        .from("host_contacts")
        .select("id, parent_name, email, phone, children_count, last_activity_name")
        .eq("host_id", userData.user.id)
        .order("parent_name", { ascending: true });

      if (dbError) {
        setError("We couldn't load your guests.");
        setLoading(false);
        return;
      }
      setGuests((data || []) as GuestRosterItemData[]);
      setLoading(false);
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    let list = guests;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (g) =>
          g.parent_name.toLowerCase().includes(q) ||
          g.email.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const cmp = a.parent_name.localeCompare(b.parent_name);
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [guests, search, sortOrder]);

  const resetModal = () => {
    setFullName(""); setEmail(""); setPhone(""); setChildrenCount("0"); setSendInvite(false);
  };

  const handleAddPerson = async () => {
    if (!fullName.trim()) return;
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setSaving(false); return; }
    const { data, error: insertError } = await supabase
      .from("host_contacts")
      .insert({
        host_id: userData.user.id,
        parent_name: fullName.trim(),
        email: email.trim() || "",
        phone: phone.trim() || null,
        children_count: parseInt(childrenCount, 10) || 0,
      })
      .select("id, parent_name, email, phone, children_count, last_activity_name")
      .single();
    if (insertError) { setError("We couldn't add this person."); setSaving(false); return; }
    setGuests((prev) =>
      [...prev, data as GuestRosterItemData].sort((a, b) =>
        a.parent_name.localeCompare(b.parent_name)
      )
    );
    setSaving(false);
    setIsAddOpen(false);
    resetModal();
  };

  return (
    <>
      <ContentCard
        title="My guests"
        bordered={false}
        bodyClassName="px-8 pb-8"
        actions={
          <Button size="sm" onClick={() => setIsAddOpen(true)}>
            Add person
          </Button>
        }
      >
        {loading ? (
          <RowSkeletons count={3} className="mt-4" />
        ) : guests.length === 0 ? (
          <EmptyState
            icon="child_hat"
            iconBg="bg-yellow-300"
            iconColor="text-yellow-900"
            title="No guests yet"
            description="New bookings will show up here, or you can add someone manually."
            action={{ label: "Add a person", onClick: () => setIsAddOpen(true) }}
          />
        ) : (
          <>
            {/* Search + sort */}
            <div className="mt-4 flex items-center gap-2">
              <div className="relative flex-1">
                <span className="material-symbols-rounded pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground select-none" style={{ fontSize: 16 }}>search</span>
                <Input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search"
                  className="h-9 pl-8"
                />
              </div>
              <SortDropdown
                options={GUEST_SORT_OPTIONS}
                value={sortOrder}
                onChange={setSortOrder}
              />
            </div>

            {/* Guest rows */}
            <div className="mt-4 divide-y divide-border/50">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No guests match &ldquo;{search}&rdquo;
                </p>
              ) : (
                filtered.map((guest) => (
                  <GuestRosterItem key={guest.id} guest={guest} />
                ))
              )}
            </div>
          </>
        )}
      </ContentCard>

      {error && (
        <p className="mt-3 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Add person modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close"
            onClick={() => { setIsAddOpen(false); resetModal(); }}
            className="absolute inset-0 bg-black/30"
          />
          <div className="relative mx-auto mt-24 w-[92%] max-w-md rounded-card bg-background p-5 shadow-lg">
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-foreground">Add a person</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add a parent or caregiver to your guests.
                </p>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Parent / caregiver name *</label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Email address</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Phone number</label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Number of children</label>
                  <Input
                    type="number"
                    min="0"
                    value={childrenCount}
                    onChange={(e) => setChildrenCount(e.target.value)}
                  />
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={sendInvite}
                    onCheckedChange={(v) => setSendInvite(v === true)}
                  />
                  <span className="text-xs text-muted-foreground">Send them an invite later</span>
                </label>
              </div>
              <div className="pt-2 flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => { setIsAddOpen(false); resetModal(); }}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAddPerson} disabled={saving || !fullName.trim()}>
                  {saving ? "Adding…" : "Add person"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
