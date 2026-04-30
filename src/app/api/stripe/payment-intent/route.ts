import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { resend, FROM_EMAIL } from "@/lib/resend";

export const runtime = "nodejs";

/* ── Types ── */
type LineItem = {
  label: string;
  cents: number; // positive = fee, negative = discount
  note?: string;
};

/* ── Price computation ── */
function computeBreakdown(
  priceCents: number,
  sessions: number,
  guests: number,
  meta: any,
): { totalCents: number; breakdown: LineItem[] } {
  const subtotal = priceCents * sessions * guests;
  const breakdown: LineItem[] = [{ label: "Base price", cents: subtotal }];
  let total = subtotal;

  const adv = meta?.advanced ?? {};

  // Custom fees (mandatory, per child)
  for (const addon of (adv.customAddOns ?? []) as any[]) {
    if (!addon.enabled || !addon.name?.trim()) continue;
    const amount = parseFloat(addon.price ?? "0");
    if (!amount || amount <= 0) continue;
    let delta: number;
    if (addon.priceType === "percent") {
      delta = Math.round(subtotal * amount / 100);
    } else {
      delta = Math.round(amount * 100) * guests;
    }
    if (addon.itemType === "discount") delta = -delta;
    breakdown.push({
      label: addon.name,
      cents: delta,
      note: addon.priceType === "percent" ? `${amount}%` : undefined,
    });
    total += delta;
  }

  // Sibling discount — auto when guests > 1
  const sib = adv.siblingDiscount ?? {};
  if (sib.enabled && guests > 1) {
    const extraKids = guests - 1;
    const val = parseFloat(sib.value ?? "0");
    let discountCents: number;
    if (sib.type === "percent" && val > 0) {
      discountCents = Math.round(priceCents * sessions * extraKids * (val / 100));
      breakdown.push({ label: "Sibling discount", cents: -discountCents, note: `${val}% off additional children` });
    } else if (sib.type === "amount" && val > 0) {
      discountCents = Math.round(val * 100) * extraKids * sessions;
      breakdown.push({ label: "Sibling discount", cents: -discountCents });
    } else {
      discountCents = 0;
    }
    total -= discountCents;
  }

  // Multi-session discount — auto when sessions >= 2
  const msd = adv.multiSessionDiscount ?? {};
  if (msd.enabled && sessions >= 2) {
    const pct = parseFloat(msd.percent ?? "0");
    if (pct > 0) {
      const discountCents = Math.round(subtotal * pct / 100);
      breakdown.push({ label: "Multi-session discount", cents: -discountCents, note: `${pct}% off` });
      total -= discountCents;
    }
  }

  return { totalCents: Math.max(0, total), breakdown };
}

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
    const supabase = getSupabase();

    /* ── Capacity check ── */
    const { data: campData } = await supabase
      .from("camps").select("capacity, name, meta").eq("id", campId).single();

    const campMeta = (campData?.meta ?? {}) as Record<string, any>;

    /* ── Compute real total with fees + discounts ── */
    const { totalCents, breakdown } = computeBreakdown(priceCents, sessions, guests, campMeta);
    const metaSessions: any[] = Array.isArray(campMeta.campSessions) ? campMeta.campSessions : [];

    if (sessionIds && sessionIds.length > 0 && metaSessions.length > 0) {
      /* Per-session capacity check — new model */
      for (const sessionId of sessionIds) {
        const session = metaSessions.find((s: any) => s.id === sessionId);
        if (!session) continue;

        // Use the first schedule option's capacity as the session cap
        const rawCap = session.scheduleOptions?.[0]?.capacity ?? session.capacity ?? "";
        const sessionCap = parseInt(rawCap, 10);
        if (!sessionCap || sessionCap <= 0) continue;

        // Count guests already booked into this specific session
        const { data: sessionBookings } = await supabase
          .from("bookings")
          .select("guests_count")
          .eq("camp_id", campId)
          .contains("selected_sessions", [sessionId])
          .not("status", "in", '("cancelled","refunded")');

        const taken = (sessionBookings ?? []).reduce((sum: number, b: any) => sum + (b.guests_count ?? 1), 0);

        if (taken + guests > sessionCap) {
          const spotsLeft = Math.max(0, sessionCap - taken);
          return NextResponse.json({
            error: spotsLeft === 0
              ? "This session is fully booked."
              : `Only ${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} remaining in this session.`,
            spotsLeft,
          }, { status: 409 });
        }
      }
    } else {
      /* Global capacity check — legacy / class model fallback */
      const campCapacity = typeof campData?.capacity === "number" && campData.capacity > 0
        ? campData.capacity : null;

      if (campCapacity !== null) {
        const { data: existingBookings } = await supabase
          .from("bookings").select("guests_count").eq("camp_id", campId)
          .not("status", "in", '("cancelled","refunded")');

        const spotsTaken = (existingBookings ?? []).reduce((sum: number, b: any) => sum + (b.guests_count ?? 1), 0);
        if (spotsTaken + guests > campCapacity) {
          const spotsLeft = Math.max(0, campCapacity - spotsTaken);
          return NextResponse.json({
            error: spotsLeft === 0 ? "This camp is fully booked." : `Only ${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} remaining.`,
            spotsLeft,
          }, { status: 409 });
        }
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
    const { data: parentAuthUser } = await supabase.auth.admin.getUserById(userId);
    const parentMeta = parentAuthUser?.user?.user_metadata ?? {};
    const parentName =
      parentProfile?.preferred_first_name?.trim() ||
      parentProfile?.legal_name?.trim() ||
      (parentMeta.first_name as string | undefined)?.trim() ||
      ([parentMeta.first_name, parentMeta.last_name].filter(Boolean).join(" ").trim()) ||
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

    return NextResponse.json({ clientSecret: paymentIntent.client_secret, bookingId: booking.id, totalCents, breakdown });
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
