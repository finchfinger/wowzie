import { Resend } from "resend";

/** Lazy singleton — instantiated on first use so the build doesn't fail
 *  when RESEND_API_KEY isn't set in the build environment. */
let _resend: Resend | null = null;
export function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

/** @deprecated use getResend() */
export const resend = new Proxy({} as Resend, {
  get(_t, prop) {
    return (getResend() as unknown as Record<string, unknown>)[prop as string];
  },
});

/** The "from" address used for all outgoing emails.
 *  - Dev / no verified domain: use Resend's shared sandbox sender
 *  - Production: replace with e.g. "Wowzi <hello@getwowzi.com>"
 */
export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "Wowzi <onboarding@resend.dev>";
