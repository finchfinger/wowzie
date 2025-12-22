import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Device = {
  id: string;
  label: string;
  detail: string;
  isCurrent: boolean;
};

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
      // 1) current auth user
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

      // 2) "active devices" – for now just this browser
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

        const label = `${browser} on ${platform}`;

        setDevices([
          {
            id: "current",
            label,
            detail: `Active · ${lastActive}`,
            isCurrent: true,
          },
        ]);
      } catch (e) {
        console.warn("Could not load session info for devices", e);
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
      // 1) re-auth with current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });

      if (signInError) {
        setPasswordError("Current password is incorrect.");
        setPasswordSaving(false);
        return;
      }

      // 2) update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error("Error updating password:", updateError);
        setPasswordError("We could not update your password. Try again.");
        setPasswordSaving(false);
        return;
      }

      setPasswordStatus("Your password has been updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
    } catch (err) {
      console.error("Unexpected error updating password:", err);
      setPasswordError("Something went wrong. Please try again.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleDisconnectDevice = async (deviceId: string) => {
    // For now we only know about the current device.
    // Later you can call a serverless function that revokes specific sessions
    // via the Supabase service role key.
    if (deviceId === "current") {
      // sign out everywhere
      await supabase.auth.signOut();
      window.location.href = "/";
    }
  };

  const handleCalendarSyncClick = () => {
    // Stub – plug Google OAuth / ICS flow here
    alert("Calendar syncing will be available in a future version.");
  };

  const handleContactsSyncClick = () => {
    // Stub – plug Google People API flow here
    alert("Google contacts syncing will be available in a future version.");
  };

  return (
    <section className="space-y-4">
      {/* Password & security */}
      <div className="rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b border-black/5">
          <h2 className="text-sm font-semibold">Password and security</h2>
          <p className="mt-0.5 text-[11px] text-gray-500">
            Secure your account with password and two-factor authentication.
          </p>
        </div>

        {/* Account password row */}
        <div className="px-4 sm:px-5 py-3 border-b border-black/5 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-gray-900">Account password</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Update the password you use to sign in to Wowzie.
              </p>
            </div>
            {!showPasswordForm && (
              <button
                type="button"
                className="text-xs font-medium rounded-lg bg-gray-900 px-3 py-1.5 text-white hover:bg-black"
                onClick={() => setShowPasswordForm(true)}
              >
                {userEmail ? "Change password" : "Set password"}
              </button>
            )}
          </div>

          {showPasswordForm && (
            <form
              onSubmit={handlePasswordSave}
              className="mt-3 space-y-3 text-sm"
            >
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

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="inline-flex items-center rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-black disabled:opacity-60"
                >
                  {passwordSaving ? "Saving…" : "Save password"}
                </button>
                <button
                  type="button"
                  disabled={passwordSaving}
                  className="inline-flex items-center rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-900 hover:bg-gray-200 disabled:opacity-60"
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
                </button>
              </div>

              {(passwordStatus || passwordError) && (
                <div className="pt-1 space-y-1">
                  {passwordStatus && (
                    <p className="text-[11px] text-emerald-600">
                      {passwordStatus}
                    </p>
                  )}
                  {passwordError && (
                    <p className="text-[11px] text-rose-600">
                      {passwordError}
                    </p>
                  )}
                </div>
              )}
            </form>
          )}
        </div>

        {/* 2FA row – placeholder for later */}
        <div className="px-4 sm:px-5 py-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-gray-900">
                Two-factor authentication
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                Add an extra layer of security to your account with a one-time
                code when signing in.
              </p>
            </div>
            <button
              type="button"
              className="text-xs font-medium rounded-lg bg-gray-100 px-3 py-1.5 text-gray-500 cursor-not-allowed"
              disabled
            >
              Coming soon
            </button>
          </div>
        </div>
      </div>

      {/* Active devices */}
      <div className="rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b border-black/5">
          <h2 className="text-sm font-semibold">Active devices</h2>
          <p className="mt-0.5 text-[11px] text-gray-500">
            See where you’re currently signed in. You can sign out of other
            devices if something looks unfamiliar.
          </p>
        </div>

        <div className="divide-y divide-black/5 text-sm">
          {devicesLoading && (
            <div className="px-4 sm:px-5 py-3 text-xs text-gray-500">
              Loading devices…
            </div>
          )}

          {!devicesLoading && devices.length === 0 && (
            <div className="px-4 sm:px-5 py-3 text-xs text-gray-500">
              No active devices found.
            </div>
          )}

          {!devicesLoading &&
            devices.map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between px-4 sm:px-5 py-3"
              >
                <div>
                  <p className="text-sm text-gray-900">{device.label}</p>
                  <p className="text-xs text-gray-500">{device.detail}</p>
                </div>
                <button
                  type="button"
                  className="text-xs font-medium text-gray-700 hover:text-gray-900"
                  onClick={() => handleDisconnectDevice(device.id)}
                >
                  {device.isCurrent ? "Sign out" : "Disconnect"}
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* Account syncing */}
      <div className="rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b border-black/5">
          <h2 className="text-sm font-semibold">Account syncing</h2>
          <p className="mt-0.5 text-[11px] text-gray-500">
            Connect calendars and contacts to make planning and inviting easier.
          </p>
        </div>

        <div className="divide-y divide-black/5 text-sm">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3">
            <div>
              <p className="text-sm text-gray-900">Calendar syncing</p>
              <p className="text-xs text-gray-500">
                Sync your Wowzie activities with Google, Outlook, or Apple
                calendar.
              </p>
            </div>
            <button
              type="button"
              className="text-xs font-medium rounded-lg bg-gray-100 px-3 py-1.5 text-gray-900 hover:bg-gray-200"
              onClick={handleCalendarSyncClick}
            >
              Add iCal subscription
            </button>
          </div>

          <div className="flex items-center justify-between px-4 sm:px-5 py-3">
            <div>
              <p className="text-sm text-gray-900">Sync contacts with Google</p>
              <p className="text-xs text-gray-500">
                Sync your Gmail contacts to easily invite families to your
                events.
              </p>
            </div>
            <button
              type="button"
              className="text-xs font-medium rounded-lg bg-gray-100 px-3 py-1.5 text-gray-900 hover:bg-gray-200"
              onClick={handleContactsSyncClick}
            >
              Enable syncing
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SettingsLoginPage;
