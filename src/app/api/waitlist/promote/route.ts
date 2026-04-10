import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resend, FROM_EMAIL } from "@/lib/resend";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const { campId } = (await req.json()) as { campId: string };
    if (!campId) {
      return NextResponse.json({ error: "Missing campId." }, { status: 400 });
    }

    const supabase = getSupabase();

    // Confirm there's actually a spot open
    const { data: camp } = await supabase
      .from("camps")
      .select("capacity, name, slug")
      .eq("id", campId)
      .single();

    if (!camp) {
      return NextResponse.json({ error: "Camp not found." }, { status: 404 });
    }

    const { count: confirmedCount } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("camp_id", campId)
      .eq("status", "confirmed");

    const totalCapacity: number | null =
      typeof camp.capacity === "number" && camp.capacity > 0 ? camp.capacity : null;
    const isFull = totalCapacity != null ? (confirmedCount ?? 0) >= totalCapacity : false;

    // Only notify if there's actually space
    if (isFull) {
      return NextResponse.json({ promoted: 0, message: "Camp is still full." });
    }

    // Find all waitlisted bookings, oldest first
    const { data: waitlisted } = await supabase
      .from("bookings")
      .select("id, user_id")
      .eq("camp_id", campId)
      .eq("status", "waitlisted")
      .order("created_at", { ascending: true });

    if (!waitlisted || waitlisted.length === 0) {
      return NextResponse.json({ promoted: 0, message: "No waitlisted users." });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://golly-roan.vercel.app";
    const campName = camp.name as string;
    const campSlug = camp.slug as string;
    let promoted = 0;

    for (const entry of waitlisted) {
      // In-app notification
      await supabase.from("notifications").insert({
        user_id: entry.user_id,
        type: "waitlist_promoted",
        title: "A spot just opened up!",
        body: `A spot opened for ${campName}. Book now before it's gone.`,
        meta: { campName, campId, bookingId: entry.id, campSlug },
      });

      // Email
      try {
        const { data: userRecord } = await supabase.auth.admin.getUserById(entry.user_id);
        const userEmail = userRecord?.user?.email;
        if (userEmail) {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: userEmail,
            subject: `A spot just opened up for ${campName}!`,
            html: waitlistPromotedEmailHtml({ campName, campSlug, appUrl }),
          });
          promoted++;
        }
      } catch (e) {
        console.error("[waitlist/promote] Failed to send email:", e);
      }
    }

    return NextResponse.json({ promoted });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/* ── Email template ── */

function waitlistPromotedEmailHtml({
  campName,
  campSlug,
  appUrl,
}: {
  campName: string;
  campSlug: string;
  appUrl: string;
}) {
  const campUrl = `${appUrl}/camp/${campSlug}`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#18181b;padding:28px 32px;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px;">Wowzi 🎉</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111;">A spot just opened up!</h1>
            <p style="margin:0 0 20px;color:#666;font-size:15px;line-height:1.5;">
              Good news — a spot is now available for <strong style="color:#111;">${campName}</strong>. Spots fill up fast, so book now before it's gone!
            </p>
            <a href="${campUrl}"
               style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:14px 28px;border-radius:100px;font-size:15px;font-weight:600;letter-spacing:-0.2px;">
              Book your spot →
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:12px;color:#aaa;">
              You received this because you joined the waitlist for ${campName} on <a href="${appUrl}" style="color:#666;">Wowzi</a>.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
