import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { resend, FROM_EMAIL } from "@/lib/resend";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Server-side Supabase client (uses service role to bypass RLS for booking insert)
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: "Stripe is not configured. Add STRIPE_SECRET_KEY to .env.local." },
      { status: 503 }
    );
  }

  const stripe = new Stripe(stripeSecretKey);

  try {
    const body = await req.json();
    const { campId, campName, priceCents, guests, sessionCount, sessionIds, email, userId, messageToHost } =
      body as {
        campId: string;
        campName: string;
        priceCents: number;
        guests: number;
        sessionCount?: number;
        sessionIds?: string[];
        email: string;
        userId: string;
        messageToHost?: string;
      };

    if (!campId || !priceCents || !guests || !email || !userId) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const sessions = Math.max(sessionCount ?? 1, 1);
    const totalCents = priceCents * sessions * guests;

    const supabase = getSupabase();

    /* ── Capacity check ─────────────────────────────────────────────────────
       Fetch camp capacity + count existing non-cancelled bookings (sum of
       guests_count). Reject before touching Stripe if the camp is full.
    ──────────────────────────────────────────────────────────────────────── */
    const { data: campData } = await supabase
      .from("camps")
      .select("capacity, name")
      .eq("id", campId)
      .single();

    const campCapacity = typeof campData?.capacity === "number" && campData.capacity > 0
      ? campData.capacity
      : null;

    if (campCapacity !== null) {
      const { data: existingBookings } = await supabase
        .from("bookings")
        .select("guests_count")
        .eq("camp_id", campId)
        .not("status", "in", '("cancelled","refunded")');

      const spotsTaken = (existingBookings ?? []).reduce(
        (sum, b) => sum + (b.guests_count ?? 1),
        0
      );

      if (spotsTaken + guests > campCapacity) {
        const spotsLeft = Math.max(0, campCapacity - spotsTaken);
        return NextResponse.json(
          {
            error: spotsLeft === 0
              ? "This camp is fully booked."
              : `Only ${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} remaining.`,
            spotsLeft,
          },
          { status: 409 }
        );
      }
    }

    // Pre-create booking with payment_status = 'pending'
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .insert({
        user_id: userId,
        camp_id: campId,
        status: "pending",
        guests_count: guests,
        total_cents: totalCents,
        currency: "usd",
        contact_email: email,
        message_to_host: messageToHost || null,
        payment_status: "pending",
        ...(sessionIds && sessionIds.length > 0 && { selected_sessions: sessionIds }),
      })
      .select("id")
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json(
        { error: bookingErr?.message || "Could not create booking." },
        { status: 500 }
      );
    }

    // Notify the host that a new booking is pending
    const { data: camp } = await supabase
      .from("camps")
      .select("host_id, is_promoted")
      .eq("id", campId)
      .single();

    // Store promoted status + fee rate on the booking for payout calculations
    // Standard: 10% | Promoted: 15%
    const isPromoted = (camp as any)?.is_promoted === true;
    const platformFeePercent = isPromoted ? 15 : 10;
    await supabase
      .from("bookings")
      .update({ platform_fee_percent: platformFeePercent, is_promoted_booking: isPromoted })
      .eq("id", booking.id);

    if (camp?.host_id) {
      await supabase.from("notifications").insert({
        user_id: camp.host_id,
        type: "booking_pending",
        title: "New booking request",
        body: `${email} wants to book ${campName}.`,
        meta: {
          actorName: email,
          campName,
          campId,
          bookingId: booking.id,
        },
      });

      // Email host: new booking request
      try {
        const { data: hostUser } = await supabase.auth.admin.getUserById(camp.host_id);
        const hostEmail = hostUser?.user?.email;
        if (hostEmail) {
          const origin = req.headers.get("origin") || "https://golly-roan.vercel.app";
          await resend.emails.send({
            from: FROM_EMAIL,
            to: hostEmail,
            subject: `New booking request for ${campName}`,
            html: hostBookingRequestEmailHtml({ campName, parentEmail: email, bookingId: booking.id, appUrl: origin }),
          });
        }
      } catch (e) {
        console.error("[checkout] Failed to send host request email:", e);
      }
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: totalCents,
            product_data: {
              name: `${campName}${sessions > 1 ? ` × ${sessions} sessions` : ""}${guests > 1 ? ` × ${guests} campers` : ""}`,
            },
          },
        },
      ],
      metadata: {
        booking_id: booking.id,
        camp_id: campId,
        user_id: userId,
      },
      success_url: `${origin}/checkout/confirmed/${booking.id}?stripe=1`,
      cancel_url: `${origin}/checkout/${campId}?guests=${guests}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/* ── Email template ───────────────────────────────────────────────────────── */

function hostBookingRequestEmailHtml({
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
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111;">Someone wants to book your camp!</h1>
            <p style="margin:0 0 20px;color:#666;font-size:15px;line-height:1.5;">
              <strong style="color:#111;">${parentEmail}</strong> is completing a booking for <strong style="color:#111;">${campName}</strong>. You'll receive another email once payment is confirmed.
            </p>
            <a href="${dashboardUrl}"
               style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:14px 28px;border-radius:100px;font-size:15px;font-weight:600;letter-spacing:-0.2px;">
              View your bookings →
            </a>
            <p style="margin:24px 0 0;font-size:12px;color:#999;">
              Booking reference: <span style="color:#666;font-family:monospace;">${bookingId}</span>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:12px;color:#aaa;">
              Manage your listings and bookings at <a href="${appUrl}/host" style="color:#666;">your host dashboard</a>.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
