// src/pages/host/ActivityGuestDetailPage.tsx
import React from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { GuestApprovalBanner } from "../../components/activity/GuestApprovalBanner";

type GuestDetail = {
  id: string;
  emoji: string;
  fullName: string;
  preferredName?: string | null;
  birthdayLabel?: string | null;
  ageLabel?: string | null;
  parentName?: string | null;
  phone?: string | null;
  email?: string | null;
  allergies?: string[];
  medications?: string[];
  medicalConditions?: string[];
  status?: "pending" | "approved" | "declined";
};

export const ActivityGuestDetailPage: React.FC = () => {
  const { guestId } = useParams<{ guestId: string }>();

  // TODO: replace this with a Supabase query using guestId
  const guest: GuestDetail = {
    id: guestId || "demo-guest",
    emoji: "🧜‍♂️",
    fullName: "Liam (Scott) Rodriguez",
    preferredName: "Scott",
    birthdayLabel: "June 3",
    ageLabel: "Age 8",
    parentName: "Scott",
    phone: "+1 773 844 4459",
    email: "rodrigogo@gmail.com",
    allergies: ["Peanuts", "Tree nuts", "Shellfish"],
    medications: ["Claritin"],
    medicalConditions: ["Stupidity"],
    status: "pending",
  };

  const handleApprove = () => {
    // TODO: call Supabase to mark registration as approved
    console.log("Approve guest", guest.id);
  };

  const handleDecline = () => {
    // TODO: call Supabase to mark registration as declined
    console.log("Decline guest", guest.id);
  };

  const handleDismissBanner = () => {
    // Could track a local "banner dismissed" state if needed
    console.log("Dismiss approval banner");
  };

  return (
    <main className="flex-1 bg-violet-50">
      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Back link */}
        <div className="text-xs text-gray-500">
          <Link
            to="/host/listings"
            className="inline-flex items-center gap-1 hover:text-gray-700"
          >
            <span aria-hidden="true">←</span>
            Back to Listings
          </Link>
        </div>

        {/* Header + actions */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <span className="text-2xl">{guest.emoji}</span>
              <span>{guest.fullName}</span>
            </h1>
          </div>

          <Button variant="outline" className="text-sm">
            Send message
          </Button>
        </div>

        {/* Approval banner */}
        <GuestApprovalBanner
          status={guest.status ?? "pending"}
          onApprove={handleApprove}
          onDecline={handleDecline}
          onDismiss={handleDismissBanner}
        />

        {/* Basic information */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Basic information
          </h2>
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs text-gray-800 space-y-4">
            <div>
              <div className="font-semibold text-gray-900">Name</div>
              <div>{guest.fullName.replace(guest.emoji, "").trim()}</div>
            </div>

            <div>
              <div className="font-semibold text-gray-900">
                Preferred first name
              </div>
              <div>{guest.preferredName || "—"}</div>
            </div>

            <div>
              <div className="font-semibold text-gray-900">Birthday</div>
              <div>
                {guest.birthdayLabel}{" "}
                {guest.ageLabel && (
                  <span className="text-gray-500">({guest.ageLabel})</span>
                )}
              </div>
            </div>

            <div>
              <div className="font-semibold text-gray-900">Parent</div>
              <div>{guest.parentName || "—"}</div>
            </div>
          </div>
        </section>

        {/* Contact information */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Contact information
          </h2>
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs text-gray-800 space-y-4">
            <div>
              <div className="font-semibold text-gray-900">Telephone number</div>
              <div>{guest.phone || "—"}</div>
            </div>

            <div>
              <div className="font-semibold text-gray-900">Email address</div>
              <div>{guest.email || "—"}</div>
            </div>
          </div>
        </section>

        {/* Health and safety */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Health and safety
          </h2>
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs text-gray-800 space-y-6">
            <div>
              <div className="font-semibold text-gray-900">Allergies</div>
              {guest.allergies && guest.allergies.length > 0 ? (
                <ul className="list-disc pl-5 space-y-0.5">
                  {guest.allergies.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <div>None</div>
              )}
            </div>

            <div>
              <div className="font-semibold text-gray-900">Medications</div>
              {guest.medications && guest.medications.length > 0 ? (
                <ul className="list-disc pl-5 space-y-0.5">
                  {guest.medications.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <div>None</div>
              )}
            </div>

            <div>
              <div className="font-semibold text-gray-900">
                Medical conditions
              </div>
              {guest.medicalConditions &&
              guest.medicalConditions.length > 0 ? (
                <ul className="list-disc pl-5 space-y-0.5">
                  {guest.medicalConditions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <div>None</div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default ActivityGuestDetailPage;
