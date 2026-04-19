"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { AddressSelection } from "./AddressInput";

declare global {
  interface Window { google?: any; }
}

// Reuse the same loader so we don't double-load the script
let googleMapsLoaderPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  if (googleMapsLoaderPromise) return googleMapsLoaderPromise;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!apiKey?.trim()) {
    googleMapsLoaderPromise = Promise.reject(new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_KEY."));
    return googleMapsLoaderPromise;
  }
  googleMapsLoaderPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-google-maps="wowzi"]') as HTMLScriptElement | null;
    if (existing) {
      if ((existing as any).dataset?.loaded === "true") { resolve(); return; }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google Maps failed.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.async = true; script.defer = true;
    script.dataset.googleMaps = "wowzi";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&libraries=places&loading=async`;
    script.onload = () => { script.dataset.loaded = "true"; resolve(); };
    script.onerror = () => reject(new Error("Google Maps failed."));
    document.head.appendChild(script);
  });
  return googleMapsLoaderPromise;
}

type GoogleAddressComponent = { longText?: string; shortText?: string; types?: string[] };
function getComponent(comps: GoogleAddressComponent[] | undefined, type: string, short = false) {
  const hit = comps?.find((c) => c.types?.includes(type));
  return hit ? (short ? hit.shortText : hit.longText) : undefined;
}
function buildLine1(comps: GoogleAddressComponent[] | undefined) {
  const parts = [getComponent(comps, "street_number"), getComponent(comps, "route")].filter(Boolean);
  return parts.length ? parts.join(" ") : undefined;
}

type Props = {
  /** Show the virtual option in the picker (class only) */
  showVirtual: boolean;
  locationType: "in_person" | "virtual";
  setLocationType: (t: "in_person" | "virtual") => void;
  setIsVirtual: (v: boolean) => void;
  location: string;
  setLocation: (v: string) => void;
  setLocationLat: (v: number | null) => void;
  setLocationLng: (v: number | null) => void;
  meetingUrl: string;
  setMeetingUrl: (v: string) => void;
};

export function LocationPicker({
  showVirtual,
  locationType,
  setLocationType,
  setIsVirtual,
  location,
  setLocation,
  setLocationLat,
  setLocationLng,
  meetingUrl,
  setMeetingUrl,
}: Props) {
  const [ready, setReady] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState(locationType === "in_person" ? location : "");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionTokenRef = useRef<any>(null);
  const activeRequestRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync inputText when location changes externally
  useEffect(() => {
    if (locationType === "in_person") setInputText(location);
  }, [location, locationType]);

  useEffect(() => {
    let mounted = true;
    loadGoogleMaps()
      .then(() => window.google?.maps?.importLibrary("places"))
      .then(() => { if (mounted) setReady(true); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!ready || locationType === "virtual") return;
    const q = inputText.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 3) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      const requestId = ++activeRequestRef.current;
      try {
        const { AutocompleteSuggestion, AutocompleteSessionToken } =
          (await window.google.maps.importLibrary("places")) as any;
        if (!sessionTokenRef.current) sessionTokenRef.current = new AutocompleteSessionToken();
        const res = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: q, sessionToken: sessionTokenRef.current, region: "us",
        });
        if (activeRequestRef.current !== requestId) return;
        setSuggestions((res?.suggestions || []).filter((s: any) => s?.placePrediction));
      } catch {}
    }, 200);
  }, [ready, inputText, locationType]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handlePick = async (s: any) => {
    try {
      const place = s.placePrediction.toPlace();
      await place.fetchFields({ fields: ["id", "formattedAddress", "location", "addressComponents"] });
      const comps = place.addressComponents as GoogleAddressComponent[];
      const addr = (buildLine1(comps) || place.formattedAddress || inputText)
        .replace(/, USA$/, "").replace(/, United States$/, "");
      setLocation(addr);
      setInputText(addr);
      if (place.location) {
        setLocationLat(place.location.lat);
        setLocationLng(place.location.lng);
      }
      setSuggestions([]);
      setOpen(false);
      sessionTokenRef.current = null;
    } catch {}
  };

  const switchToVirtual = () => {
    setLocationType("virtual");
    setIsVirtual(true);
    setLocation("Virtual");
    setInputText("");
    setSuggestions([]);
    setOpen(false);
  };

  const switchToInPerson = () => {
    setLocationType("in_person");
    setIsVirtual(false);
    setLocation("");
    setInputText("");
    setSuggestions([]);
  };

  const showDropdown = open && (suggestions.length > 0 || showVirtual);

  // ── Virtual selected state ──────────────────────────────────────
  if (locationType === "virtual") {
    return (
      <div className="space-y-2.5">
        {/* Virtual mode "chip" */}
        <div className="flex items-center justify-between rounded-md border border-input bg-white px-3 h-10 shadow-sm">
          <div className="flex items-center gap-2 text-sm">
            <span className="material-symbols-rounded text-muted-foreground" style={{ fontSize: 16 }}>videocam</span>
            <span className="font-medium text-foreground">Virtual / Online</span>
          </div>
          <button
            type="button"
            onClick={switchToInPerson}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Change
          </button>
        </div>
        {/* Meeting link */}
        <input
          type="url"
          value={meetingUrl}
          onChange={(e) => setMeetingUrl(e.target.value)}
          autoComplete="off"
          placeholder="Paste your meeting link"
          className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
        />
        <p className="text-[11px] text-muted-foreground">You can add or update this later.</p>
      </div>
    );
  }

  // ── In-person / picker state ─────────────────────────────────────
  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={inputText}
        onChange={(e) => {
          setInputText(e.target.value);
          setLocation(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        autoComplete="street-address"
        className={cn(
          "h-10 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm outline-none transition-colors",
          "focus-visible:ring-1 focus-visible:ring-ring",
          "placeholder:text-muted-foreground",
        )}
      />

      {showDropdown && (
        <div
          className="absolute z-[200] mt-1.5 w-full overflow-hidden rounded-xl border bg-white shadow-lg"
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Address suggestions */}
          {suggestions.length > 0 && (
            <ul className="py-1">
              {suggestions.map((s: any, idx: number) => {
                const text = s.placePrediction?.text?.toString?.() || "Address";
                return (
                  <li key={s.placePrediction?.placeId || idx}>
                    <button
                      type="button"
                      onClick={() => void handlePick(s)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
                    >
                      <span className="material-symbols-rounded shrink-0 text-muted-foreground" style={{ fontSize: 15 }}>location_on</span>
                      {text}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Virtual option — class only */}
          {showVirtual && (
            <>
              {suggestions.length > 0 && <div className="mx-3 border-t border-border" />}
              <div className="py-1">
                <p className="px-3 pt-1.5 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Virtual</p>
                <button
                  type="button"
                  onClick={switchToVirtual}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
                >
                  <span className="material-symbols-rounded shrink-0 text-muted-foreground" style={{ fontSize: 15 }}>videocam</span>
                  Online / Virtual meeting
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
