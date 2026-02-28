"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

type PlaceLatLng = { lat: number; lng: number };

export type AddressSelection = {
  placeId?: string;
  formattedAddress?: string;
  line1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  location?: PlaceLatLng;
};

type AddressMode = "address" | "city";

type AddressInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "onSelect"
> & {
  mode?: AddressMode;
  value: string;
  onChange: (next: string) => void;
  onSelect?: (selection: AddressSelection) => void;
  country?: string;
  error?: boolean;
};

declare global {
  interface Window {
    google?: any;
  }
}

let googleMapsLoaderPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  if (googleMapsLoaderPromise) return googleMapsLoaderPromise;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  if (!apiKey || !apiKey.trim()) {
    googleMapsLoaderPromise = Promise.reject(
      new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_KEY."),
    );
    return googleMapsLoaderPromise;
  }

  googleMapsLoaderPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(
      'script[data-google-maps="golly"]',
    ) as HTMLScriptElement | null;

    if (existing) {
      if ((existing as any).dataset?.loaded === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Google Maps script failed to load.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "golly";

    script.src =
      "https://maps.googleapis.com/maps/api/js" +
      `?key=${encodeURIComponent(apiKey)}` +
      "&v=weekly" +
      "&libraries=places" +
      "&loading=async";

    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () =>
      reject(new Error("Google Maps script failed to load."));

    document.head.appendChild(script);
  });

  return googleMapsLoaderPromise;
}

type GoogleAddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

function getComponent(
  components: GoogleAddressComponent[] | undefined,
  type: string,
  useShort = false,
) {
  if (!components) return undefined;
  const hit = components.find((c) => c.types?.includes(type));
  if (!hit) return undefined;
  return useShort ? hit.shortText : hit.longText;
}

function buildLine1(components: GoogleAddressComponent[] | undefined) {
  const streetNumber = getComponent(components, "street_number");
  const route = getComponent(components, "route");
  const parts = [streetNumber, route].filter(Boolean);
  return parts.length ? parts.join(" ") : undefined;
}

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}

export const AddressInput: React.FC<AddressInputProps> = ({
  mode = "address",
  value,
  onChange,
  onSelect,
  country = "us",
  error,
  disabled,
  className,
  ...rest
}) => {
  const [ready, setReady] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const sessionTokenRef = useRef<any>(null);
  const activeRequestIdRef = useRef(0);

  const debouncedValue = useDebouncedValue(value, 200);

  const regionCode = useMemo(() => {
    const c = (country || "").trim();
    return c.length === 2 ? c.toUpperCase() : undefined;
  }, [country]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await loadGoogleMaps();
        if (!mounted) return;

        if (!window.google?.maps?.importLibrary) {
          setReady(false);
          return;
        }

        await window.google.maps.importLibrary("places");
        if (!mounted) return;

        setReady(true);
      } catch (e) {
        console.warn("[AddressInput] Maps init failed:", e);
        setReady(false);
      }
    };

    void init();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!ready) return;
      if (disabled) return;

      const q = (debouncedValue || "").trim();
      if (q.length < 3) {
        setSuggestions([]);
        setOpen(false);
        return;
      }

      setLoading(true);
      const requestId = ++activeRequestIdRef.current;

      try {
        const { AutocompleteSuggestion, AutocompleteSessionToken } =
          (await window.google.maps.importLibrary("places")) as any;

        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new AutocompleteSessionToken();
        }

        const request: any = {
          input: q,
          sessionToken: sessionTokenRef.current,
        };

        if (regionCode) request.region = regionCode.toLowerCase();

        const res =
          await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

        if (activeRequestIdRef.current !== requestId) return;

        const next = (res?.suggestions || []).filter(
          (s: any) => s?.placePrediction,
        );
        setSuggestions(next);
        setOpen(next.length > 0);
      } catch (e) {
        if (activeRequestIdRef.current !== requestId) return;
        console.warn(
          "[AddressInput] fetchAutocompleteSuggestions failed:",
          e,
        );
        setSuggestions([]);
        setOpen(false);
      } finally {
        if (activeRequestIdRef.current === requestId) setLoading(false);
      }
    };

    void run();
  }, [ready, disabled, debouncedValue, regionCode]);

  const handlePick = async (s: any) => {
    try {
      const placePrediction = s?.placePrediction;
      if (!placePrediction) return;

      const place = placePrediction.toPlace();

      await place.fetchFields({
        fields: ["id", "formattedAddress", "location", "addressComponents"],
      });

      const comps = (place.addressComponents ||
        []) as GoogleAddressComponent[];

      const city =
        getComponent(comps, "locality") ||
        getComponent(comps, "postal_town") ||
        getComponent(comps, "sublocality") ||
        getComponent(comps, "administrative_area_level_2");

      const state = getComponent(
        comps,
        "administrative_area_level_1",
        true,
      );
      const postalCode = getComponent(comps, "postal_code", true);
      const countryCode = getComponent(comps, "country", true);

      const line1 = mode === "address" ? buildLine1(comps) : undefined;

      const location = place.location
        ? { lat: place.location.lat, lng: place.location.lng }
        : undefined;

      const selection: AddressSelection = {
        placeId: place.id,
        formattedAddress: place.formattedAddress,
        line1,
        city,
        state,
        postalCode,
        country: countryCode,
        location,
      };

      if (mode === "city") {
        const label = [selection.city, selection.state]
          .filter(Boolean)
          .join(", ");
        onChange(label || selection.formattedAddress || value);
      } else {
        onChange(selection.line1 || selection.formattedAddress || value);
      }

      setOpen(false);
      setSuggestions([]);
      sessionTokenRef.current = null;

      if (onSelect) onSelect(selection);
    } catch (e) {
      console.warn("[AddressInput] selection failed:", e);
    }
  };

  return (
    <div className="relative">
      <Input
        {...rest}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          onChange(e.target.value);
          if (!disabled) setOpen(true);
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
        onFocus={() => {
          if (suggestions.length) setOpen(true);
        }}
        disabled={disabled}
        aria-invalid={error || undefined}
        autoComplete={
          mode === "city" ? "address-level2" : "street-address"
        }
        data-places-ready={ready ? "true" : "false"}
        className={cn("h-11", className)}
      />

      {open && !disabled && suggestions.length > 0 && (
        <div
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg"
          role="listbox"
        >
          <ul className="max-h-72 overflow-auto py-1">
            {suggestions.map((s: any, idx: number) => {
              const text =
                s.placePrediction?.text?.toString?.() || "Suggestion";
              return (
                <li key={`${s.placePrediction?.placeId || idx}`}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => void handlePick(s)}
                  >
                    {text}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {loading && (
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          Loading
        </div>
      )}
    </div>
  );
};

export default AddressInput;
