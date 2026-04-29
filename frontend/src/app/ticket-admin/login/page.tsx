"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSettings } from "@/components/app-settings-provider";
import { adminLogin, toErrorMessage } from "@/lib/api";
import { ADMIN_DASHBOARD_PATH } from "@/lib/admin-auth";

export default function TicketAdminLoginPage() {
  const { tr } = useAppSettings();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await adminLogin({ username, password });
      router.replace(ADMIN_DASHBOARD_PATH);
      router.refresh();
    } catch (submitError) {
      setError(toErrorMessage(submitError) || tr("adminLoginError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <label className="block">
          <span className="text-sm">{tr("adminUsernameLabel")}</span>
          <input
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            autoComplete="username"
          />
        </label>
        <label className="block">
          <span className="text-sm">{tr("adminPasswordLabel")}</span>
          <input
            type="password"
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <button type="submit" className="button button-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? `${tr("adminLoginButton")}...` : tr("adminLoginButton")}
        </button>
      </form>
    </div>
  );
}
