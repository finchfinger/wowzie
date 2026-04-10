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
    const body = await req.json();
    const { campId, campName, userId, email, guests, sessionIds } = body as {
      campId: string;
      campName: string;
      userId: string;
      email: string;
      guests?: number;
      sessionIds?: string[];
    };

    if (!campId || !userId || !email) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const supabase = getSupabase();

    // 1. Confirmed count
    const { count: confirmedCount } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("camp_id", campId)
      .eq("status", "confirmed");

    // 2. Fetch camp
    const { data: camp } = await supabase
      .from("camps")
      .select("capacity, meta, slug, host_id")
      .eq("id", campId)
      .single();

    if (!camp) {
      return NextResponse.json({ error: "Camp not found." }, { status: 404 });
    }

    // 3. Capacity check
    const totalCapacity: number | null =
      typeof camp.capacity === "number" && camp.capacity > 0 ? camp.capacity : null;
    const isFull = totalCapacity != null ? (confirmedCount ?? 0) >= totalCapacity : false;

    if (!isFull) {
      return NextResponse.json({ error: "Camp is not full — proceed to regular checkout." }, { status: 400 });
    }

    // 4. Waitlist enabled?
    const meta = camp.meta as Record<string, unknown> | null;
    const campSessions = meta?.campSessions as Array<{ enableWaitlist?: boolean }> | undefined;
    const enableWaitlist =
      campSessions?.[0]?.enableWaitlist ??
      (meta?.enableWaitlist as boolean | undefined) ??
      false;

    if (!enableWaitlist) {
      return NextResponse.json({ error: "Waitlist is not enabled for this camp." }, { status: 409 });
    }

    // 5. Check if user is already waitlisted
    const { data: existing } = await supabase
      .from("bookings")
      .select("id")
      .eq("camp_id", campId)
      .eq("user_id", userId)
      .eq("status", "waitlisted")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ waitlisted: true, bookingId: existing.id, alreadyWaitlisted: true });
    }

    // 6. Create waitlisted booking
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .insert({
        user_id: userId,
        camp_id: campId,
        status: "waitlisted",
        guests_count: guests ?? 1,
        total_cents: 0,
        currency: "usd",
        contact_email: email,
        payment_status: "waitlisted",
        ...(sessionIds && sessionIds.length > 0 && { selected_sessions: sessionIds }),
      })
      .select("id")
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json(
        { error: bookingErr?.message || "Could not create waitlist entry." },
        { status: 500 }
      );
    }

    // 7. Notify parent (in-app)
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "waitlist_joined",
      title: "You're on the waitlist!",
      body: `We'll email you if a spot opens up for ${campName}.`,
      meta: { campName, campId, bookingId: booking.id },
    });

    // 8. Notify host (in-app + email)
    if (camp.host_id) {
      await supabase.from("notifications").insert({
        user_id: camp.host_id,
        type: "waitlist_joined",
        title: "New waitlist entry",
        body: `${email} joined the waitlist for ${campName}.`,
        meta: { actorName: email, campName, campId, bookingId: booking.id },
      });

      try {
        const { data: hostUser } = await supabase.auth.admin.getUserById(camp.host_id);
        const hostEmail = hostUser?.user?.email;
        if (hostEmail) {
          const origin = req.headers.get("origin") || "https://golly-roan.vercel.app";
          await resend.emails.send({
            from: FROM_EMAIL,
            to: hostEmail,
            subject: `New waitlist signup for ${campName}`,
            html: hostWaitlistEmailHtml({ campName, parentEmail: email, bookingId: booking.id, appUrl: origin }),
          });
        }
      } catch (e) {
        console.error("[waitlist/join] Failed to send host email:", e);
      }
    }

    return NextResponse.json({ waitlisted: true, bookingId: booking.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/* ── Email template ── */

function hostWaitlistEmailHtml({
  campName,
  parentEmail,
  bookingId,
  appUrl,
}: {
  campName: string;
  parentEmail: string;
  bookingId: string;
  appUrl: string;
}) {
  const dashboardUrl = `${appUrl}/host/bookings`;
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
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111;">New waitlist signup</h1>
            <p style="margin:0 0 20px;color:#666;font-size:15px;line-height:1.5;">
              <strong style="color:#111;">${parentEmail}</strong> joined the waitlist for <strong style="color:#111;">${campName}</strong>. They'll be notified automatically if a spot opens up.
            </p>
            <a href="${dashboardUrl}"
               style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:14px 28px;border-radius:100px;font-size:15px;font-weight:600;letter-spacing:-0.2px;">
              View your bookings →
            </a>
            <p style="margin:24px 0 0;font-size:12px;color:#999;">
              Waitlist reference: <span style="color:#666;font-family:monospace;">${bookingId}</span>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:12px;color:#aaa;">
              Manage your listings at <a href="${appUrl}/host" style="color:#666;">your host dashboard</a>.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
