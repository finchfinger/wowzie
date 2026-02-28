/// <reference lib="deno.ns" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Body = {
  token?: string | null;
};

const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "http://localhost:3000";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

function json(req: Request, status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(req),
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req: Request) => {
  // Preflight
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

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json(req, 401, { ok: false, error: "Unauthorized." });

    const body = (await req.json()) as Body;
    const token = (body.token ?? "").trim();
    if (!token) return json(req, 400, { ok: false, error: "Missing token." });

    // Validate caller (JWT) with anon client
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userRes, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userRes.user) return json(req, 401, { ok: false, error: "Unauthorized." });

    const accepter = userRes.user;

    // Admin client for DB reads/writes
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find share by token (service role bypasses RLS)
    const { data: share, error: shareErr } = await supabaseAdmin
      .from("calendar_shares")
      .select("id, sender_id, recipient_user_id, status, share_url, message, email")
      .eq("token", token)
      .maybeSingle();

    if (shareErr) {
      console.error("accept-calendar-share lookup error", shareErr);
      return json(req, 500, { ok: false, error: "Could not look up invite." });
    }

    if (!share) {
      return json(req, 404, { ok: false, error: "Invite not found. The link may be invalid or expired." });
    }

    // If already accepted by this user, treat as success
    if (share.status === "accepted" && share.recipient_user_id === accepter.id) {
      return json(req, 200, { ok: true, id: share.id, status: "accepted" });
    }

    // If accepted by someone else, block
    if (share.status === "accepted" && share.recipient_user_id && share.recipient_user_id !== accepter.id) {
      return json(req, 409, { ok: false, error: "This invite was already accepted by another user." });
    }

    // Accept it: set recipient_user_id to current user, status accepted, accepted_at now
    const { error: updErr } = await supabaseAdmin
      .from("calendar_shares")
      .update({
        recipient_user_id: accepter.id,
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", share.id);

    if (updErr) {
      console.error("accept-calendar-share update error", updErr);
      return json(req, 500, { ok: false, error: "Could not accept invite." });
    }

    // Optional: notify the sender that it was accepted
    if (share.sender_id) {
      await supabaseAdmin.from("notifications").insert({
        user_id: share.sender_id,
        type: "Calendar",
        title: "Calendar invite accepted",
        body: "Someone accepted your shared calendar invite.",
        is_read: false,
        meta: {
          share_id: share.id,
          share_url: share.share_url,
          recipient_user_id: accepter.id,
          recipient_email: accepter.email ?? null,
        },
      });
    }

    return json(req, 200, { ok: true, id: share.id, status: "accepted" });
  } catch (e) {
    console.error("accept-calendar-share unexpected error", e);
    return json(req, 500, { ok: false, error: "Unexpected error." });
  }
});
