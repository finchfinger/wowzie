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

export const HostApplicationPage: React.FC = () => {
  const navigate = useNavigate();

  const [businessName, setBusinessName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [address1, setAddress1] = useState("");
  const [suite, setSuite] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("IL");
  const [postalCode, setPostalCode] = useState("");
  const [description, setDescription] = useState("");

  const [agreeSafety, setAgreeSafety] = useState(false);
  const [agreeCancellation, setAgreeCancellation] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!description.trim()) return false;
    if (!agreeSafety || !agreeCancellation || !agreeTerms) return false;
    return true;
  }, [description, agreeSafety, agreeCancellation, agreeTerms]);

  const clearForm = () => {
    setBusinessName("");
    setEmailAddress("");
    setPhone("");
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

    if (!canSubmit) {
      setError("Please complete the form and agree to all items.");
      return;
    }

    setSubmitting(true);

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

    if (businessName.trim()) aboutLines.push(`Business name: ${businessName.trim()}`);

    const effectiveEmail = user.email || emailAddress.trim();
    if (effectiveEmail) aboutLines.push(`Email: ${effectiveEmail}`);

    if (phone.trim()) aboutLines.push(`Telephone: ${phone.trim()}`);

    const addrParts: string[] = [];
    if (address1.trim()) addrParts.push(address1.trim());
    if (suite.trim()) addrParts.push(suite.trim());

    const cityStateZip = [city.trim(), state, normalizedPostal]
      .filter(Boolean)
      .join(", ");
    const addrJoined = [addrParts.join(" "), cityStateZip]
      .filter(Boolean)
      .join(" • ");
    if (addrJoined) aboutLines.push(`Address: ${addrJoined}`);

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
        { onConflict: "user_id" },
      );

    if (upsertErr) {
      console.error("[HostApplicationPage] submit error:", upsertErr);
      setError("We couldn’t submit your application. Please try again.");
      setSubmitting(false);
      return;
    }

    navigate("/host/reviewing", { replace: true });
  };

  return (
    <main className="flex-1 bg-gray-100">
      <Container className="py-10">
        <Grid cols={12} gap="gap-8">
          <div className="col-span-12 lg:col-span-7">
            <SectionHeader
              title="Tell us a little bit about you"
              subtitle="To make sure every camp is safe, fun, and a good fit, we ask all hosts to tell us a bit about themselves. We’ll review your application and get back to you quickly."
            />
          </div>

          <div className="col-span-12 lg:col-span-5">
            <div className="rounded-2xl border border-black/5 bg-white shadow-sm">
              <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Basics</p>
                  <p className="mt-1 text-[11px] text-gray-500">
                    We will need a lawyer to sign off on this.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Business name
                    </label>
                    <Input
                      value={businessName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setBusinessName(e.target.value)
                      }
                      disabled={submitting}
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Email address
                    </label>
                    <Input
                      type="email"
                      value={emailAddress}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEmailAddress(e.target.value)
                      }
                      disabled={submitting}
                      placeholder="Optional (we’ll use your account email if available)"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Telephone number
                    </label>
                    <Input
                      value={phone}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPhone(e.target.value)
                      }
                      disabled={submitting}
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <Input
                      value={address1}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setAddress1(e.target.value)
                      }
                      disabled={submitting}
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Suite (if applicable)
                    </label>
                    <Input
                      value={suite}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSuite(e.target.value)
                      }
                      disabled={submitting}
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <Input
                      value={city}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCity(e.target.value)
                      }
                      disabled={submitting}
                      placeholder="Optional"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        State
                      </label>
                      <select
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        disabled={submitting}
                        className={cx(
                          "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm",
                          "focus:outline-none focus:ring-2 focus:ring-violet-300",
                        )}
                      >
                        {STATES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Postal code
                      </label>
                      <Input
                        value={postalCode}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setPostalCode(e.target.value)
                        }
                        disabled={submitting}
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <Textarea
                      value={description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setDescription(e.target.value)
                      }
                      disabled={submitting}
                      rows={5}
                      placeholder="Tell us what you host, your experience, and what families should expect."
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-3">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      checked={agreeSafety}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setAgreeSafety(e.target.checked)
                      }
                      disabled={submitting}
                    />
                    <label className="text-xs text-gray-700">
                      I agree to follow all safety guidelines and create a secure
                      environment for participants.
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
                      I have read and agree to the full{" "}
                      <a className="underline" href="/terms">
                        Host Terms &amp; Rules
                      </a>
                      .
                    </label>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {error}
                  </div>
                )}

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <Button type="submit" disabled={submitting || !canSubmit}>
                    {submitting ? "Submitting…" : "Submit"}
                  </Button>

                  <button
                    type="button"
                    onClick={clearForm}
                    disabled={submitting}
                    className={cx(
                      "text-sm font-medium",
                      "text-gray-600 hover:text-gray-900",
                      submitting && "opacity-60 cursor-not-allowed",
                    )}
                  >
                    Clear form
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Grid>
      </Container>
    </main>
  );
};

export default HostApplicationPage;
