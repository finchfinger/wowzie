/// <reference lib="deno.ns" />
import { createClient } from "jsr:@supabase/supabase-js@2";

type Body = {
  email?: string | null;
  message?: string | null;
  mode?: "send" | "link_only";
};

const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const allowOrigin = ALLOWED_ORIGINS.has(origin)
    ? origin
    : "http://localhost:3000";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
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

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function ensureTrailingSlash(url: string) {
  return url.endsWith("/") ? url : url + "/";
}

Deno.serve(async (req: Request) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders(req) });
  }

  try {
    if (req.method !== "POST") return json(req, 405, { error: "Method not allowed" });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
    const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "Golly <onboarding@resend.dev>";

    const APP_BASE_URL = ensureTrailingSlash(Deno.env.get("APP_BASE_URL") ?? "http://localhost:3000/");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return json(req, 500, { error: "Missing Supabase env vars." });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json(req, 401, { error: "Unauthorized." });

    const body = (await req.json()) as Body;
    const mode = body.mode ?? "send";
    const email = (body.email ?? "").trim();
    const message = (body.message ?? "").trim();

    if (mode === "send" && !isValidEmail(email)) {
      return json(req, 400, { error: "Please provide a valid email." });
    }

    // 1) Validate caller via JWT (anon client)
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userRes, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userRes.user) return json(req, 401, { error: "Unauthorized." });

    const sender = userRes.user;

    // 2) Admin client for DB writes
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Resolve recipient_user_id from profiles.email if present
    let recipientUserId: string | null = null;
    if (email) {
      const { data: profileHit } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .ilike("email", email)
        .maybeSingle();
      if (profileHit?.id) recipientUserId = profileHit.id;
    }

    const token = crypto.randomUUID().replaceAll("-", "");
    const shareUrl = `${APP_BASE_URL}calendars/shared?token=${token}`;

    // Insert share row
    const { data: shareRow, error: shareErr } = await supabaseAdmin
      .from("calendar_shares")
      .insert({
        email: email || "link-only",
        message: message || null,
        token,
        share_url: shareUrl,
        sender_id: sender.id,
        recipient_user_id: recipientUserId,
        status: "created",
        last_error: null,
        resend_error: null,
        resend_id: null,
        sent_at: null,
      })
      .select("id, share_url, token")
      .single();

    if (shareErr || !shareRow) {
      console.error("calendar_shares insert error", shareErr);
      return json(req, 500, { error: "Could not create calendar share." });
    }

    // Notify recipient if they exist (non-fatal)
    if (recipientUserId) {
      await supabaseAdmin.from("notifications").insert({
        user_id: recipientUserId,
        type: "Calendar",
        title: "Calendar shared with you",
        body: message || "Someone shared their Golly calendar with you. Open the invite to view.",
        is_read: false,
        meta: {
          share_id: shareRow.id,
          share_url: shareUrl,
          sender_id: sender.id,
          sender_email: sender.email ?? null,
        },
      });
    }

    // If link_only, stop here
    if (mode !== "send") {
      return json(req, 200, { share_url: shareUrl, token, id: shareRow.id, status: "created" });
    }

    // Send email (Resend will restrict to your own email until domain verified)
    if (!RESEND_API_KEY) {
      await supabaseAdmin
        .from("calendar_shares")
        .update({ status: "email_failed", last_error: "Missing RESEND_API_KEY env var." })
        .eq("id", shareRow.id);

      return json(req, 500, { error: "Missing RESEND_API_KEY env var." });
    }

    const subject = "You have a Golly calendar invite";
    const safeMessage = message ? `<p style="margin:0 0 12px 0;">${message}</p>` : "";

    const html = `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system; line-height:1.4;">
        <h2 style="margin:0 0 12px 0;">Golly calendar invite</h2>
        ${safeMessage}
        <p style="margin:0 0 12px 0;">Open this link to view:</p>
        <p style="margin:0 0 16px 0;">
          <a href="${shareUrl}">${shareUrl}</a>
        </p>
        <p style="margin:0; color:#6b7280; font-size:12px;">
          If you were not expecting this, you can ignore this email.
        </p>
      </div>
    `;

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [email],
        subject,
        html,
      }),
    });

    const resendText = await resendResp.text();

    if (!resendResp.ok) {
      console.error("Resend error", resendText);

      await supabaseAdmin
        .from("calendar_shares")
        .update({
          status: "email_failed",
          last_error: "Resend rejected the request.",
          resend_error: (() => {
            try {
              return JSON.parse(resendText);
            } catch {
              return { raw: resendText };
            }
          })(),
        })
        .eq("id", shareRow.id);

      return json(req, 502, { error: "Invite created, but email failed to send." });
    }

    let resendJson: any = null;
    try {
      resendJson = JSON.parse(resendText);
    } catch {
      resendJson = null;
    }

    const resendId = resendJson?.id ?? null;

    await supabaseAdmin
      .from("calendar_shares")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        resend_id: resendId,
        last_error: null,
        resend_error: null,
      })
      .eq("id", shareRow.id);

    return json(req, 200, { share_url: shareUrl, token, id: shareRow.id, status: "sent", resend_id: resendId });
  } catch (e) {
    console.error("share-calendar unexpected error", e);
    return json(req, 500, { error: "Unexpected error." });
  }
});
