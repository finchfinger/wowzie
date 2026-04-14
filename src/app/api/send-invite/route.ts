import { NextRequest, NextResponse } from "next/server";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { emailTemplate, emailButton } from "@/lib/email-template";

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

  const displayName = senderName || "Someone";
  const personalNote = message?.trim()
    ? `<p style="margin:0 0 16px;color:#555;font-style:italic;">"${message.trim()}"</p>`
    : "";

  const html = emailTemplate(
    `<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;letter-spacing:-0.4px;">${displayName} thinks you'll love this</h1>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">They found a camp or class on Wowzi and wanted to share it with you.</p>
    ${personalNote ? `<p style="margin:0 0 24px;color:#374151;font-size:15px;font-style:italic;line-height:1.6;padding:16px;background:#F1F4F9;border-radius:8px;">"${message!.trim()}"</p>` : ""}
    ${emailButton(shareUrl, "Check it out")}
    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">Or copy this link: <a href="${shareUrl}" style="color:#7B5CBF;text-decoration:none;">${shareUrl}</a></p>`,
    `You received this because ${displayName} shared a listing with you on Wowzi.`
  );

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `${displayName} shared a listing with you on Wowzi`,
    html,
  });

  if (error) {
    console.error("[send-invite] Resend error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
