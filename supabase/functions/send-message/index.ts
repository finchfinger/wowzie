/// <reference lib="deno.ns" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Body = {
  to_profile_id?: string | null;
  body?: string | null;
  image_url?: string | null;
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

function toPreview(text: string) {
  return String(text ?? "").trim().slice(0, 140);
}

function bestProfileName(p?: { preferred_first_name?: string | null; legal_name?: string | null } | null) {
  return p?.preferred_first_name?.trim() || p?.legal_name?.trim() || null;
}

async function getProfileLite(supabaseAdmin: any, id: string) {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, preferred_first_name, legal_name")
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
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

    const toId = String(payload.to_profile_id ?? "").trim();
    if (!toId) return json(req, 400, { ok: false, error: "Missing to_profile_id." });
    if (toId === meId) return json(req, 400, { ok: false, error: "You cannot message yourself." });

    const text = String(payload.body ?? "").trim();
    const imageUrl = payload.image_url ? String(payload.image_url).trim() : null;

    if (!text && !imageUrl) {
      return json(req, 400, { ok: false, error: "Message must include text or an image." });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // names for each user’s conversation row
    const toProfile = await getProfileLite(supabaseAdmin, toId);
    const meProfile = await getProfileLite(supabaseAdmin, meId);

    const toNameForMe = bestProfileName(toProfile) || "New message";
    const meNameForTo = bestProfileName(meProfile) || "New message";

    // ensure BOTH per-user conversation rows exist
    const convoForMe = await ensureConversationRow(supabaseAdmin, meId, toId, toNameForMe);
    const convoForTo = await ensureConversationRow(supabaseAdmin, toId, meId, meNameForTo);

    const createdAt = new Date().toISOString();
    const preview = toPreview(text);

    // insert message copies (so each user’s thread has an insert on THEIR conversation_id)
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("messages")
      .insert([
        {
          conversation_id: String(convoForMe.id),
          sender: "user",
          body: text,
          image_url: imageUrl,
          created_at: createdAt,
        },
        {
          conversation_id: String(convoForTo.id),
          sender: "them",
          body: text,
          image_url: imageUrl,
          created_at: createdAt,
        },
      ])
      .select("id, conversation_id, sender, body, created_at, image_url");

    if (insertErr) {
      return json(req, 500, { ok: false, error: insertErr.message || "Failed to insert message." });
    }

    // update conversations (preview/last_message_at) and bump unread for recipient
    await supabaseAdmin
      .from("conversations")
      .update({ last_message_preview: preview, last_message_at: createdAt, unread_count: 0 })
      .eq("id", String(convoForMe.id));

    // IMPORTANT: increment recipient unread (not overwrite)
    const { data: toRow } = await supabaseAdmin
      .from("conversations")
      .select("unread_count")
      .eq("id", String(convoForTo.id))
      .maybeSingle();

    const nextUnread = Number(toRow?.unread_count ?? 0) + 1;

    await supabaseAdmin
      .from("conversations")
      .update({ last_message_preview: preview, last_message_at: createdAt, unread_count: nextUnread })
      .eq("id", String(convoForTo.id));

    return json(req, 200, {
      ok: true,
      sender_conversation_id: String(convoForMe.id),
      recipient_conversation_id: String(convoForTo.id),
      last_message_preview: preview,
      last_message_at: createdAt,
      inserted: inserted ?? [],
    });
  } catch (e) {
    console.error("send-message unexpected error", e);
    return json(req, 500, { ok: false, error: "Unexpected error." });
  }
});
