import { NextRequest, NextResponse } from "next/server";
import { resend, FROM_EMAIL } from "@/lib/resend";

export async function POST(req: NextRequest) {
  const { email, shareUrl, senderName, message } = await req.json() as {
    email: string;
    shareUrl: string;
    senderName?: string;
    message?: string;
  };

  if (!email || !shareUrl) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const displayName = senderName || "A friend";
  const personalNote = message?.trim()
    ? `<p style="margin:0 0 16px;color:#555;font-style:italic;">"${message.trim()}"</p>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#18181b;padding:28px 32px;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px;">Wowzi 🎉</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111;">${displayName} invited you to see their calendar</h1>
            <p style="margin:0 0 20px;color:#666;font-size:15px;line-height:1.5;">
              They've shared their activity calendar with you on Wowzi — see what camps and classes their kids are signed up for.
            </p>
            ${personalNote}
            <a href="${shareUrl}"
               style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:14px 28px;border-radius:100px;font-size:15px;font-weight:600;letter-spacing:-0.2px;">
              View their calendar →
            </a>
            <p style="margin:24px 0 0;font-size:12px;color:#999;">
              Or copy this link: <a href="${shareUrl}" style="color:#666;">${shareUrl}</a>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:12px;color:#aaa;">
              You received this because ${displayName} shared their Wowzi calendar with you.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `${displayName} shared their calendar with you on Wowzi`,
    html,
  });

  if (error) {
    console.error("[send-invite] Resend error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
