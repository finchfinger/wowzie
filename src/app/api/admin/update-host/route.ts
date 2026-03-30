import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resend, FROM_EMAIL } from "@/lib/resend";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

function isAdminEmail(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
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

  const body = await req.json() as { userId: string; action: "approve" | "reject" };
  const { userId, action } = body;
  if (!userId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Missing or invalid fields." }, { status: 400 });
  }

  const newStatus = action === "approve" ? "approved" : "rejected";
  const { error: updateErr } = await supabase
    .from("host_profiles")
    .update({ host_status: newStatus, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Send email to the host
  try {
    const { data: hostUser } = await supabase.auth.admin.getUserById(userId);
    const hostEmail = hostUser?.user?.email;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://golly-roan.vercel.app";

    if (hostEmail) {
      if (action === "approve") {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: hostEmail,
          subject: "You're approved to host on Wowzi 🎉",
          html: approvalEmailHtml({ appUrl }),
        });
      } else {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: hostEmail,
          subject: "Update on your Wowzi host application",
          html: rejectionEmailHtml({ appUrl }),
        });
      }
    }
  } catch (e) {
    console.error("[update-host] Failed to send email:", e);
  }

  return NextResponse.json({ ok: true, status: newStatus });
}

/* ── Email templates ───────────────────────────────────────────────────────── */

function approvalEmailHtml({ appUrl }: { appUrl: string }) {
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
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111;">You're approved to host!</h1>
            <p style="margin:0 0 20px;color:#666;font-size:15px;line-height:1.5;">
              Welcome to the host community. You can now create your first listing, set your schedule, and start welcoming families.
            </p>
            <a href="${dashboardUrl}"
               style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:14px 28px;border-radius:100px;font-size:15px;font-weight:600;letter-spacing:-0.2px;">
              Go to your dashboard →
            </a>
            <p style="margin:24px 0 0;font-size:13px;color:#666;line-height:1.6;">
              <strong>What's next:</strong> Create your first listing, add photos and session details, then publish when you're ready. Families will be able to find and book you right away.
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

function rejectionEmailHtml({ appUrl }: { appUrl: string }) {
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
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111;">An update on your application</h1>
            <p style="margin:0 0 20px;color:#666;font-size:15px;line-height:1.5;">
              Thank you for applying to host on Wowzi. After reviewing your application, we're unable to approve it at this time.
            </p>
            <p style="margin:0 0 20px;color:#666;font-size:15px;line-height:1.5;">
              If you believe this decision was made in error, or if you'd like more information, please reach out — we're happy to help.
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
              You received this because you applied to host on Wowzi.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
