import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { resend, FROM_EMAIL } from "@/lib/resend";

export const runtime = "nodejs";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const stripe = new Stripe(stripeSecretKey);

  try {
    const body = await req.json();
    const { campId, campName, priceCents, guests, sessionCount, sessionIds, email, userId, messageToHost, preferredSlot } =
      body as {
        campId: string; campName: string; priceCents: number;
        guests: number; sessionCount?: number; sessionIds?: string[];
        email: string; userId: string; messageToHost?: string;
        preferredSlot?: { day: string; start: string; end: string; label: string } | null;
      };

    if (!campId || !priceCents || !guests || !email || !userId) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const sessions = Math.max(sessionCount ?? 1, 1);
    const totalCents = priceCents * sessions * guests;
    const supabase = getSupabase();

    /* ── Capacity check ── */
    const { data: campData } = await supabase
      .from("camps").select("capacity, name").eq("id", campId).single();

    const campCapacity = typeof campData?.capacity === "number" && campData.capacity > 0
      ? campData.capacity : null;

    if (campCapacity !== null) {
      const { data: existingBookings } = await supabase
        .from("bookings").select("guests_count").eq("camp_id", campId)
        .not("status", "in", '("cancelled","refunded")');

      const spotsTaken = (existingBookings ?? []).reduce((sum, b) => sum + (b.guests_count ?? 1), 0);
      if (spotsTaken + guests > campCapacity) {
        const spotsLeft = Math.max(0, campCapacity - spotsTaken);
        return NextResponse.json({
          error: spotsLeft === 0 ? "This camp is fully booked." : `Only ${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} remaining.`,
          spotsLeft,
        }, { status: 409 });
      }
    }

    /* ── Create pending booking ── */
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .insert({
        user_id: userId, camp_id: campId, status: "pending",
        guests_count: guests, total_cents: totalCents, currency: "usd",
        contact_email: email, message_to_host: messageToHost || null,
        payment_status: "pending",
        ...(sessionIds && sessionIds.length > 0 && { selected_sessions: sessionIds }),
        ...(preferredSlot && { preferred_slot: preferredSlot }),
      })
      .select("id").single();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: bookingErr?.message || "Could not create booking." }, { status: 500 });
    }

    /* ── Platform fee + host lookup ── */
    const { data: camp } = await supabase
      .from("camps").select("host_id, is_promoted").eq("id", campId).single();

    const isPromoted = (camp as any)?.is_promoted === true;
    const platformFeePercent = isPromoted ? 15 : 10;
    const platformFeeCents = Math.round(totalCents * platformFeePercent / 100);

    await supabase.from("bookings")
      .update({ platform_fee_percent: platformFeePercent, is_promoted_booking: isPromoted })
      .eq("id", booking.id);

    /* ── Look up parent's name ── */
    const { data: parentProfile } = await supabase
      .from("profiles")
      .select("preferred_first_name, legal_name")
      .eq("id", userId)
      .single();
    const parentName =
      parentProfile?.preferred_first_name?.trim() ||
      parentProfile?.legal_name?.trim() ||
      email;

    /* ── Notify host of pending booking ── */
    if (camp?.host_id) {
      await supabase.from("notifications").insert({
        user_id: camp.host_id, type: "booking_pending",
        title: "New booking request",
        body: `${parentName} wants to book ${campName}.`,
        meta: { actorName: parentName, campName, campId, bookingId: booking.id },
      });

      try {
        const { data: hostUser } = await supabase.auth.admin.getUserById(camp.host_id);
        const hostEmail = hostUser?.user?.email;
        if (hostEmail) {
          const origin = req.headers.get("origin") || "https://heywowzi.com";
          await resend.emails.send({
            from: FROM_EMAIL, to: hostEmail,
            subject: `New booking request for ${campName}`,
            html: hostBookingRequestEmailHtml({ campName, parentName, bookingId: booking.id, appUrl: origin }),
          });
        }
      } catch (e) {
        console.error("[payment-intent] host email failed:", e);
      }
    }

    /* ── Look up host's Stripe Connect account ── */
    let transferData: { application_fee_amount: number; transfer_data: { destination: string } } | object = {};
    if (camp?.host_id) {
      const { data: hostProfile } = await supabase
        .from("host_profiles").select("stripe_account_id, stripe_connect_status")
        .eq("user_id", camp.host_id).single();

      if (hostProfile?.stripe_account_id && hostProfile?.stripe_connect_status === "connected") {
        transferData = {
          application_fee_amount: platformFeeCents,
          transfer_data: { destination: hostProfile.stripe_account_id },
        };
      }
    }

    /* ── Create PaymentIntent ── */
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: "usd",
      metadata: { booking_id: booking.id, camp_id: campId, user_id: userId },
      receipt_email: email,
      ...transferData,
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret, bookingId: booking.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function hostBookingRequestEmailHtml({ campName, parentName, bookingId, appUrl }: {
  campName: string; parentName: string; bookingId: string; appUrl: string;
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#18181b;padding:28px 32px;"><p style="margin:0;font-size:22px;font-weight:700;color:#fff;">Wowzi 🎉</p></td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111;">New booking request!</h1>
          <p style="margin:0 0 20px;color:#666;font-size:15px;line-height:1.5;">
            <strong style="color:#111;">${parentName}</strong> is completing a booking for <strong style="color:#111;">${campName}</strong>.
          </p>
          <a href="${appUrl}/host/bookings" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:14px 28px;border-radius:100px;font-size:15px;font-weight:600;">View bookings →</a>
          <p style="margin:24px 0 0;font-size:12px;color:#999;">Booking reference: <span style="color:#666;font-family:monospace;">${bookingId}</span></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
