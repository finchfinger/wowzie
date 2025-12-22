// src/pages/settings/SettingsAccountPage.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { EditableFieldRow } from "../../components/settings/EditableFieldRow";

type Profile = {
  id: string;
  legal_name: string | null;
  preferred_first_name: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  about: string | null;
};

export const SettingsAccountPage: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (userError || !user) {
        setError("You need to be signed in to view your account.");
        setLoading(false);
        return;
      }

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, legal_name, preferred_first_name, email, phone, address_line1, address_line2, city, state, postal_code, country, about"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (profileError) {
        console.error("Error loading profile:", profileError);
        setError("We couldn’t load your profile right now.");
        setLoading(false);
        return;
      }

      const withEmail: Profile = {
        ...(data as Profile),
        email: (data as any)?.email ?? user.email,
      };

      setProfile(withEmail);
      setLoading(false);
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleFieldSave = async (
    fieldKey: string,
    newValue: string | null
  ) => {
    if (!profile) return;

    const { error } = await supabase
      .from("profiles")
      .update({ [fieldKey]: newValue })
      .eq("id", profile.id);

    if (error) {
      console.error("Error updating profile field:", error);
      // You could show a toast here later.
      return;
    }

    setProfile({ ...profile, [fieldKey]: newValue });
  };

  if (loading) {
    return (
      <section className="space-y-4 text-xs text-gray-500">
        Loading your account…
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-4">
        <div className="rounded-2xl bg-red-50 border border-red-200 px-4 sm:px-5 py-3 text-xs text-red-700">
          {error}
        </div>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="space-y-4 text-xs text-gray-500">
        No profile found for this account.
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {/* Personal info card */}
      <div className="rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-5 py-3 text-sm font-semibold border-b border-black/5">
          Personal information
        </div>

        <EditableFieldRow
          label="Legal name"
          value={profile.legal_name}
          fieldKey="legal_name"
          placeholder="Not set"
          onSave={handleFieldSave}
        />

        <EditableFieldRow
          label="Preferred first name"
          value={profile.preferred_first_name}
          fieldKey="preferred_first_name"
          placeholder="Not set"
          onSave={handleFieldSave}
        />

        <EditableFieldRow
          label="Phone"
          value={profile.phone}
          fieldKey="phone"
          placeholder="Not added"
          helper="Contact number for confirmed guests and Wowzie to get in touch."
          onSave={handleFieldSave}
        />

        <EditableFieldRow
          label="Email address"
          value={profile.email}
          fieldKey="email"
          placeholder="Not added"
          onSave={handleFieldSave}
        />

        <EditableFieldRow
          label="Address line 1"
          value={profile.address_line1}
          fieldKey="address_line1"
          placeholder="Street address"
          onSave={handleFieldSave}
        />

        <EditableFieldRow
          label="Address line 2"
          value={profile.address_line2}
          fieldKey="address_line2"
          placeholder="Apartment, suite, etc. (optional)"
          onSave={handleFieldSave}
        />

        <EditableFieldRow
          label="City"
          value={profile.city}
          fieldKey="city"
          onSave={handleFieldSave}
        />

        <EditableFieldRow
          label="State"
          value={profile.state}
          fieldKey="state"
          onSave={handleFieldSave}
        />

        <EditableFieldRow
          label="Postal code"
          value={profile.postal_code}
          fieldKey="postal_code"
          onSave={handleFieldSave}
        />

        <EditableFieldRow
          label="Country"
          value={profile.country}
          fieldKey="country"
          onSave={handleFieldSave}
        />

        <EditableFieldRow
          label="About"
          value={profile.about}
          fieldKey="about"
          multiline
          placeholder="Tell families a bit about your background and experience."
          onSave={handleFieldSave}
        />
      </div>

      {/* Deactivate account card – unchanged */}
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
  );
};
