// src/pages/host/HostContactsPage.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { Input } from "../../components/ui/Input";
import { Checkbox } from "../../components/ui/Checkbox";

type HostContact = {
  id: string;
  host_id: string;
  parent_name: string;
  email: string;
  phone: string | null;
  created_at: string | null;
};

// --- Phone helpers ---------------------------------------------------------

/**
 * Format a US-style phone string as the user types.
 * "3125551212" -> "(312) 555-1212"
 */
function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10); // max 10 digits

  if (!digits) return "";

  if (digits.length <= 3) {
    return `(${digits}`;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Format phone when displaying in the list (safe if already formatted).
 */
function formatPhoneForDisplay(value: string | null): string {
  if (!value) return "";
  // If it already looks formatted, just return it
  if (/[()\-]/.test(value)) return value;
  return formatPhoneInput(value);
}

// ---------------------------------------------------------------------------

export const HostContactsPage: React.FC = () => {
  const [contacts, setContacts] = useState<HostContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sendInvite, setSendInvite] = useState(false); // UX only for now
  const [saving, setSaving] = useState(false);

  // load contacts for the current host
  useEffect(() => {
    const loadContacts = async () => {
      setLoading(true);
      setError(null);

      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        console.error("Error getting user:", userError);
        setError("We couldn’t load your account.");
        setLoading(false);
        return;
      }

      const hostId = userData.user.id;

      const { data, error: contactsError } = await supabase
        .from("host_contacts")
        .select(
          `
          id,
          host_id,
          parent_name,
          email,
          phone,
          created_at
        `
        )
        .eq("host_id", hostId)
        .order("parent_name", { ascending: true });

      if (contactsError) {
        console.error("Error loading host contacts:", contactsError);
        setError("We couldn’t load your contacts.");
        setLoading(false);
        return;
      }

      setContacts((data || []) as HostContact[]);
      setLoading(false);
    };

    loadContacts();
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

    const hostId = userData.user.id;

    const { data, error: insertError } = await supabase
      .from("host_contacts")
      .insert({
        host_id: hostId,
        parent_name: fullName.trim(),
        email: email.trim() || "", // column is NOT NULL
        phone: phone.trim() || null
      })
      .select(
        `
        id,
        host_id,
        parent_name,
        email,
        phone,
        created_at
      `
      )
      .single();

    if (insertError) {
      console.error("Error inserting host contact:", insertError);
      setError("We couldn’t add this person. Please try again.");
      setSaving(false);
      return;
    }

    setContacts((prev) => [...prev, data as HostContact]);
    setSaving(false);
    setIsAddOpen(false);
    resetModal();

    // later: if (sendInvite) -> call edge function/server to send an email
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneInput(e.target.value);
    setPhone(formatted);
  };

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Contacts</h2>
          <p className="mt-1 text-xs text-gray-600">
            Families who have booked or reached out about your activities.
          </p>
        </div>
        <Button size="sm" onClick={() => setIsAddOpen(true)}>
          Add person
        </Button>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Table / list */}
      <div className="rounded-3xl bg-white border border-black/5 shadow-sm">
        {loading ? (
          <div className="px-5 py-6 text-sm text-gray-600">
            Loading contacts…
          </div>
        ) : contacts.length === 0 ? (
          <div className="px-5 py-6 text-sm text-gray-600">
            You don’t have any contacts yet. New bookings will show up here, or
            you can add someone manually.
          </div>
        ) : (
          <div className="divide-y divide-black/5">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="px-5 py-3 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {contact.parent_name}
                  </p>
                  <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-gray-500">
                    <span>{contact.email}</span>
                    {contact.phone && (
                      <span className="text-gray-400">
                        • {formatPhoneForDisplay(contact.phone)}
                      </span>
                    )}
                  </div>
                </div>
                {/* Future chips: “Repeat family”, “Has balance”, etc. */}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add person modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} size="sm">
        <div className="space-y-5">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Add a person
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Add a parent or caregiver to your contacts. You can link them to
              campers and bookings later.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <Field label="Parent / caregiver name" required>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </Field>

            <Field label="Email address">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            <Field label="Phone number" hint="We’ll format this for US numbers.">
              <Input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
              />
            </Field>

            <label className="mt-1 inline-flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={sendInvite}
                onChange={(e) => setSendInvite(e.target.checked)}
              />
              <span className="text-xs text-gray-700">
                I’d like to send them an invite later
              </span>
            </label>
          </div>

          <div className="pt-2">
            <Button
              className="w-full"
              onClick={handleAddPerson}
              disabled={saving || !fullName.trim()}
            >
              {saving ? "Adding…" : "Add person"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default HostContactsPage;
