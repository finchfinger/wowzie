declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

export function initGA(measurementId: string) {
  if (!measurementId) return;
  if (typeof window === "undefined") return;
  if (window.gtag) return; // already initialized

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: any[]) {
    window.dataLayer!.push(args);
  };

  // Load gtag.js
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(s);

  // Configure GA4. Turn off auto page_view for SPAs.
  window.gtag("js", new Date());
  window.gtag("config", measurementId, { send_page_view: false });
}
