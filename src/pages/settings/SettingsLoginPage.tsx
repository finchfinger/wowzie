import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/ui/Card";
import { SettingsRow } from "../../components/settings/SettingsRow";

type Device = {
  id: string;
  label: string;
  detail: string;
  isCurrent: boolean;
};

/** Shared card-section header */
const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({
  title,
  subtitle,
}) => (
  <div className="px-4 sm:px-5 py-3 border-b border-black/5">
    <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
    {subtitle && (
      <p className="mt-0.5 text-[11px] text-gray-500">{subtitle}</p>
    )}
  </div>
);

/** Small action button used in SettingsRow actions */
const ActionButton: React.FC<{
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "primary";
  children: React.ReactNode;
  type?: "button" | "submit";
}> = ({ onClick, disabled, variant = "default", children, type = "button" }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={
      variant === "primary"
        ? "text-xs font-medium rounded-lg bg-gray-900 px-3 py-1.5 text-white hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed"
        : "text-xs font-medium rounded-lg bg-gray-100 px-3 py-1.5 text-gray-900 hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed"
    }
  >
    {children}
  </button>
);

export const SettingsLoginPage: React.FC = () => {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // devices
  const [devices, setDevices] = useState<Device[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadUserAndSession = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (error || !user) {
        setUserEmail(null);
      } else {
        setUserEmail(user.email ?? null);
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;

        const ua = window.navigator.userAgent;
        let browser = "This browser";
        if (ua.includes("Chrome")) browser = "Chrome";
        else if (ua.includes("Safari")) browser = "Safari";
        else if (ua.includes("Firefox")) browser = "Firefox";

        let platform = "Unknown device";
        if (ua.includes("Mac OS X")) platform = "macOS";
        else if (ua.includes("Windows")) platform = "Windows";
        else if (/iPhone|iPad|iPod/.test(ua)) platform = "iOS";
        else if (/Android/.test(ua)) platform = "Android";

        const lastActive =
          session?.expires_at != null
            ? new Date(session.expires_at * 1000).toLocaleString()
            : "Currently signed in";

        setDevices([
          {
            id: "current",
            label: `${browser} on ${platform}`,
            detail: `Active · ${lastActive}`,
            isCurrent: true,
          },
        ]);
      } catch {
        setDevices([]);
      } finally {
        if (isMounted) setDevicesLoading(false);
      }
    };

    void loadUserAndSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordStatus(null);

    if (!userEmail) {
      setPasswordError("You need to be signed in to change your password.");
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please fill in all password fields.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setPasswordSaving(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });

      if (signInError) {
        setPasswordError("Current password is incorrect.");
        setPasswordSaving(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setPasswordError("We could not update your password. Try again.");
        setPasswordSaving(false);
        return;
      }

      setPasswordStatus("Your password has been updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
    } catch {
      setPasswordError("Something went wrong. Please try again.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleDisconnectDevice = async (deviceId: string) => {
    if (deviceId === "current") {
      await supabase.auth.signOut();
      window.location.href = "/";
    }
  };

  const handleCalendarSyncClick = () => {
    alert("Calendar syncing will be available in a future version.");
  };

  const handleContactsSyncClick = () => {
    alert("Google contacts syncing will be available in a future version.");
  };

  const deviceIcon = (label: string) =>
    /ios|iphone|ipad|android/i.test(label) ? "smartphone" : "laptop_mac";

  return (
    <section className="space-y-4">

      {/* ── Password & security ──────────────────────────────────── */}
      <Card>
        <SectionHeader
          title="Password and security"
          subtitle="Secure your account with a strong password and two-factor authentication."
        />

        {/* Account password */}
        <SettingsRow
          icon="lock"
          label="Account password"
          description={
            userEmail
              ? `Signed in as ${userEmail}`
              : "Update the password you use to sign in."
          }
          action={
            !showPasswordForm ? (
              <ActionButton
                variant="primary"
                onClick={() => setShowPasswordForm(true)}
              >
                {userEmail ? "Change" : "Set password"}
              </ActionButton>
            ) : undefined
          }
        >
          {showPasswordForm && (
            <form onSubmit={handlePasswordSave} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="current-password"
                    className="block text-xs font-medium text-gray-700"
                  >
                    Current password
                  </label>
                  <input
                    id="current-password"
                    type="password"
                    autoComplete="current-password"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="new-password"
                    className="block text-xs font-medium text-gray-700"
                  >
                    New password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="confirm-password"
                    className="block text-xs font-medium text-gray-700"
                  >
                    Confirm new password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ActionButton type="submit" variant="primary" disabled={passwordSaving}>
                  {passwordSaving ? "Saving…" : "Save password"}
                </ActionButton>
                <ActionButton
                  disabled={passwordSaving}
                  onClick={() => {
                    setShowPasswordForm(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setPasswordError(null);
                    setPasswordStatus(null);
                  }}
                >
                  Cancel
                </ActionButton>
              </div>

              {(passwordStatus || passwordError) && (
                <div className="space-y-1">
                  {passwordStatus && (
                    <p className="text-[11px] text-emerald-600">{passwordStatus}</p>
                  )}
                  {passwordError && (
                    <p className="text-[11px] text-rose-600">{passwordError}</p>
                  )}
                </div>
              )}
            </form>
          )}
        </SettingsRow>

        {/* 2FA */}
        <SettingsRow
          icon="verified_user"
          label="Two-factor authentication"
          description="Add an extra layer of security with a one-time code when signing in."
          action={<ActionButton disabled>Coming soon</ActionButton>}
        />
      </Card>

      {/* ── Active devices ───────────────────────────────────────── */}
      <Card>
        <SectionHeader
          title="Active devices"
          subtitle="See where you're signed in. Sign out of any device that looks unfamiliar."
        />

        {devicesLoading && (
          <div className="px-4 sm:px-5 py-4 text-xs text-gray-500">
            Loading devices…
          </div>
        )}

        {!devicesLoading && devices.length === 0 && (
          <div className="px-4 sm:px-5 py-4 text-xs text-gray-500">
            No active devices found.
          </div>
        )}

        {!devicesLoading &&
          devices.map((device) => (
            <SettingsRow
              key={device.id}
              icon={deviceIcon(device.label)}
              label={device.label}
              description={device.detail}
              action={
                <ActionButton onClick={() => handleDisconnectDevice(device.id)}>
                  {device.isCurrent ? "Sign out" : "Disconnect"}
                </ActionButton>
              }
            />
          ))}
      </Card>

      {/* ── Account syncing ──────────────────────────────────────── */}
      <Card>
        <SectionHeader
          title="Account syncing"
          subtitle="Connect calendars and contacts to make planning and inviting easier."
        />

        <SettingsRow
          icon="calendar_month"
          label="Calendar syncing"
          description="Sync your Wowzie activities with Google, Outlook, or Apple Calendar."
          action={
            <ActionButton onClick={handleCalendarSyncClick}>
              Add iCal subscription
            </ActionButton>
          }
        />

        <SettingsRow
          icon="contacts"
          label="Sync contacts with Google"
          description="Sync your Gmail contacts to easily invite families to your events."
          action={
            <ActionButton onClick={handleContactsSyncClick}>
              Enable syncing
            </ActionButton>
          }
        />
      </Card>

    </section>
  );
};

export default SettingsLoginPage;
