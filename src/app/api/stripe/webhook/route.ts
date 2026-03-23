import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

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
        .select("user_id, total_cents, camps:camp_id(name, host_id)")
        .eq("id", bookingId)
        .single();

      const camp = (booking?.camps as unknown as { name: string; host_id: string } | null);
      const campName = camp?.name ?? "your camp";
      const hostId = camp?.host_id;

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
