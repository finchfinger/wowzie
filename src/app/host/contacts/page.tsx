"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

type HostContact = {
  id: string;
  host_id: string;
  parent_name: string;
  email: string;
  phone: string | null;
  created_at: string | null;
};

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (!digits) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function formatPhoneForDisplay(value: string | null): string {
  if (!value) return "";
  if (/[()-]/.test(value)) return value;
  return formatPhoneInput(value);
}

export default function HostContactsPage() {
  const [contacts, setContacts] = useState<HostContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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

      const { data, error: contactsError } = await supabase
        .from("host_contacts")
        .select("id, host_id, parent_name, email, phone, created_at")
        .eq("host_id", userData.user.id)
        .order("parent_name", { ascending: true });

      if (contactsError) {
        setError("We couldn't load your contacts.");
        setLoading(false);
        return;
      }

      setContacts((data || []) as HostContact[]);
      setLoading(false);
    };

    void load();
  }, []);

  const resetModal = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setSendInvite(false);
  };

  const handleAddPerson = async () => {
    if (!fullName.trim()) return;
    setSaving(true);
    setError(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setError("You need to be signed in to add contacts.");
      setSaving(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("host_contacts")
      .insert({
        host_id: userData.user.id,
        parent_name: fullName.trim(),
        email: email.trim() || "",
        phone: phone.trim() || null,
      })
      .select("id, host_id, parent_name, email, phone, created_at")
      .single();

    if (insertError) {
      setError("We couldn't add this person. Please try again.");
      setSaving(false);
      return;
    }

    setContacts((prev) => [...prev, data as HostContact]);
    setSaving(false);
    setIsAddOpen(false);
    resetModal();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Contacts</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Families who have booked or reached out about your activities.
          </p>
        </div>
        <Button size="sm" onClick={() => setIsAddOpen(true)}>Add person</Button>
      </div>

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Contact list */}
      <div className="rounded-2xl">
        {loading ? (
          <div className="px-5 py-6 text-sm text-muted-foreground">Loading contacts…</div>
        ) : contacts.length === 0 ? (
          <div className="px-5 py-6 text-sm text-muted-foreground">
            You don&apos;t have any contacts yet. New bookings will show up here, or you can add someone manually.
          </div>
        ) : (
          <div className="">
            {contacts.map((contact) => (
              <div key={contact.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{contact.parent_name}</p>
                  <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <span>{contact.email}</span>
                    {contact.phone && (
                      <span>• {formatPhoneForDisplay(contact.phone)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add person modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label="Close" onClick={() => setIsAddOpen(false)} className="absolute inset-0 bg-black/30" />
          <div className="relative mx-auto mt-24 w-[92%] max-w-md rounded-2xl bg-background p-5 shadow-lg">
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-foreground">Add a person</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add a parent or caregiver to your contacts.
                </p>
              </div>

              <div className="space-y-3 text-xs">
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
                <label className="mt-1 inline-flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={sendInvite}
                    onCheckedChange={(checked) => setSendInvite(checked === true)}
                  />
                  <span className="text-xs text-muted-foreground">
                    I&apos;d like to send them an invite later
                  </span>
                </label>
              </div>

              <div className="pt-2 flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={handleAddPerson} disabled={saving || !fullName.trim()}>
                  {saving ? "Adding…" : "Add person"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
