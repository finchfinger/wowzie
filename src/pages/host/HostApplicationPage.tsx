// src/pages/host/HostApplicationPage.tsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Container } from "../../components/layout/Container";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Grid } from "../../components/layout/Grid";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Checkbox } from "../../components/ui/Checkbox";
import { Button } from "../../components/ui/Button";
import { AddressInput } from "../../components/ui/AddressInput";
import type { AddressSelection } from "../../components/ui/AddressInput";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "../../components/ui/Select";
import Modal from "../../components/ui/Modal";
import TermsContent from "../../components/legal/TermsContent";

const STATES: Array<{ value: string; label: string }> = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "DC", label: "District of Columbia" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

function isAddressSelection(v: unknown): v is AddressSelection {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    "formattedAddress" in o ||
    "placeId" in o ||
    "line1" in o ||
    "city" in o ||
    "state" in o ||
    "postalCode" in o
  );
}

const req = (s: string) => s.trim().length > 0;

const HostApplicationPage: React.FC = () => {
  const navigate = useNavigate();

  const [businessName, setBusinessName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [phone, setPhone] = useState("");

  const [formattedAddress, setFormattedAddress] = useState("");
  const [address1, setAddress1] = useState("");
  const [suite, setSuite] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("IL");
  const [postalCode, setPostalCode] = useState("");

  const [description, setDescription] = useState("");

  const [agreeSafety, setAgreeSafety] = useState(false);
  const [agreeCancellation, setAgreeCancellation] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [termsOpen, setTermsOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stateLabel = useMemo(() => {
    const hit = STATES.find((s) => s.value === state);
    return hit?.label || state;
  }, [state]);

  const validation = useMemo(() => {
    const missing: string[] = [];

    if (!req(businessName)) missing.push("Business name");
    if (!req(emailAddress)) missing.push("Email address");
    if (!req(phone)) missing.push("Telephone number");

    if (!req(address1)) missing.push("Address");
    if (!req(city)) missing.push("City");
    if (!req(state)) missing.push("State");
    if (!req(postalCode)) missing.push("Postal code");

    if (!req(description)) missing.push("Description");

    if (!agreeSafety) missing.push("Safety agreement");
    if (!agreeCancellation) missing.push("Cancellation agreement");
    if (!agreeTerms) missing.push("Terms agreement");

    return { ok: missing.length === 0, missing };
  }, [
    businessName,
    emailAddress,
    phone,
    address1,
    city,
    state,
    postalCode,
    description,
    agreeSafety,
    agreeCancellation,
    agreeTerms,
  ]);

  const clearForm = () => {
    setBusinessName("");
    setEmailAddress("");
    setPhone("");

    setFormattedAddress("");
    setAddress1("");
    setSuite("");
    setCity("");
    setState("IL");
    setPostalCode("");

    setDescription("");
    setAgreeSafety(false);
    setAgreeCancellation(false);
    setAgreeTerms(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setError(null);

    if (!validation.ok) {
      setError(`Please complete: ${validation.missing.join(", ")}.`);
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("You need to be signed in to apply.");
        setSubmitting(false);
        return;
      }

      const normalizedPostal = postalCode.replace(/\s+/g, "").slice(0, 10);

      const aboutLines: string[] = [];
      aboutLines.push("Host application");
      aboutLines.push("");

      aboutLines.push(`Business name: ${businessName.trim()}`);
      aboutLines.push(`Email: ${emailAddress.trim()}`);
      aboutLines.push(`Telephone: ${phone.trim()}`);

      const addrParts: string[] = [];
      addrParts.push(address1.trim());
      if (suite.trim()) addrParts.push(suite.trim());

      const cityStateZip = [city.trim(), state, normalizedPostal]
        .filter(Boolean)
        .join(", ");
      const addrJoined = [addrParts.join(" "), cityStateZip]
        .filter(Boolean)
        .join(" • ");
      aboutLines.push(`Address: ${addrJoined}`);

      aboutLines.push("");
      aboutLines.push("Description:");
      aboutLines.push(description.trim());

      const aboutPayload = aboutLines.join("\n");
      const nowIso = new Date().toISOString();

      const { error: upsertErr } = await supabase
        .from("host_profiles")
        .upsert(
          {
            user_id: user.id,
            about: aboutPayload,
            host_status: "pending",
            applied_at: nowIso,
            updated_at: nowIso,
          },
          { onConflict: "user_id" }
        );

      if (upsertErr) {
        console.error("[HostApplicationPage] submit error:", upsertErr);
        setError("We couldn’t submit your application. Please try again.");
        setSubmitting(false);
        return;
      }

      navigate("/host/reviewing", { replace: true });
    } catch (err) {
      console.error("[HostApplicationPage] unexpected submit error:", err);
      setError("We couldn’t submit your application. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <main className="flex-1 bg-[#F5F1FF]">
      <Container className="py-10 pb-16">
        <Grid cols={12} gap="gap-8">
          <div className="col-span-12 lg:col-span-8 lg:col-start-3">
            <div className="mx-auto w-full max-w-[840px]">
              <SectionHeader
                title="Tell us a little bit about you"
                subtitle="To make sure every camp is safe, fun, and a good fit, we ask all hosts to tell us a bit about themselves. We’ll review your application and get back to you quickly."
              />

              <div className="mt-8 rounded-2xl border border-black/5 bg-white shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
                  {/* Business name */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">
                      Business name
                    </label>
                    <Input
                      value={businessName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setBusinessName(e.target.value)
                      }
                      disabled={submitting}
                      placeholder="Your business name"
                      error={!req(businessName) && !!error}
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">
                      Email address
                    </label>
                    <Input
                      type="email"
                      value={emailAddress}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEmailAddress(e.target.value)
                      }
                      disabled={submitting}
                      placeholder="you@domain.com"
                      error={!req(emailAddress) && !!error}
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">
                      Telephone number
                    </label>
                    <Input
                      value={phone}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPhone(e.target.value)
                      }
                      disabled={submitting}
                      placeholder="(312) 555-0123"
                      error={!req(phone) && !!error}
                    />
                  </div>

                  {/* Address */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">
                      Address
                    </label>
                    <AddressInput
                      value={formattedAddress}
                      onChange={(next) => {
                        setFormattedAddress(next);
                        setAddress1(next);
                      }}
                      disabled={submitting}
                      placeholder="Start typing an address"
                      error={!req(address1) && !!error}
                      onSelect={(p) => {
                        if (!isAddressSelection(p)) return;

                        const formatted = p.formattedAddress || "";
                        const line1 = p.line1 || formatted;

                        setFormattedAddress(formatted || line1);
                        setAddress1(line1 || "");
                        setCity(p.city || "");
                        setState(p.state || "IL");
                        setPostalCode(p.postalCode || "");
                      }}
                    />
                  </div>

                  {/* Suite */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">
                      Suite
                    </label>
                    <Input
                      value={suite}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSuite(e.target.value)
                      }
                      disabled={submitting}
                      placeholder="Apt, suite, unit"
                    />
                  </div>

                  {/* City / State / Postal */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-700">
                        City
                      </label>
                      <Input
                        value={city}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCity(e.target.value)
                        }
                        disabled={submitting}
                        placeholder="City"
                        error={!req(city) && !!error}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-700">
                        State
                      </label>
                      <Select value={state} onValueChange={(v) => setState(v)}>
                        <SelectTrigger
                          className={cx("h-11 w-full")}
                          aria-label="State"
                          error={!req(state) && !!error}
                        >
                          <span className="text-gray-900">{stateLabel}</span>
                        </SelectTrigger>
                        <SelectContent>
                          {STATES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-700">
                        Postal code
                      </label>
                      <Input
                        value={postalCode}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setPostalCode(e.target.value)
                        }
                        disabled={submitting}
                        placeholder="ZIP"
                        error={!req(postalCode) && !!error}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">
                      Description
                    </label>
                    <Textarea
                      value={description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setDescription(e.target.value)
                      }
                      disabled={submitting}
                      rows={6}
                      placeholder="Tell us what you host, your experience, and what families should expect."
                      error={!req(description) && !!error}
                    />
                    <p className="text-[11px] text-gray-500">
                      Be specific: what you offer, who it’s for, and what a typical session looks
                      like.
                    </p>
                  </div>

                  {/* Agreements */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={agreeSafety}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setAgreeSafety(e.target.checked)
                        }
                        disabled={submitting}
                      />
                      <label className="text-xs text-gray-700">
                        I agree to follow all safety guidelines and create a secure environment for
                        participants.
                      </label>
                    </div>

                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={agreeCancellation}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setAgreeCancellation(e.target.checked)
                        }
                        disabled={submitting}
                      />
                      <label className="text-xs text-gray-700">
                        I agree to honor my stated cancellation and refund policy.
                      </label>
                    </div>

                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={agreeTerms}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setAgreeTerms(e.target.checked)
                        }
                        disabled={submitting}
                      />
                      <label className="text-xs text-gray-700">
                        I have read and agree to the{" "}
                        <button
                          type="button"
                          onClick={() => setTermsOpen(true)}
                          className="underline"
                        >
                          Host Terms &amp; Rules
                        </button>
                        .
                      </label>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {error}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={clearForm}
                      disabled={submitting}
                      className={cx(
                        "text-sm font-medium text-gray-600 hover:text-gray-900",
                        submitting && "cursor-not-allowed opacity-60"
                      )}
                    >
                      Clear form
                    </button>

                    <Button type="submit" disabled={submitting || !validation.ok}>
                      {submitting ? "Submitting…" : "Submit application"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </Grid>
      </Container>

      <Modal
        isOpen={termsOpen}
        onClose={() => setTermsOpen(false)}
        title="Host Terms & Rules"
        size="lg"
      >
        <div className="max-h-[60vh] overflow-auto pr-1 space-y-4 overscroll-contain">
          <TermsContent />
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setTermsOpen(false)}>
            Close
          </Button>

          <a href="/terms" target="_blank" rel="noreferrer">
            <Button type="button" variant="primary">
              Open full page
            </Button>
          </a>
        </div>
      </Modal>
    </main>
  );
};

export default HostApplicationPage;
