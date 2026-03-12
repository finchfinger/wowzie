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
      await supabase
        .from("bookings")
        .update({
          payment_status: "paid",
          status: "confirmed",
          stripe_session_id: session.id,
          stripe_payment_intent: session.payment_intent as string | null,
        })
        .eq("id", bookingId);
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
    }
  }

  return NextResponse.json({ received: true });
}
