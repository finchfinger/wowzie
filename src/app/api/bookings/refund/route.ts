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

/**
 * POST /api/bookings/refund
 * Body: { bookingId: string, amountCents?: number }
 *
 * Verifies the requesting user is the host of the camp, then issues a
 * Stripe refund and marks the booking as refunded.
 */
export async function POST(req: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  try {
    const { bookingId, amountCents } = await req.json() as {
      bookingId: string;
      amountCents?: number;
    };

    if (!bookingId) {
      return NextResponse.json({ error: "Missing bookingId." }, { status: 400 });
    }

    const supabase = getSupabase();

    /* ── Verify caller is authenticated ── */
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    /* ── Load booking ── */
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, status, payment_status, total_cents, contact_email, stripe_payment_intent, camps:camp_id(name, host_id)")
      .eq("id", bookingId)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    const camp = booking.camps as unknown as { name: string; host_id: string } | null;

    /* ── Verify caller is the host ── */
    if (camp?.host_id !== user.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    /* ── Guard: already refunded ── */
    if (booking.status === "refunded" || booking.payment_status === "refunded") {
      return NextResponse.json({ error: "This booking has already been refunded." }, { status: 409 });
    }

    /* ── Guard: needs a payment intent ── */
    if (!booking.stripe_payment_intent) {
      return NextResponse.json({
        error: "No payment found for this booking. It may have been booked offline or payment is still pending.",
      }, { status: 422 });
    }

    /* ── Issue Stripe refund ── */
    const stripe = new Stripe(stripeSecretKey);
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: booking.stripe_payment_intent,
    };
    if (amountCents && amountCents > 0 && amountCents < (booking.total_cents ?? 0)) {
      refundParams.amount = amountCents;
    }

    const refund = await stripe.refunds.create(refundParams);

    if (refund.status === "failed") {
      return NextResponse.json({ error: "Stripe refund failed. Please try again or contact support." }, { status: 502 });
    }

    const isPartial = !!amountCents && amountCents < (booking.total_cents ?? 0);

    /* ── Update booking in DB ── */
    await supabase
      .from("bookings")
      .update({
        status: "refunded",
        payment_status: "refunded",
        refund_amount_cents: amountCents ?? booking.total_cents,
        refunded_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    /* ── Email parent ── */
    const parentEmail = booking.contact_email as string | null;
    const campName = camp?.name ?? "the activity";
    const refundAmountCents = amountCents ?? (booking.total_cents ?? 0);

    if (parentEmail) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://heywowzi.com";
        await resend.emails.send({
          from: FROM_EMAIL,
          to: parentEmail,
          subject: `Your refund for ${campName} is on the way`,
          html: refundEmailHtml({ campName, amountCents: refundAmountCents, isPartial, bookingId, appUrl }),
        });
      } catch (e) {
        console.error("[refund] parent email failed:", e);
      }
    }

    return NextResponse.json({
      success: true,
      refundId: refund.id,
      amountCents: refundAmountCents,
      isPartial,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function refundEmailHtml({
  campName, amountCents, isPartial, bookingId, appUrl,
}: {
  campName: string;
  amountCents: number;
  isPartial: boolean;
  bookingId: string;
  appUrl: string;
}) {
  const amount = `$${(amountCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#18181b;padding:28px 32px;"><p style="margin:0;font-size:22px;font-weight:700;color:#fff;">Wowzi</p></td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111;">Your refund is on the way</h1>
          <p style="margin:0 0 20px;color:#666;font-size:15px;line-height:1.5;">
            A ${isPartial ? "partial " : ""}refund of <strong style="color:#111;">${amount}</strong> for
            <strong style="color:#111;">${campName}</strong> has been issued. It typically takes
            5–10 business days to appear on your statement.
          </p>
          <a href="${appUrl}/activities" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:14px 28px;border-radius:100px;font-size:15px;font-weight:600;">
            Browse activities →
          </a>
          <p style="margin:24px 0 0;font-size:12px;color:#999;">Booking reference: <span style="font-family:monospace;color:#666;">${bookingId}</span></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
