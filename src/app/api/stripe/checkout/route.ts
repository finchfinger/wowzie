import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

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

    // Pre-create booking with payment_status = 'pending'
    const supabase = getSupabase();
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
      .select("host_id")
      .eq("id", campId)
      .single();

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
