"use client";

import { useState } from "react";
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

      <ChangePasswordSection />
    </div>
  );
}

function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const passwordAction = useAsyncAction();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    await passwordAction.run(async () => {
      await api("/auth/change-password", {
        method: "POST",
        body: { currentPassword, newPassword },
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }, "Password updated.");
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold">Password</h2>
      <p className="mt-1 text-sm text-slate-500">
        Change your password here, or use{" "}
        <a href="/forgot-password" className="text-brand-700 hover:underline">
          forgot password
        </a>{" "}
        if you are logged out.
      </p>
      <form onSubmit={submit} className="mt-4 max-w-md space-y-4">
        <div>
          <label className="label">Current password</label>
          <input className="input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        </div>
        <div>
          <label className="label">New password</label>
          <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
        </div>
        <div>
          <label className="label">Confirm new password</label>
          <input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} required />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <FormFeedback status={passwordAction.status} anchorRef={passwordAction.statusRef} />
        <button type="submit" className="btn-primary" disabled={passwordAction.busy}>
          {passwordAction.busy ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
