// src/pages/settings/SettingsAccountPage.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/ui/Card";
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

/** Thin card-section header */
const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({
  title,
  subtitle,
}) => (
  <div className="px-4 sm:px-5 py-3 border-b border-black/5">
    <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
    {subtitle && (
      <p className="mt-0.5 text-[11px] text-gray-500">{subtitle}</p>
    )}
  </div>
);

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
        setError("We couldn't load your profile right now.");
        setLoading(false);
        return;
      }

      const withEmail: Profile = {
        ...(data as Profile),
        email: (data as Profile)?.email ?? user.email ?? null,
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

    const { error: saveError } = await supabase
      .from("profiles")
      .update({ [fieldKey]: newValue })
      .eq("id", profile.id);

    if (saveError) {
      console.error("Error updating profile field:", saveError);
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
        <Card className="px-4 sm:px-5 py-3 text-xs text-red-700 !bg-red-50">
          {error}
        </Card>
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

      {/* ── Name ─────────────────────────────────────────────────── */}
      <Card>
        <SectionHeader
          title="Name"
          subtitle="Your legal name is used for bookings and identity verification. Your preferred name is how Wowzie addresses you."
        />

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
          placeholder="Same as legal name"
          helper="This is how we'll address you across Wowzie."
          onSave={handleFieldSave}
        />
      </Card>

      {/* ── Contact ──────────────────────────────────────────────── */}
      <Card>
        <SectionHeader
          title="Contact"
          subtitle="Used for booking confirmations and account alerts."
        />

        <EditableFieldRow
          label="Email address"
          value={profile.email}
          fieldKey="email"
          placeholder="Not added"
          onSave={handleFieldSave}
        />

        <EditableFieldRow
          label="Phone"
          value={profile.phone}
          fieldKey="phone"
          placeholder="Not added"
          helper="Shared with confirmed guests and Wowzie for support."
          onSave={handleFieldSave}
        />
      </Card>

      {/* ── Address ──────────────────────────────────────────────── */}
      <Card>
        <SectionHeader
          title="Address"
          subtitle="Used to show you nearby activities and for billing."
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
      </Card>

      {/* ── About ────────────────────────────────────────────────── */}
      <Card>
        <SectionHeader
          title="About"
          subtitle="Shown on your public profile and to hosts when you book."
        />

        <EditableFieldRow
          label="Bio"
          value={profile.about}
          fieldKey="about"
          multiline
          placeholder="Tell families a bit about yourself."
          onSave={handleFieldSave}
        />
      </Card>

      {/* ── Deactivate ───────────────────────────────────────────── */}
      <Card>
        <SectionHeader title="Deactivate account" />
        <div className="px-4 sm:px-5 py-4 text-xs text-gray-700 space-y-3">
          <p>
            Permanently delete your account and all associated data. This
            cannot be undone. Any active listings will be cancelled and guests
            will be notified.
          </p>
          <button
            type="button"
            className="inline-flex items-center rounded-full bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700"
          >
            Deactivate account
          </button>
        </div>
      </Card>

    </section>
  );
};
