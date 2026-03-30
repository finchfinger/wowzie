import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { resend, FROM_EMAIL } from "@/lib/resend";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

// Next.js App Router: disable body parsing so Stripe can verify the raw body
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!stripeSecretKey || !webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured." }, { status: 503 });
  }

  const stripe = new Stripe(stripeSecretKey);
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook verification failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.booking_id;

    if (bookingId) {
      const supabase = getSupabase();

      // Update booking status
      await supabase
        .from("bookings")
        .update({
          payment_status: "paid",
          status: "confirmed",
          stripe_session_id: session.id,
          stripe_payment_intent: session.payment_intent as string | null,
        })
        .eq("id", bookingId);

      // Fetch booking + camp info for notifications and payout
      const { data: booking } = await supabase
        .from("bookings")
        .select("user_id, total_cents, contact_email, camps:camp_id(name, host_id)")
        .eq("id", bookingId)
        .single();

      const camp = (booking?.camps as unknown as { name: string; host_id: string } | null);
      const campName = camp?.name ?? "your camp";
      const hostId = camp?.host_id;
      const parentEmail = booking?.contact_email as string | null;

      // Notify the parent that booking is confirmed
      if (booking?.user_id) {
        await supabase.from("notifications").insert({
          user_id: booking.user_id,
          type: "booking_confirmed",
          title: "Booking confirmed!",
          body: `Your booking for ${campName} is confirmed.`,
          meta: { campName, bookingId },
        });
      }

      // Email parent: booking confirmed
      if (parentEmail) {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://golly-roan.vercel.app";
          await resend.emails.send({
            from: FROM_EMAIL,
            to: parentEmail,
            subject: `Your booking for ${campName} is confirmed 🎉`,
            html: bookingConfirmedEmailHtml({ campName, bookingId, appUrl }),
          });
        } catch (e) {
          console.error("[webhook] Failed to send parent confirmation email:", e);
        }
      }

      // Transfer funds to host (minus 5% platform fee) if they have Stripe Connect
      if (hostId && booking?.total_cents) {
        const { data: hostProfile } = await supabase
          .from("host_profiles")
          .select("stripe_account_id, stripe_connect_status")
          .eq("user_id", hostId)
          .single();

        if (
          hostProfile?.stripe_account_id &&
          hostProfile?.stripe_connect_status === "connected"
        ) {
          const fee = Math.round(booking.total_cents * 0.05);
          const payout = booking.total_cents - fee;
          await stripe.transfers.create({
            amount: payout,
            currency: "usd",
            destination: hostProfile.stripe_account_id,
            transfer_group: bookingId,
          });
        }
      }

      // Email host: new booking confirmed
      if (hostId && parentEmail) {
        try {
          const { data: hostUser } = await supabase.auth.admin.getUserById(hostId);
          const hostEmail = hostUser?.user?.email;
          if (hostEmail) {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://golly-roan.vercel.app";
            await resend.emails.send({
              from: FROM_EMAIL,
              to: hostEmail,
              subject: `New booking confirmed for ${campName}`,
              html: hostBookingConfirmedEmailHtml({ campName, parentEmail, bookingId, appUrl }),
            });
          }
        } catch (e) {
          console.error("[webhook] Failed to send host confirmation email:", e);
        }
      }
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.booking_id;
    if (bookingId) {
      const supabase = getSupabase();

      await supabase
        .from("bookings")
        .update({ payment_status: "expired", status: "cancelled" })
        .eq("id", bookingId);

      // Notify the parent that booking expired
      const { data: booking } = await supabase
        .from("bookings")
        .select("user_id, camps:camp_id(name)")
        .eq("id", bookingId)
        .single();

      const campName = (booking?.camps as unknown as { name: string } | null)?.name ?? "your camp";

      if (booking?.user_id) {
        await supabase.from("notifications").insert({
          user_id: booking.user_id,
          type: "booking_canceled",
          title: "Booking expired",
          body: `Your booking for ${campName} was not completed and has expired.`,
          meta: { campName, bookingId },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}

/* ── Email templates ──────────────────────────────────────────────────────── */

function bookingConfirmedEmailHtml({
  campName,
  bookingId,
  appUrl,
}: {
  campName: string;
  bookingId: string;
  appUrl: string;
}) {
  const activitiesUrl = `${appUrl}/activities`;
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
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111;">You're all set!</h1>
            <p style="margin:0 0 20px;color:#666;font-size:15px;line-height:1.5;">
              Your booking for <strong style="color:#111;">${campName}</strong> has been confirmed. Get ready for an amazing experience!
            </p>
            <a href="${activitiesUrl}"
               style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:14px 28px;border-radius:100px;font-size:15px;font-weight:600;letter-spacing:-0.2px;">
              View your activities →
            </a>
            <p style="margin:24px 0 0;font-size:12px;color:#999;">
              Booking reference: <span style="color:#666;font-family:monospace;">${bookingId}</span>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:12px;color:#aaa;">
              Questions? Visit <a href="${appUrl}/help" style="color:#666;">our help center</a> or reply to this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function hostBookingConfirmedEmailHtml({
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
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111;">New booking confirmed!</h1>
            <p style="margin:0 0 20px;color:#666;font-size:15px;line-height:1.5;">
              <strong style="color:#111;">${parentEmail}</strong> just completed a booking for <strong style="color:#111;">${campName}</strong>. Payment has been processed and funds are on their way.
            </p>
            <a href="${dashboardUrl}"
               style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:14px 28px;border-radius:100px;font-size:15px;font-weight:600;letter-spacing:-0.2px;">
              View booking →
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
