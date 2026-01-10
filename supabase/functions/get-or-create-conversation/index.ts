/// <reference lib="deno.ns" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Body = {
  to_profile_id?: string | null;
  participant_profile_ids?: string[] | null; // optional, but supported
};

const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://wowzie.kids",
  "https://www.wowzie.kids",
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : origin || "http://localhost:5173";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    Vary: "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

function json(req: Request, status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr));
}

function normalizeIds(ids: string[]) {
  return uniq(ids.map((s) => (s ?? "").trim()).filter(Boolean));
}

function bestProfileName(p?: { preferred_first_name?: string | null; legal_name?: string | null } | null) {
  return p?.preferred_first_name?.trim() || p?.legal_name?.trim() || null;
}

async function getProfileLite(
  supabaseAdmin: any,
  id: string
): Promise<{ id: string; preferred_first_name: string | null; legal_name: string | null } | null> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, preferred_first_name, legal_name")
    .eq("id", id)
    .maybeSingle();

  return (data ?? null) as any;
}

async function getMyUser(req: Request, supabaseUrl: string, anonKey: string) {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return { ok: false, error: "Unauthorized (missing Authorization header)." };

  const supabaseAuth = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await supabaseAuth.auth.getUser();
  if (error || !data.user) return { ok: false, error: "Unauthorized (invalid session)." };
  return { ok: true, user: data.user };
}

/**
 * Ensures a per-user conversation row exists:
 * - ownerUserId is conversations.user_id
 * - participantId is conversations.participant_profile_id
 */
async function ensureConversationRow(
  supabaseAdmin: any,
  ownerUserId: string,
  participantId: string,
  participantDisplayName: string
) {
  const { data: existing } = await supabaseAdmin
    .from("conversations")
    .select(
      "id, participant_name, avatar_emoji, last_message_preview, last_message_at, unread_count, participant_profile_id, camp_slug, camp_name, updated_at"
    )
    .eq("user_id", ownerUserId)
    .eq("participant_profile_id", participantId)
    .maybeSingle();

  if (existing?.id) return existing;

  const { data: created, error: createErr } = await supabaseAdmin
    .from("conversations")
    .insert({
      user_id: ownerUserId,
      participant_profile_id: participantId,
      participant_name: participantDisplayName || "New message",
      avatar_emoji: "💬",
      last_message_preview: "",
      last_message_at: null,
      unread_count: 0,
      camp_slug: null,
      camp_name: null,
    })
    .select(
      "id, participant_name, avatar_emoji, last_message_preview, last_message_at, unread_count, participant_profile_id, camp_slug, camp_name, updated_at"
    )
    .single();

  if (!createErr && created?.id) return created;

  const { data: existing2 } = await supabaseAdmin
    .from("conversations")
    .select(
      "id, participant_name, avatar_emoji, last_message_preview, last_message_at, unread_count, participant_profile_id, camp_slug, camp_name, updated_at"
    )
    .eq("user_id", ownerUserId)
    .eq("participant_profile_id", participantId)
    .maybeSingle();

  if (existing2?.id) return existing2;

  throw new Error(createErr?.message || "Could not create conversation row.");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders(req) });
  }

  try {
    if (req.method !== "POST") return json(req, 405, { ok: false, error: "Method not allowed" });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return json(req, 500, { ok: false, error: "Missing Supabase env vars." });
    }

    const payload = (await req.json()) as Body;

    const meRes = await getMyUser(req, SUPABASE_URL, SUPABASE_ANON_KEY);
    if (!meRes.ok) return json(req, 401, { ok: false, error: (meRes as any).error });

    const meId = String((meRes as any).user.id);

    let otherId: string | null = null;

    // Backward compatible path for your existing frontend
    if (payload.to_profile_id) {
      otherId = String(payload.to_profile_id).trim() || null;
    } else if (payload.participant_profile_ids && Array.isArray(payload.participant_profile_ids)) {
      const ids = normalizeIds(payload.participant_profile_ids);
      if (ids.length !== 2) return json(req, 400, { ok: false, error: "participant_profile_ids must be exactly 2 UUIDs." });
      if (!ids.includes(meId)) return json(req, 403, { ok: false, error: "You must be a participant in the conversation." });
      otherId = ids.find((x) => x !== meId) ?? null;
    }

    if (!otherId) return json(req, 400, { ok: false, error: "Missing to_profile_id." });
    if (otherId === meId) return json(req, 400, { ok: false, error: "You cannot message yourself." });

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const otherProfile = await getProfileLite(supabaseAdmin, otherId);
    const otherName = bestProfileName(otherProfile) || "New message";

    const convo = await ensureConversationRow(supabaseAdmin, meId, otherId, otherName);

    return json(req, 200, { ok: true, conversation: convo });
  } catch (e) {
    console.error("get-or-create-conversation unexpected error", e);
    return json(req, 500, { ok: false, error: "Unexpected error." });
  }
});
