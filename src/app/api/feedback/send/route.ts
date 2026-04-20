import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resend, FROM_EMAIL } from "@/lib/resend";

/* ── Auth: only Vercel cron or admin callers ──────────────
   Vercel cron sets Authorization: Bearer <CRON_SECRET>.
   We skip auth in dev (no secret set).
─────────────────────────────────────────────────────────── */

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = getSupabase();
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.heywowzi.com";

  // Find confirmed bookings where:
  // - camp ended at least 1 day ago (end_time < yesterday)
  // - feedback not yet requested (feedback_requested_at is null)
  // - feedback not yet submitted (feedback_submitted_at is null)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(`
      id,
      contact_email,
      user_id,
      camps:camp_id (
        name,
        slug,
        end_time,
        meta
      )
    `)
    .eq("status", "confirmed")
    .is("feedback_requested_at", null)
    .is("feedback_submitted_at", null)
    .lt("camps.end_time", yesterday.toISOString());

  if (error) {
    console.error("[feedback/send] query error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!bookings?.length) {
    return NextResponse.json({ sent: 0, message: "No eligible bookings" });
  }

  let sent = 0;
  const failed: string[] = [];

  for (const booking of bookings) {
    const camp = (booking as any).camps;
    if (!camp) continue;

    // Also check camp sessions end date from meta if end_time is null
    let campEnded = false;
    if (camp.end_time) {
      campEnded = new Date(camp.end_time) < yesterday;
    } else {
      const sessions: any[] = camp.meta?.campSessions ?? [];
      if (sessions.length > 0) {
        const lastEnd = sessions[sessions.length - 1]?.endDate;
        if (lastEnd) campEnded = new Date(lastEnd) < yesterday;
      } else if (camp.meta?.fixedSchedule?.endDate) {
        campEnded = new Date(camp.meta.fixedSchedule.endDate) < yesterday;
      }
    }

    if (!campEnded) continue;

    const toEmail = booking.contact_email;
    if (!toEmail) continue;

    const feedbackUrl = `${base}/review/${booking.id}`;

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: toEmail,
        subject: `How did ${camp.name} go? 👋`,
        html: feedbackEmailHtml({ campName: camp.name, feedbackUrl }),
      });

      // Mark as requested
      await supabase
        .from("bookings")
        .update({ feedback_requested_at: new Date().toISOString() })
        .eq("id", booking.id);

      sent++;
    } catch (e) {
      console.error(`[feedback/send] failed for booking ${booking.id}:`, e);
      failed.push(booking.id);
    }
  }

  return NextResponse.json({ sent, failed: failed.length, total: bookings.length });
}

/* ── Email template ──────────────────────────────────────── */

function feedbackEmailHtml({
  campName,
  feedbackUrl,
}: {
  campName: string;
  feedbackUrl: string;
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#18181b;padding:28px 32px;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px;">Wowzi</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111;">How did ${campName} go?</h1>
            <p style="margin:0 0 20px;color:#666;font-size:15px;line-height:1.6;">
              We'd love to hear how it went for your family. It takes about a minute and your feedback goes straight to the camp — it's never shown publicly.
            </p>
            <a href="${feedbackUrl}"
               style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:14px 28px;border-radius:100px;font-size:15px;font-weight:600;letter-spacing:-0.2px;">
              Share feedback →
            </a>
            <p style="margin:24px 0 0;font-size:13px;color:#999;line-height:1.5;">
              This is completely optional. If you'd rather not, just ignore this email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:12px;color:#aaa;">
              You're receiving this because you booked through <a href="https://www.heywowzi.com" style="color:#666;">Wowzi</a>.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
