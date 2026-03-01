"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { FormCard } from "@/components/ui/form-card";
import { AddressInput } from "@/components/ui/AddressInput";
import type { AddressSelection } from "@/components/ui/AddressInput";

/* ── Static data ── */

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
  "NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT",
  "VT","VA","WA","WV","WI","WY",
] as const;

const OPERATING_DURATIONS = [
  { value: "lt_1", label: "Less than 1 year" },
  { value: "1_2", label: "1\u20132 years" },
  { value: "3_5", label: "3\u20135 years" },
  { value: "6_10", label: "6\u201310 years" },
  { value: "11_20", label: "11\u201320 years" },
  { value: "20_plus", label: "20+ years" },
];

const REFERRAL_SOURCES = [
  { value: "google_search", label: "Google / Search" },
  { value: "social", label: "Social media" },
  { value: "friend_family", label: "Friend or family" },
  { value: "ad", label: "Advertisement" },
  { value: "other", label: "Other" },
];

/* ── Helpers ── */

const req = (s: string) => s.trim().length > 0;

/** Format 10-digit US phone as (XXX) XXX-XXXX while the user types */
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Format 9-digit EIN as XX-XXXXXXX while the user types */
function formatEin(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

function isAddressSelection(v: unknown): v is AddressSelection {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return "formattedAddress" in o || "placeId" in o || "line1" in o || "city" in o;
}

/* ── Small sub-components ── */

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-muted-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, disabled, placeholder, type = "text", error }: {
  value: string; onChange: (v: string) => void; disabled?: boolean; placeholder?: string; type?: string; error?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className={[
        "block w-full rounded-xl border border-input bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none hover:bg-gray-50 focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-colors",
        error && "border-destructive/50 focus:border-destructive/50 focus:ring-destructive/20",
        disabled && "opacity-60 cursor-not-allowed",
      ].filter(Boolean).join(" ")}
    />
  );
}

function TextareaInput({ value, onChange, disabled, placeholder, rows = 5, error }: {
  value: string; onChange: (v: string) => void; disabled?: boolean; placeholder?: string; rows?: number; error?: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      rows={rows}
      className={[
        "block w-full rounded-xl border border-input bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none hover:bg-gray-50 focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 resize-none transition-colors",
        error && "border-destructive/50 focus:border-destructive/50 focus:ring-destructive/20",
        disabled && "opacity-60 cursor-not-allowed",
      ].filter(Boolean).join(" ")}
    />
  );
}

