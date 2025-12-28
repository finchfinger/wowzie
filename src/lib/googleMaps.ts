let promise: Promise<void> | null = null;

export function loadGoogleMapsPlaces(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));

  const w = window as any;
  if (w.google?.maps?.places) return Promise.resolve();

  if (!promise) {
    promise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[data-google-maps="true"]'
      );

      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("Google Maps failed to load")));
        return;
      }

      const script = document.createElement("script");
      script.dataset.googleMaps = "true";
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
        apiKey
      )}&libraries=places`;

      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Google Maps failed to load"));

      document.head.appendChild(script);
    });
  }

  return promise;
}
