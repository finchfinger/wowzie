/**
 * Google Analytics 4 utilities for Next.js.
 * Uses NEXT_PUBLIC_GA_MEASUREMENT_ID env var.
 *
 * The gtag.js script is loaded in app/layout.tsx via next/script.
 * Call trackPageView() on route changes (in a client component).
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

/** Send a manual page_view event (for client-side navigation). */
export function trackPageView(url: string) {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined" || !window.gtag) return;
  window.gtag("config", GA_MEASUREMENT_ID, { page_path: url });
}

/** Send a custom event. */
export function trackEvent(
  action: string,
  params?: Record<string, string | number | boolean>
) {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", action, params ?? {});
}
