import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resend, FROM_EMAIL } from "@/lib/resend";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

function isAdminEmail(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();

  // Verify caller is an admin
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: callerData } = await supabase.auth.getUser(token);
  const callerEmail = callerData?.user?.email ?? "";
  if (!isAdminEmail(callerEmail)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await req.json() as { campId: string; action: "approve" | "reject" };
  const { campId, action } = body;
  if (!campId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Missing or invalid fields." }, { status: 400 });
  }

  // Fetch the camp to get host_id and name
  const { data: camp, error: campErr } = await supabase
    .from("camps")
    .select("id, name, host_id")
    .eq("id", campId)
    .single();

  if (campErr || !camp) {
    return NextResponse.json({ error: "Camp not found." }, { status: 404 });
  }

  // Update approval_status (and publish if approving)
  const updates =
    action === "approve"
      ? { approval_status: "approved", is_published: true, is_active: true }
      : { approval_status: "rejected", is_published: false, is_active: false };

  const { error: updateErr } = await supabase
    .from("camps")
    .update(updates)
    .eq("id", campId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Send email to host
  try {
    const { data: hostUser } = await supabase.auth.admin.getUserById(camp.host_id as string);
    const hostEmail = hostUser?.user?.email;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://golly-roan.vercel.app";

    if (hostEmail) {
      if (action === "approve") {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: hostEmail,
          subject: `Your listing "${camp.name}" is live on Wowzi 🎉`,
          html: approvalEmailHtml({ campName: camp.name as string, appUrl }),
        });
      } else {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: hostEmail,
          subject: `Update on your listing "${camp.name}"`,
          html: rejectionEmailHtml({ campName: camp.name as string, appUrl }),
        });
      }
    }
  } catch (e) {
    console.error("[approve-listing] Failed to send email:", e);
  }

  return NextResponse.json({ ok: true, approval_status: updates.approval_status });
}

/* ── Email templates ───────────────────────────────────────────────────────── */

function approvalEmailHtml({ campName, appUrl }: { campName: string; appUrl: string }) {
  const dashboardUrl = `${appUrl}/host/listings`;
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
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111;">Your listing is live!</h1>
            <p style="margin:0 0 6px;color:#666;font-size:15px;line-height:1.5;">
              <strong style="color:#111;">${campName}</strong> has been reviewed and is now live on Wowzi. Families can find and book it right away.
            </p>
            <p style="margin:0 0 20px;color:#666;font-size:15px;line-height:1.5;">
              Head to your dashboard to share it, track bookings, and manage your schedule.
            </p>
            <a href="${dashboardUrl}"
               style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:14px 28px;border-radius:100px;font-size:15px;font-weight:600;letter-spacing:-0.2px;">
              Go to your dashboard →
            </a>
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

function rejectionEmailHtml({ campName, appUrl }: { campName: string; appUrl: string }) {
  const contactUrl = `${appUrl}/contact`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#18181b;padding:28px 32px;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px;">Wowzi</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111;">An update on your listing</h1>
            <p style="margin:0 0 6px;color:#666;font-size:15px;line-height:1.5;">
              Thanks for submitting <strong style="color:#111;">${campName}</strong>. After review, we weren't able to approve it at this time.
            </p>
            <p style="margin:0 0 20px;color:#666;font-size:15px;line-height:1.5;">
              If you think this was a mistake or want more detail, please get in touch — we're happy to help.
            </p>
            <a href="${contactUrl}"
               style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:14px 28px;border-radius:100px;font-size:15px;font-weight:600;letter-spacing:-0.2px;">
              Contact us →
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:12px;color:#aaa;">
              You received this because you submitted a listing on Wowzi.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
