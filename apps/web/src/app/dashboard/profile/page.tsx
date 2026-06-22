"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { FormFeedback } from "@/components/FormFeedback";
import { useAsyncAction } from "@/lib/useAsyncAction";

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const profileAction = useAsyncAction();
  const avatarAction = useAsyncAction();

  if (!user) return null;

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    await profileAction.run(async () => {
      const { user: u } = await api("/me/profile", { method: "PATCH", body: { displayName } });
      setUser(u);
    }, "Profile updated.");
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await avatarAction.run(async () => {
      const fd = new FormData();
      fd.append("avatar", file);
      const { user: u } = await api("/me/avatar", { body: fd, isForm: true });
      setUser(u);
    }, "Avatar updated.");
    e.target.value = "";
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      <div className="card p-6">
        <div className="flex items-center gap-4">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="avatar" className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <div className="grid h-20 w-20 place-items-center rounded-full bg-brand-100 text-2xl font-bold text-brand-800">
              {(user.displayName || user.email)[0].toUpperCase()}
            </div>
          )}
          <div>
            <label className="btn-ghost cursor-pointer text-sm">
              Change picture
              <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
            </label>
          </div>
        </div>

        <form onSubmit={saveName} className="mt-6 max-w-md space-y-4">
          <div>
            <label className="label">Display name</label>
            <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input bg-slate-50" value={user.email} disabled />
          </div>
          <FormFeedback status={profileAction.status} anchorRef={profileAction.statusRef} />
          <FormFeedback status={avatarAction.status} anchorRef={avatarAction.statusRef} className="mt-2" />
          <button type="submit" className="btn-primary" disabled={profileAction.busy}>
            {profileAction.busy ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>

      <PasswordResetSection email={user.email} />
      <NotificationPreferencesSection />
    </div>
  );
}

function PasswordResetSection({ email }: { email: string }) {
  const resetAction = useAsyncAction();

  async function requestReset() {
    await resetAction.run(async () => {
      await api("/auth/request-password-reset", { method: "POST" });
    }, `Reset link sent to ${email}. Check your inbox.`);
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold">Password</h2>
      <p className="mt-1 text-sm text-slate-500">
        For security, password changes are only done through a reset link sent to your email.
      </p>
      <FormFeedback status={resetAction.status} anchorRef={resetAction.statusRef} className="mt-4" />
      <button
        type="button"
        className="btn-primary mt-4"
        onClick={requestReset}
        disabled={resetAction.busy}
      >
        {resetAction.busy ? "Sending…" : "Email me a reset link"}
      </button>
      <p className="mt-3 text-sm text-slate-500">
        Not logged in? Use{" "}
        <a href="/forgot-password" className="text-brand-700 hover:underline">
          forgot password
        </a>{" "}
        on the login page.
      </p>
    </div>
  );
}

type ChannelPrefs = { inApp: boolean; push: boolean; email: boolean };
type NotificationPreferences = {
  tradeStatus: ChannelPrefs;
  tradeChat: ChannelPrefs;
  withdrawal: ChannelPrefs;
  referral: ChannelPrefs;
};

const PREF_LABELS: { key: keyof NotificationPreferences; label: string; hint: string }[] = [
  { key: "tradeStatus", label: "Trade updates", hint: "Status changes, approvals, payouts" },
  { key: "tradeChat", label: "Trade chat", hint: "At most one alert per 15 minutes per trade" },
  { key: "withdrawal", label: "Withdrawals", hint: "Withdrawal requests and payouts" },
  { key: "referral", label: "Referrals", hint: "Referral bonus earnings" },
];

function NotificationPreferencesSection() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const saveAction = useAsyncAction();

  useEffect(() => {
    api<{ preferences: NotificationPreferences }>("/me/notification-preferences").then((d) =>
      setPrefs(d.preferences)
    );
  }, []);

  function update(
    category: keyof NotificationPreferences,
    channel: keyof ChannelPrefs,
    value: boolean
  ) {
    setPrefs((prev) =>
      prev ? { ...prev, [category]: { ...prev[category], [channel]: value } } : prev
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!prefs) return;
    await saveAction.run(async () => {
      const { preferences } = await api<{ preferences: NotificationPreferences }>(
        "/me/notification-preferences",
        { method: "PATCH", body: prefs }
      );
      setPrefs(preferences);
    }, "Notification preferences saved.");
  }

  if (!prefs) {
    return (
      <div className="card p-6">
        <h2 className="text-lg font-bold">Notifications</h2>
        <p className="mt-2 text-sm text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold">Notifications</h2>
      <p className="mt-1 text-sm text-slate-500">
        Choose how you want to be notified for each type of activity.
      </p>
      <form onSubmit={save} className="mt-4 space-y-5">
        {PREF_LABELS.map(({ key, label, hint }) => (
          <div key={key} className="rounded-xl border border-slate-200 p-4">
            <div className="font-semibold">{label}</div>
            <p className="text-xs text-slate-500">{hint}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              {(
                [
                  ["inApp", "In-app"],
                  ["push", "Push"],
                  ["email", "Email"],
                ] as const
              ).map(([channel, channelLabel]) => (
                <label key={channel} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={prefs[key][channel]}
                    onChange={(e) => update(key, channel, e.target.checked)}
                  />
                  {channelLabel}
                </label>
              ))}
            </div>
          </div>
        ))}
        <FormFeedback status={saveAction.status} anchorRef={saveAction.statusRef} />
        <button type="submit" className="btn-primary" disabled={saveAction.busy}>
          {saveAction.busy ? "Saving…" : "Save notification preferences"}
        </button>
      </form>
    </div>
  );
}
