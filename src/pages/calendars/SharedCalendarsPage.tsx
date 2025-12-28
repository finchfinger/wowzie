import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Snackbar } from "../../components/ui/Snackbar";
import { CalendarCard } from "../../components/calendar/CalendarCard";

type SharedCalendarRow = {
  id: string;
  created_at: string;
  accepted_at: string | null;
  sender_id: string | null;
  recipient_user_id: string | null;
  status: string;
  share_url: string;
  message: string | null;
  email: string;
};

type ProfileLite = {
  id: string;
  full_name?: string | null;
  preferred_name?: string | null;
  display_name?: string | null;
  avatar_emoji?: string | null;
};

function useQueryParam(name: string) {
  const { search } = useLocation();
  return useMemo(() => {
    const sp = new URLSearchParams(search);
    return sp.get(name);
  }, [search, name]);
}

function formatDateShort(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function bestProfileName(p?: ProfileLite | null) {
  return (
    p?.preferred_name?.trim() ||
    p?.display_name?.trim() ||
    p?.full_name?.trim() ||
    null
  );
}

export const SharedCalendarsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = useQueryParam("token");

  const [items, setItems] = useState<SharedCalendarRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState("");

  const [senderProfiles, setSenderProfiles] = useState<Record<string, ProfileLite>>({});

  const showSnack = (msg: string) => {
    setSnackMessage(msg);
    setSnackOpen(true);
  };

  const loadSenderProfiles = async (senderIds: string[]) => {
    if (!senderIds.length) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, preferred_name, display_name, avatar_emoji")
      .in("id", senderIds);

    if (error) {
      console.warn("[SharedCalendars] profiles lookup failed:", error.message);
      return;
    }

    const map: Record<string, ProfileLite> = {};
    (data || []).forEach((p: any) => {
      if (p?.id) map[p.id] = p as ProfileLite;
    });
    setSenderProfiles((prev) => ({ ...prev, ...map }));
  };

  const loadShared = async () => {
    setLoading(true);
    setError(null);

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes.user) {
      setItems([]);
      setLoading(false);
      setError("Please sign in to view shared calendars.");
      return;
    }

    const userId = userRes.user.id;

    const { data, error: qErr } = await supabase
      .from("calendar_shares")
      .select(
        "id, created_at, accepted_at, sender_id, recipient_user_id, status, share_url, message, email"
      )
      .eq("recipient_user_id", userId)
      .in("status", ["accepted"])
      .order("accepted_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (qErr) {
      console.error("shared calendars query error", qErr);
      setError("Could not load shared calendars.");
      setItems([]);
      setLoading(false);
      return;
    }

    const rows = (data || []) as SharedCalendarRow[];
    setItems(rows);

    const senderIds = Array.from(
      new Set(rows.map((r) => r.sender_id).filter(Boolean) as string[])
    );
    await loadSenderProfiles(senderIds);

    setLoading(false);
  };

  // Accept token if present
  useEffect(() => {
    const acceptFromToken = async () => {
      if (!token) return;

      setAccepting(true);
      setError(null);

      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes.user) {
        setAccepting(false);
        setError("Please sign in to accept a shared calendar.");
        return;
      }

      const { data, error: fnErr } = await supabase.functions.invoke(
        "accept-calendar-share",
        { body: { token } }
      );

      if (fnErr) {
        console.error("accept-calendar-share error", fnErr);
        setAccepting(false);
        setError(fnErr.message || "Could not accept calendar.");
        return;
      }

      const ok = (data as any)?.ok;
      if (!ok) {
        setAccepting(false);
        setError((data as any)?.error || "Could not accept calendar.");
        return;
      }

      showSnack("Calendar added to Shared calendars.");
      navigate("/calendars/shared", { replace: true });

      setAccepting(false);
      await loadShared();
    };

    void acceptFromToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Load list on normal view
  useEffect(() => {
    void loadShared();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <div className="space-y-4">
      <Snackbar
        open={snackOpen}
        message={snackMessage}
        onClose={() => setSnackOpen(false)}
      />

      {(accepting || loading) && (
        <p className="text-sm text-gray-500">
          {accepting ? "Adding calendar…" : "Loading…"}
        </p>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {!loading && !items.length && !error && (
        <div className="rounded-2xl border border-black/5 bg-white p-4 text-sm text-gray-600">
          No shared calendars yet.
        </div>
      )}

      <div className="space-y-3">
        {items.map((row) => {
          const profile = row.sender_id ? senderProfiles[row.sender_id] : null;
          const who = bestProfileName(profile) || "Someone";
          const addedOn = formatDateShort(row.accepted_at || row.created_at);

          return (
            <CalendarCard
              key={row.id}
              title={`${who}’s calendar`}
              metaLine={addedOn ? `Added on ${addedOn}` : null}
              subtitle={row.message ? row.message : null}
              avatarEmoji={profile?.avatar_emoji ?? "📅"}
              onDetails={() => window.open(row.share_url, "_blank")}
              onMessage={() => showSnack("Messaging coming next.")}
              onRemove={() => showSnack("Remove flow coming next.")}
            />
          );
        })}
      </div>
    </div>
  );
};

export default SharedCalendarsPage;
