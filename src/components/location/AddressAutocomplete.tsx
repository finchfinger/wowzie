import React, { useEffect, useRef } from "react";
import { Input } from "../ui/Input";
import { loadGoogleMapsPlaces } from "../../lib/googleMaps";

export type AddressParts = {
  formattedAddress: string;
  address1: string;
  city: string;
  state: string; // two-letter
  postalCode: string;
  placeId: string;
  lat?: number;
  lng?: number;
};

type Props = {
  value: string;
  onChangeValue: (val: string) => void;
  onSelect: (parts: AddressParts) => void;

  disabled?: boolean;
  placeholder?: string;

  country?: string; // default "us"
};

function pickComponent(place: any, type: string, mode: "short" | "long" = "short") {
  const list: any[] = place?.address_components || [];
  const found = list.find((c) => Array.isArray(c.types) && c.types.includes(type));
  if (!found) return "";
  return mode === "long" ? found.long_name || "" : found.short_name || "";
}

export const AddressAutocomplete: React.FC<Props> = ({
  value,
  onChangeValue,
  onSelect,
  disabled,
  placeholder = "Start typing an address",
  country = "us",
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_KEY as string | undefined;
      if (!apiKey) {
        console.warn("[AddressAutocomplete] Missing VITE_GOOGLE_MAPS_KEY");
        return;
      }

      await loadGoogleMapsPlaces(apiKey);
      if (!mounted) return;

      const w = window as any;
      if (!inputRef.current) return;
      if (autocompleteRef.current) return;
      if (!w.google?.maps?.places) return;

      const ac = new w.google.maps.places.Autocomplete(inputRef.current, {
        types: ["address"],
        fields: ["address_components", "formatted_address", "place_id", "geometry"],
        componentRestrictions: { country },
      });

      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        const formattedAddress = place?.formatted_address || "";
        const placeId = place?.place_id || "";

        const streetNumber = pickComponent(place, "street_number", "short");
        const route = pickComponent(place, "route", "long");
        const address1 = [streetNumber, route].filter(Boolean).join(" ").trim();

        const city =
          pickComponent(place, "locality", "long") ||
          pickComponent(place, "sublocality", "long") ||
          pickComponent(place, "postal_town", "long");

        const state = pickComponent(place, "administrative_area_level_1", "short");
        const postalCode = pickComponent(place, "postal_code", "short");

        const lat = place?.geometry?.location?.lat?.();
        const lng = place?.geometry?.location?.lng?.();

        if (formattedAddress) onChangeValue(formattedAddress);

        onSelect({
          formattedAddress,
          address1: address1 || formattedAddress,
          city,
          state,
          postalCode,
          placeId,
          lat,
          lng,
        });
      });

      autocompleteRef.current = ac;
    };

    void init();

    return () => {
      mounted = false;
    };
  }, [country, onChangeValue, onSelect]);

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChangeValue(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      autoComplete="off"
    />
  );
};
