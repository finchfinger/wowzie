import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/Button";
import { ActionsMenu } from "../../components/ui/ActionsMenu";
import ShareWithEmailModal from "../../components/host/ShareWithEmailModal";

type Activity = {
  id: string;
  name: string;
  location?: string | null;
  price_cents?: number | null;
  image_url?: string | null;
};

type Tab = "overview" | "guests" | "more";

const mockGuests = [
  { id: "g1", name: "Liam (Scott) Rodriguez", age: 7, when: "Yesterday" },
  { id: "g2", name: "Sienna Rae", age: 7, when: "Yesterday" },
  { id: "g3", name: "Jalen Wright", age: 7, when: "Yesterday" },
  { id: "g4", name: "Elodie March", age: 7, when: "Yesterday" },
  { id: "g5", name: "Noah Williams", age: 7, when: "Yesterday" },
];

export const ActivityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState<string | null>(null);

  const [isShareOpen, setIsShareOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadActivity = async () => {
      if (!id) {
        if (isMounted) {
          setError("No activity id provided.");
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("camps")
        .select("id, name, location, price_cents, image_url")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error loading activity:", error);
        if (isMounted) {
          setError("Could not load this activity.");
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setActivity(data as Activity | null);
        setLoading(false);
      }
    };

    void loadActivity();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const title = activity?.name || "Awesome listing";
  const price = activity?.price_cents ? `$${(activity.price_cents / 100).toFixed(0)}` : "$320";
  const location = activity?.location || "Knowlwood Club, San Francisco, California";

  const handleShareByEmail = async (email: string) => {
    if (!activity?.id) throw new Error("Missing activity id");

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error("Not signed in");

    const payload = {
      activity_id: activity.id,
      inviter_user_id: authData.user.id,
      invitee_email: email,
      role: "viewer",
      status: "invited",
    };

    // Upsert so repeated invites do not create duplicates
    const { error: upsertError } = await supabase
      .from("activity_shares")
      .upsert(payload, { onConflict: "activity_id,invitee_email" });

    if (upsertError) throw upsertError;

    // Optional: later you can trigger an email via an Edge Function
    // For now, we just record the invite.
  };

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate("/host/listings")}
        className="text-xs text-gray-600 hover:text-gray-900 inline-flex items-center gap-1"
      >
        <span aria-hidden="true">←</span>
        Back to listings
      </button>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gray-200 overflow-hidden flex items-center justify-center text-[10px] text-gray-600">
            {activity?.image_url ? (
              <img src={activity.image_url} alt={title} className="h-full w-full object-cover" />
            ) : (
              "IMG"
            )}
          </div>
          <h1 className="text-lg font-semibold text-gray-900">
            {loading ? "Loading…" : title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button className="text-xs px-3 py-1.5">Edit listing</Button>
          <ActionsMenu
            items={[
              { label: "Event page", onSelect: () => console.log("Event page") },
              { label: "Share", onSelect: () => setIsShareOpen(true) },
              { label: "Send a blast", onSelect: () => console.log("Blast") },
              { label: "Duplicate listing", onSelect: () => console.log("Duplicate") },
              { label: "Delete event", onSelect: () => console.log("Delete") },
            ]}
          />
        </div>
      </div>

      <div className="flex gap-6 text-sm border-b border-gray-200">
        {(["overview", "guests", "more"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              tab === t
                ? "pb-2 border-b-2 border-gray-900 font-medium text-gray-900"
                : "pb-2 border-b-2 border-transparent text-gray-600 hover:text-gray-900"
            }
          >
            {t === "overview" && "Overview"}
            {t === "guests" && "Guests"}
            {t === "more" && "More"}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
          <div className="space-y-4">
            <div>
              <p className="font-medium text-gray-900">Thursday, September 4, 2025</p>
              <p className="text-gray-600">8:30 AM – 11:30 AM</p>
            </div>

            <div>
              <p className="font-medium text-gray-900">{price}</p>
              <p className="text-gray-600">Per session</p>
            </div>

            <div>
              <p className="font-medium text-gray-900">Stephanie Henry</p>
              <p className="text-gray-600">Host</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="font-medium text-gray-900">{location}</p>
              <p className="text-gray-600">Location</p>
            </div>

            <div>
              <p className="font-medium text-gray-900">6 of 12</p>
              <p className="text-gray-600">Registrations</p>
            </div>

            <div>
              <p className="font-medium text-gray-900">Private</p>
              <p className="text-gray-600">Listing type</p>
            </div>
          </div>
        </div>
      )}

      {tab === "guests" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700">
              <span className="mr-1 text-gray-500">↕︎</span>
              Age
            </button>
            <div className="flex gap-2">
              <Button variant="subtle" className="text-xs px-3 py-1.5">
                Add guest
              </Button>
              <Button variant="subtle" className="text-xs px-3 py-1.5">
                Send update
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            {mockGuests.map((guest) => (
              <button
                key={guest.id}
                type="button"
                onClick={() => navigate(`/host/guests/${guest.id}`)}
                className="flex w-full items-center justify-between rounded-2xl border border-violet-100 bg-white px-4 py-3 text-left text-xs hover:bg-violet-50"
              >
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full bg-yellow-100 flex items-center justify-center">
                    🙂
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{guest.name}</p>
                    <p className="text-gray-500">Age {guest.age}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-gray-500">{guest.when}</span>
                  <ActionsMenu
                    items={[
                      { label: "View guest detail", onSelect: () => navigate(`/host/guests/${guest.id}`) },
                      { label: "Message", onSelect: () => console.log("Message", guest.id) },
                      { label: "Remove", onSelect: () => console.log("Remove guest", guest.id) },
                    ]}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "more" && (
        <div className="space-y-8 text-xs max-w-2xl">
          <section className="space-y-2">
            <h2 className="font-semibold text-gray-900">Duplicate listing</h2>
            <p className="text-gray-600">
              Create a new event with the same information as this one. Everything except the guest list and event blasts
              will be copied over.
            </p>
            <Button className="text-xs px-3 py-1.5">Duplicate listing</Button>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-gray-900">Event page</h2>
            <p className="text-gray-600">
              When you choose a new URL, the current one will no longer work. Do not change your URL if you have already
              shared the event.
            </p>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
              <p className="text-xs text-gray-700">Upgrade to Wowzie Pro to set a custom URL for this event.</p>
              <Button variant="subtle" className="text-xs px-3 py-1.5">
                Learn more
              </Button>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-gray-900">Embed event</h2>
            <p className="text-gray-600">Have your own site? Embed the event to let visitors know about it.</p>
            <div className="relative rounded-lg border border-gray-200 bg-white p-3 font-mono text-[11px] text-gray-700">
              <button className="absolute right-3 top-3 rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px]">
                Copy code
              </button>
              <pre className="whitespace-pre-wrap break-all pr-20">
{`<a
  href="https://wowzie.com"
  class="wowzie-button"
  data-wowzie-action="return"
>
  Book to Wowzie
</a>

<script id="wowzie-return" src="https://wowzie.com/embed/button.js"></script>`}
              </pre>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold text-gray-900">Cancel event</h2>
            <p className="text-gray-600">
              Cancel and permanently delete this event. This operation cannot be undone. If there are any registered
              guests, we will notify them that the event has been cancelled.
            </p>
            <Button className="text-xs px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white">
              Cancel event
            </Button>
          </section>
        </div>
      )}

      <ShareWithEmailModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        activityTitle={title}
        onShare={handleShareByEmail}
      />
    </div>
  );
};

export default ActivityDetailPage;
