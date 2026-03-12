import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

/** The "from" address used for all outgoing emails.
 *  - Dev / no verified domain: use Resend's shared sandbox sender
 *  - Production: replace with e.g. "Wowzi <hello@yourdomain.com>"
 */
export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "Wowzi <onboarding@resend.dev>";
