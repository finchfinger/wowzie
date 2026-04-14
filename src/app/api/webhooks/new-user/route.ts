import { NextRequest, NextResponse } from "next/server";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { emailTemplate } from "@/lib/email-template";

/**
 * POST /api/webhooks/new-user
 *
 * Called by a Supabase Database Webhook whenever a row is inserted into
 * auth.users (or a profiles table you configure as the trigger source).
 *
 * Security: Supabase sends an `Authorization: Bearer <secret>` header.
 * Set WEBHOOK_SECRET in your environment to match the secret you configure
 * in the Supabase dashboard.
 *
 * Required env vars:
 *   WEBHOOK_SECRET       — shared secret set in Supabase webhook config
 *   ADMIN_NOTIFY_EMAIL   — your email address, e.g. "you@example.com"
 */

interface SupabaseWebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: {
    id?: string;
    email?: string;
    created_at?: string;
    raw_user_meta_data?: Record<string, string>;
    [key: string]: unknown;
  } | null;
  old_record: Record<string, unknown> | null;
}

export async function POST(req: NextRequest) {
  // ── 1. Verify shared secret ──────────────────────────────────────────────
  const secret = process.env.WEBHOOK_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (token !== secret) {
      console.warn("[new-user webhook] Unauthorized — bad secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // ── 2. Parse payload ─────────────────────────────────────────────────────
  let payload: SupabaseWebhookPayload;
  try {
    payload = (await req.json()) as SupabaseWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.type !== "INSERT" || !payload.record) {
    // Only care about new users
    return NextResponse.json({ ok: true, skipped: true });
  }

  const user = payload.record;
  const email = user.email ?? "(no email)";
  const name =
    user.raw_user_meta_data?.full_name ??
    user.raw_user_meta_data?.name ??
    "(no name)";
  const createdAt = user.created_at
    ? new Date(user.created_at).toLocaleString("en-US", {
        timeZone: "America/New_York",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "just now";
  const userId = user.id ?? "unknown";

  // ── 3. Send notification email ───────────────────────────────────────────
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
  if (!adminEmail) {
    console.warn("[new-user webhook] ADMIN_NOTIFY_EMAIL not set — skipping email");
    return NextResponse.json({ ok: true, warned: "no admin email" });
  }

  const html = emailTemplate(
    `<h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#18181b;letter-spacing:-0.4px;">New signup 🎉</h1>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">Someone new just joined Wowzi.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #F1F4F9;font-size:13px;color:#9ca3af;width:90px;">Name</td>
        <td style="padding:10px 0;border-bottom:1px solid #F1F4F9;font-size:14px;color:#18181b;font-weight:500;">${name}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #F1F4F9;font-size:13px;color:#9ca3af;">Email</td>
        <td style="padding:10px 0;border-bottom:1px solid #F1F4F9;font-size:14px;color:#18181b;font-weight:500;">${email}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #F1F4F9;font-size:13px;color:#9ca3af;">Signed up</td>
        <td style="padding:10px 0;border-bottom:1px solid #F1F4F9;font-size:14px;color:#18181b;">${createdAt} ET</td>
      </tr>
      <tr>
        <td style="padding:10px 0;font-size:13px;color:#9ca3af;">User ID</td>
        <td style="padding:10px 0;font-size:12px;color:#9ca3af;font-family:monospace;">${userId}</td>
      </tr>
    </table>
    <div style="margin-top:28px;">
      <a href="https://supabase.com/dashboard/project/_/auth/users"
         style="display:inline-block;background:#7B5CBF;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:100px;font-size:14px;font-weight:600;">
        View in Supabase →
      </a>
    </div>`,
    `Wowzi admin notification · sent automatically on signup`
  );

  try {
    const { error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: adminEmail,
      subject: `🎉 New Wowzi signup: ${name} (${email})`,
      html,
    });

    if (error) {
      console.error("[new-user webhook] Resend error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } catch (err) {
    console.error("[new-user webhook] Unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  console.log(`[new-user webhook] Notified admin of signup: ${email}`);
  return NextResponse.json({ ok: true });
}
