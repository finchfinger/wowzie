// src/components/host/AddPersonModal.tsx
import React, { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { supabase } from "../../lib/supabase";

export type HostContact = {
  id: string;
  host_id: string;
  parent_name: string;
  email: string;
  phone: string | null;
  last_activity_name: string | null;
  last_booking_at: string | null;
  notes: string | null;
  created_at: string;
};

type AddPersonModalProps = {
  isOpen: boolean;
  onClose: () => void;
  hostId: string; // current host user id
  onCreated?: (contact: HostContact) => void;
};

export const AddPersonModal: React.FC<AddPersonModalProps> = ({
  isOpen,
  onClose,
  hostId,
  onCreated
}) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sendInvite, setSendInvite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setSendInvite(false);
    setError(null);
  };

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostId) {
      setError("We couldn’t find your host account.");
      return;
    }
    if (!fullName.trim() || !email.trim()) {
      setError("Full name and email are required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from("host_contacts")
        .insert([
          {
            host_id: hostId,
            parent_name: fullName.trim(),
            email: email.trim(),
            phone: phone.trim() || null,
            last_activity_name: null,
            last_booking_at: null,
            notes: null
          }
        ])
        .select()
        .single();

      if (insertError) {
        console.error("Error inserting host contact:", insertError);
        setError("We couldn’t add this person. Please try again.");
        setLoading(false);
        return;
      }

      if (data && onCreated) {
        onCreated(data as HostContact);
      }

      // TODO: send invitation email if sendInvite === true
      // (can be a Supabase function or backend endpoint later)

      setLoading(false);
      reset();
      onClose();
    } catch (err) {
      console.error("Unexpected error adding contact:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="sm">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Add a person
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Add someone who isn’t on Wowzie yet. You can invite them later
            or link them to activities.
          </p>
        </div>

        {/* Fields */}
        <div className="space-y-4 text-sm">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">
              Full name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="block w-full rounded-xl border border-black/10 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-xl border border-black/10 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">
              Phone number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="block w-full rounded-xl border border-black/10 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder=""
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              checked={sendInvite}
              onChange={(e) => setSendInvite(e.target.checked)}
            />
            <span>Send invitation email</span>
          </label>
        </div>

        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}

        {/* Footer */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            className="w-full justify-center"
            disabled={loading}
          >
            {loading ? "Adding…" : "Add person"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
