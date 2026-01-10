// src/pages/calendars/SharedCalendarsPage.tsx
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
  legal_name?: string | null;
  preferred_first_name?: string | null;
};

function useQueryParam(search: string, name: string) {
  const sp = new URLSearchParams(search);
  const v = sp.get(name);
  return v ? v.trim() : null;
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
  return p?.preferred_first_name?.trim() || p?.legal_name?.trim() || null;
}

function parseTime(s?: string | null) {
  if (!s) return 0;
  const t = Date.parse(s);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Dedupe accepted shares so we show one card per unique shared calendar.
 * Choose the most recent row by accepted_at then created_at.
 *
 * Key strategy:
 * - If sender_id exists: one calendar per sender
 * - Else: one calendar per share_url
 */
function dedupeShares(rows: SharedCalendarRow[]) {
  const byKey = new Map<string, SharedCalendarRow>();

  for (const r of rows) {
    const key = r.sender_id ? `sender:${r.sender_id}` : `url:${r.share_url}`;
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, r);
      continue;
    }

    const existingScore = Math.max(parseTime(existing.accepted_at), parseTime(existing.created_at));
    const newScore = Math.max(parseTime(r.accepted_at), parseTime(r.created_at));

    if (newScore >= existingScore) byKey.set(key, r);
  }

  return Array.from(byKey.values()).sort((a, b) => {
    const aScore = Math.max(parseTime(a.accepted_at), parseTime(a.created_at));
    const bScore = Math.max(parseTime(b.accepted_at), parseTime(b.created_at));
    return bScore - aScore;
  });
}

export const SharedCalendarsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Support old ?share= links and newer ?token=
  const token = useMemo(() => {
    const t = useQueryParam(location.search, "token");
    const s = useQueryParam(location.search, "share");
    return (t || s) ?? null;
  }, [location.search]);

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
      .select("id, legal_name, preferred_first_name")
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
      .select("id, created_at, accepted_at, sender_id, recipient_user_id, status, share_url, message, email")
      .eq("recipient_user_id", userId)
      .in("status", ["accepted"])
      .order("accepted_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (qErr) {
      console.error("[SharedCalendars] query error", qErr);
      setError("Could not load shared calendars.");
      setItems([]);
      setLoading(false);
      return;
    }

    const rows = (data || []) as SharedCalendarRow[];
    const deduped = dedupeShares(rows);

    setItems(deduped);

    const senderIds = Array.from(new Set(deduped.map((r) => r.sender_id).filter(Boolean) as string[]));
    await loadSenderProfiles(senderIds);

    setLoading(false);
  };

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

      const { data, error: fnErr } = await supabase.functions.invoke("accept-calendar-share", {
        body: { token },
      });

      if (fnErr) {
        console.error("[SharedCalendars] accept-calendar-share error", fnErr);
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

      // Important for UX: remove token/share from URL
      navigate("/calendars/shared", { replace: true });

      setAccepting(false);
      await loadShared();
    };

    void acceptFromToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    void loadShared();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleMessage = (row: SharedCalendarRow) => {
    if (!row.sender_id) {
      showSnack("Could not open messages for this person.");
      return;
    }

    const params = new URLSearchParams();
    params.set("to", row.sender_id);
    params.set("context", "calendar_share");
    params.set("share_id", row.id);

    navigate(`/messages?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <Snackbar open={snackOpen} message={snackMessage} onClose={() => setSnackOpen(false)} />

      {(accepting || loading) && (
        <p className="text-sm text-gray-500">{accepting ? "Adding calendar…" : "Loading…"}</p>
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
          const name = bestProfileName(profile);

          // Never show "email" as the title.
          const title = name ? `${name}’s calendar` : "Shared calendar";

          const addedOn = formatDateShort(row.accepted_at || row.created_at);

          return (
            <CalendarCard
              key={row.id}
              title={title}
              metaLine={addedOn ? `Added on ${addedOn}` : null}
              subtitle={row.message ? row.message : null}
              avatarEmoji={"📅"}
              onDetails={() => window.open(row.share_url, "_blank")}
              onMessage={() => handleMessage(row)}
              onRemove={() => showSnack("Remove flow coming next.")}
            />
          );
        })}
      </div>
    </div>
  );
};

export default SharedCalendarsPage;