function SelectInput({ value, onChange, disabled, options, placeholder, error }: {
  value: string; onChange: (v: string) => void; disabled?: boolean; options: { value: string; label: string }[]; placeholder?: string; error?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={[
        "block w-full rounded-xl border border-input bg-transparent px-3 py-2.5 text-sm text-foreground outline-none hover:bg-gray-50 focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 appearance-none transition-colors",
        !value && "text-muted-foreground",
        error && "border-destructive/50 focus:border-destructive/50 focus:ring-destructive/20",
        disabled && "opacity-60 cursor-not-allowed",
      ].filter(Boolean).join(" ")}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function RadioCard({ id, name, title, description, value, selectedValue, disabled, onChange }: {
  id: string; name: string; title: string; description: string; value: string; selectedValue: string; disabled?: boolean; onChange: (v: string) => void;
}) {
  const checked = value === selectedValue;
  return (
    <label
      htmlFor={id}
      className={[
        "flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors",
        checked ? "border-primary bg-primary/5" : "border-input bg-transparent hover:bg-gray-50",
        disabled && "opacity-60 cursor-not-allowed",
      ].filter(Boolean).join(" ")}
    >
      <input type="radio" id={id} name={name} value={value} checked={checked} disabled={disabled} onChange={() => onChange(value)} className="mt-0.5 accent-primary" />
      <div>
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
      </div>
    </label>
  );
}

function CheckboxCard({ id, title, description, checked, disabled, onChange, rightSlot }: {
  id: string; title: string; description?: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void; rightSlot?: React.ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className={[
        "flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors",
        checked ? "border-primary bg-primary/5" : "border-input bg-transparent hover:bg-gray-50",
        disabled && "opacity-60 cursor-not-allowed",
      ].filter(Boolean).join(" ")}
    >
      <input type="checkbox" id={id} checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 accent-primary" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">{title}</div>
        {description && <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>}
      </div>
      {rightSlot}
    </label>
  );
}

/* ── Main page ── */

type AccountType = "individual" | "organization";

export default function HostApplyPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [accountType, setAccountType] = useState<AccountType>("individual");

  // Shared contact
  const [emailAddress, setEmailAddress] = useState("");
  const [phone, setPhone] = useState("");

  // Shared address
  const [formattedAddress, setFormattedAddress] = useState("");
  const [address1, setAddress1] = useState("");
  const [suite, setSuite] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("IL");
  const [postalCode, setPostalCode] = useState("");

  // Individual
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [aboutIndividual, setAboutIndividual] = useState("");

  // Organization
  const [orgName, setOrgName] = useState("");
  const [ein, setEin] = useState("");
  const [primaryContactFirst, setPrimaryContactFirst] = useState("");
  const [primaryContactLast, setPrimaryContactLast] = useState("");
  const [aboutOrg, setAboutOrg] = useState("");
  const [operatingDuration, setOperatingDuration] = useState("");
  const [referralSource, setReferralSource] = useState("");

  // Certifications
  const [certCPR, setCertCPR] = useState(false);
  const [certFirstAid, setCertFirstAid] = useState(false);
  const [certTeaching, setCertTeaching] = useState(false);
  const [certFoodHandling, setCertFoodHandling] = useState(false);

  // Agreements
  const [agreeBackgroundCheck, setAgreeBackgroundCheck] = useState(false);
  const [agreeChildSafety, setAgreeChildSafety] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [termsOpen, setTermsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill email from signed-in account on first load
  useEffect(() => {
    if (user?.email && !emailAddress) setEmailAddress(user.email);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  const validation = useMemo(() => {
    const missing: string[] = [];
    if (!req(emailAddress)) missing.push("Email");
    if (!req(phone)) missing.push("Phone");
    if (!req(address1)) missing.push("Address");
    if (!req(city)) missing.push("City");
    if (!req(state)) missing.push("State");
    if (!req(postalCode)) missing.push("Postal code");

    if (accountType === "individual") {
      if (!req(firstName)) missing.push("First name");
      if (!req(lastName)) missing.push("Last name");
      if (!req(aboutIndividual)) missing.push("About you");
    } else {
      if (!req(orgName)) missing.push("Organization name");
      if (!req(ein)) missing.push("EIN");
      if (!req(primaryContactFirst)) missing.push("Contact first name");
      if (!req(primaryContactLast)) missing.push("Contact last name");
      if (!req(aboutOrg)) missing.push("About organization");
      if (!req(operatingDuration)) missing.push("Operating duration");
    }

    if (!agreeBackgroundCheck) missing.push("Background check");
    if (!agreeChildSafety) missing.push("Child safety policy");
    if (!agreeTerms) missing.push("Terms of service");

    return { ok: missing.length === 0, missing };
  }, [accountType, emailAddress, phone, address1, city, state, postalCode, firstName, lastName, aboutIndividual, orgName, ein, primaryContactFirst, primaryContactLast, aboutOrg, operatingDuration, agreeBackgroundCheck, agreeChildSafety, agreeTerms]);

  const clearForm = () => {
    setAccountType("individual");
    setEmailAddress(""); setPhone("");
    setFormattedAddress(""); setAddress1(""); setSuite(""); setCity(""); setState("IL"); setPostalCode("");
    setFirstName(""); setLastName(""); setDateOfBirth(""); setAboutIndividual("");
    setOrgName(""); setEin(""); setPrimaryContactFirst(""); setPrimaryContactLast(""); setAboutOrg(""); setOperatingDuration(""); setReferralSource("");
    setCertCPR(false); setCertFirstAid(false); setCertTeaching(false); setCertFoodHandling(false);
    setAgreeBackgroundCheck(false); setAgreeChildSafety(false); setAgreeTerms(false);
    setError(null);
  };

  const handleAddressSelect = (p: AddressSelection) => {
    if (!isAddressSelection(p)) return;
    const formatted = p.formattedAddress || "";
    const line1 = p.line1 || formatted;
    setFormattedAddress(formatted || line1);
    setAddress1(line1 || "");
    setCity(p.city || "");
    setState(p.state || "IL");
    setPostalCode(p.postalCode || "");
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
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !authUser) { setError("You need to be signed in to apply."); setSubmitting(false); return; }

      const normalizedPostal = postalCode.replace(/\s+/g, "").slice(0, 10);
      const certs: string[] = [];
      if (certCPR) certs.push("CPR Certified");
      if (certFirstAid) certs.push("First Aid Certified");
      if (certTeaching) certs.push("Teaching License");
      if (certFoodHandling) certs.push("Food Handling Certificate");

      const addrParts = [address1.trim()];
      if (suite.trim()) addrParts.push(suite.trim());
      const cityStateZip = [city.trim(), state, normalizedPostal].filter(Boolean).join(", ");
      const addrJoined = [addrParts.join(" "), cityStateZip].filter(Boolean).join(" \u2022 ");

      const lines: string[] = ["Host application", "", `Account type: ${accountType}`];

      if (accountType === "individual") {
        lines.push(`First name: ${firstName.trim()}`, `Last name: ${lastName.trim()}`);
        if (req(dateOfBirth)) lines.push(`Date of birth: ${dateOfBirth.trim()}`);
      } else {
        lines.push(`Organization name: ${orgName.trim()}`, `EIN: ${ein.trim()}`);
        lines.push(`Primary contact: ${primaryContactFirst.trim()} ${primaryContactLast.trim()}`);
        lines.push(`Operating duration: ${operatingDuration}`);
        if (req(referralSource)) lines.push(`Referral: ${referralSource}`);
      }

      lines.push(`Email: ${emailAddress.trim()}`, `Phone: ${phone.trim()}`, `Address: ${addrJoined}`);
      if (certs.length) { lines.push("", `Certifications: ${certs.join(", ")}`); }
      lines.push("", accountType === "individual" ? "About:" : "About organization:");
      lines.push(accountType === "individual" ? aboutIndividual.trim() : aboutOrg.trim());

      const nowIso = new Date().toISOString();
      const { error: upsertErr } = await supabase.from("host_profiles").upsert(
        {
          user_id: authUser.id,
          about: lines.join("\n"),
          host_status: "pending",
          applied_at: nowIso,
          updated_at: nowIso,
        },
        { onConflict: "user_id" },
      );

      if (upsertErr) { setError("We could not submit your application. Please try again."); setSubmitting(false); return; }
      router.push("/host/reviewing");
    } catch {
      setError("We could not submit your application. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-[900px] px-4 sm:px-6 py-10 pb-16">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Let&apos;s get to know you
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl">
            To make sure every camp is safe, fun, and a good fit, we ask all hosts to tell us a bit about themselves. We&apos;ll review your application and get back to you quickly.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account type */}
          <FormCard title="Account type">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <RadioCard id="host-individual" name="account_type" title="Individual" description="I am teaching classes myself" value="individual" selectedValue={accountType} disabled={submitting} onChange={(v) => setAccountType(v as AccountType)} />
              <RadioCard id="host-organization" name="account_type" title="Organization" description="I represent a business, school, or nonprofit" value="organization" selectedValue={accountType} disabled={submitting} onChange={(v) => setAccountType(v as AccountType)} />
            </div>
          </FormCard>

          {/* Personal or org info */}
          {accountType === "organization" ? (
            <FormCard title="Organization information">
              <div className="space-y-5">
                <Field label="Organization name" required>
                  <TextInput value={orgName} onChange={setOrgName} disabled={submitting} placeholder="The official name of your business, school, or nonprofit" error={!req(orgName) && !!error} />
                </Field>

                <Field label="EIN (Employer Identification Number)" required>
                  <TextInput value={ein} onChange={(v) => setEin(formatEin(v))} disabled={submitting} placeholder="XX-XXXXXXX" error={!req(ein) && !!error} />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Primary contact first name" required>
                    <TextInput value={primaryContactFirst} onChange={setPrimaryContactFirst} disabled={submitting} placeholder="First name" error={!req(primaryContactFirst) && !!error} />
                  </Field>
                  <Field label="Primary contact last name" required>
                    <TextInput value={primaryContactLast} onChange={setPrimaryContactLast} disabled={submitting} placeholder="Last name" error={!req(primaryContactLast) && !!error} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Email address" required>
                    <TextInput type="email" value={emailAddress} onChange={setEmailAddress} disabled={submitting} placeholder="you@domain.com" error={!req(emailAddress) && !!error} />
                  </Field>
                  <Field label="Telephone number" required>
                    <TextInput value={phone} onChange={(v) => setPhone(formatPhone(v))} disabled={submitting} placeholder="(312) 555-0123" error={!req(phone) && !!error} />
                  </Field>
                </div>

                <Field label="Address" required>
                  <AddressInput value={formattedAddress} onChange={(next) => { setFormattedAddress(next); setAddress1(next); }} disabled={submitting} placeholder="Your organization's physical address" error={!req(address1) && !!error} onSelect={handleAddressSelect} />
                </Field>

                <Field label="Suite (if applicable)">
                  <TextInput value={suite} onChange={setSuite} disabled={submitting} placeholder="Apt, suite, unit" />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="City" required>
                    <TextInput value={city} onChange={setCity} disabled={submitting} placeholder="City" error={!req(city) && !!error} />
                  </Field>
                  <Field label="State" required>
                    <SelectInput value={state} onChange={setState} disabled={submitting} options={STATES.map((s) => ({ value: s, label: s }))} error={!req(state) && !!error} />
                  </Field>
                  <Field label="Postal code" required>
                    <TextInput value={postalCode} onChange={setPostalCode} disabled={submitting} placeholder="ZIP" error={!req(postalCode) && !!error} />
                  </Field>
                </div>

                <Field label="Tell families about your organization" required>
                  <TextareaInput value={aboutOrg} onChange={setAboutOrg} disabled={submitting} placeholder="What you offer, who it's for, and what families should expect." error={!req(aboutOrg) && !!error} />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="How long has your organization been operating?" required>
                    <SelectInput value={operatingDuration} onChange={setOperatingDuration} disabled={submitting} options={OPERATING_DURATIONS} placeholder="Select duration" error={!req(operatingDuration) && !!error} />
                  </Field>
                  <Field label="How did you hear about us? (optional)">
                    <SelectInput value={referralSource} onChange={setReferralSource} disabled={submitting} options={REFERRAL_SOURCES} placeholder="Select an option" />
                  </Field>
                </div>
              </div>
            </FormCard>
          ) : (
            <FormCard title="Personal information">
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="First name" required>
                    <TextInput value={firstName} onChange={setFirstName} disabled={submitting} placeholder="First name" error={!req(firstName) && !!error} />
                  </Field>
                  <Field label="Last name" required>
                    <TextInput value={lastName} onChange={setLastName} disabled={submitting} placeholder="Last name" error={!req(lastName) && !!error} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Email address" required>
                    <TextInput type="email" value={emailAddress} onChange={setEmailAddress} disabled={submitting} placeholder="you@domain.com" error={!req(emailAddress) && !!error} />
                  </Field>
                  <Field label="Telephone number" required>
                    <TextInput value={phone} onChange={(v) => setPhone(formatPhone(v))} disabled={submitting} placeholder="(312) 555-0123" error={!req(phone) && !!error} />
                  </Field>
                </div>

                <Field label="Address" required>
                  <AddressInput value={formattedAddress} onChange={(next) => { setFormattedAddress(next); setAddress1(next); }} disabled={submitting} placeholder="Start typing an address" error={!req(address1) && !!error} onSelect={handleAddressSelect} />
                </Field>

                <Field label="Suite (if applicable)">
                  <TextInput value={suite} onChange={setSuite} disabled={submitting} placeholder="Apt, suite, unit" />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="City" required>
                    <TextInput value={city} onChange={setCity} disabled={submitting} placeholder="City" error={!req(city) && !!error} />
                  </Field>
                  <Field label="State" required>
                    <SelectInput value={state} onChange={setState} disabled={submitting} options={STATES.map((s) => ({ value: s, label: s }))} error={!req(state) && !!error} />
                  </Field>
                  <Field label="Postal code" required>
                    <TextInput value={postalCode} onChange={setPostalCode} disabled={submitting} placeholder="ZIP" error={!req(postalCode) && !!error} />
                  </Field>
                </div>

                <Field label="Date of birth">
                  <TextInput type="date" value={dateOfBirth} onChange={setDateOfBirth} disabled={submitting} />
                </Field>

                <Field label="Tell families about yourself" required>
                  <TextareaInput value={aboutIndividual} onChange={setAboutIndividual} disabled={submitting} rows={6} placeholder="Tell us what you host, your experience, and what families should expect." error={!req(aboutIndividual) && !!error} />
                </Field>
              </div>
            </FormCard>
          )}

          {/* Certifications */}
          <FormCard title="Certifications and credentials" subtitle="Not required, but certifications build trust with families and may be needed for certain activity types.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CheckboxCard id="cert-cpr" title="CPR Certified" checked={certCPR} disabled={submitting} onChange={setCertCPR} />
              <CheckboxCard id="cert-first-aid" title="First Aid Certified" checked={certFirstAid} disabled={submitting} onChange={setCertFirstAid} />
              <CheckboxCard id="cert-teaching" title="Teaching License" checked={certTeaching} disabled={submitting} onChange={setCertTeaching} />
              <CheckboxCard id="cert-food" title="Food Handling Certificate" checked={certFoodHandling} disabled={submitting} onChange={setCertFoodHandling} />
            </div>
          </FormCard>

          {/* Verification & agreements */}
          <FormCard title="Verification and agreements">
            <div className="space-y-4">
              {/* Safety banner */}
              <div className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-900">
                <div className="font-semibold">Safety first</div>
                <div className="mt-1 text-amber-900/80">
                  We run background checks on all staff who work with children. Each person needs to be verified separately. This typically takes 2 to 3 business days.
                </div>
              </div>

              <div className="space-y-3">
                <CheckboxCard id="agree-background" title="Background check" description="I consent to a criminal background check. Results are reviewed by our safety team." checked={agreeBackgroundCheck} disabled={submitting} onChange={setAgreeBackgroundCheck} />
                <CheckboxCard id="agree-safety" title="Child safety policy" description="I agree to follow our child safety guidelines, including supervision requirements, reporting obligations, and communication policies." checked={agreeChildSafety} disabled={submitting} onChange={setAgreeChildSafety} />
                <CheckboxCard
                  id="agree-terms"
                  title="Terms of service"
                  description="I agree to the platform's terms of service, privacy policy, and host guidelines."
                  checked={agreeTerms}
                  disabled={submitting}
                  onChange={setAgreeTerms}
                  rightSlot={
                    <button type="button" onClick={() => setTermsOpen(true)} className="shrink-0 text-xs font-medium text-primary underline" disabled={submitting}>
                      View
                    </button>
                  }
                />
              </div>

              {error && (
                <div className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              )}
            </div>
          </FormCard>

          {/* Bottom actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={clearForm}
              disabled={submitting}
              className="text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-60"
            >
              Clear form
            </button>

            <div className="flex items-center gap-2">
              <button type="button" disabled={submitting} className="rounded-md border border-input bg-transparent px-4 py-2 text-sm font-medium text-foreground hover:bg-gray-50 disabled:opacity-60 transition-colors">
                Save for later
              </button>
              <button type="submit" disabled={submitting || !validation.ok} className="rounded-md bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-60">
                {submitting ? "Submitting\u2026" : "Submit for review"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Terms modal */}
      {termsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={(e) => { if (e.target === e.currentTarget) setTermsOpen(false); }}>
          <div className="relative w-full max-w-2xl rounded-3xl bg-background shadow-xl max-h-[90vh] overflow-y-auto">
            <button type="button" onClick={() => setTermsOpen(false)} className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80">&#10005;</button>
            <div className="px-6 pt-8 pb-6">
              <h2 className="text-xl font-semibold tracking-tight text-foreground mb-4">Host Terms &amp; Rules</h2>
              <div className="max-h-[60vh] overflow-auto space-y-4 text-sm text-foreground">
                <div className="space-y-1.5">
                  <h3 className="font-semibold text-sm">Host responsibilities</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">As a host you are responsible for providing a safe, accurate, and welcoming experience for all families. You must maintain current certifications relevant to your activity type and comply with all local regulations.</p>
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-semibold text-sm">Safety and conduct</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">Hosts must follow Golly's child safety guidelines at all times, including appropriate supervision ratios, mandatory reporting obligations, and our communication policies. Any violations may result in immediate suspension.</p>
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-semibold text-sm">Payments and cancellations</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">Golly collects payment on your behalf and disburses funds according to our payout schedule. Cancellation policies you set are binding. Golly's service fee is deducted from each booking.</p>
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-semibold text-sm">Privacy and data</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">Family contact information shared with you through Golly may only be used to coordinate the activity booked. You may not use this data for marketing or share it with third parties.</p>
                </div>
                <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                  This is a summary. The full terms, privacy policy, and host guidelines are available on our{" "}
                  <Link href="/terms" className="text-primary underline underline-offset-2" target="_blank">terms page</Link>.
                </p>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setTermsOpen(false)} className="rounded-md border border-input bg-transparent px-4 py-2 text-sm font-medium text-foreground hover:bg-gray-50 transition-colors">Close</button>
                <Link href="/terms" target="_blank" className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90">Open full page</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
