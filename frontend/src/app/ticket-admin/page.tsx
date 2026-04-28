import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { USER_ROLE_COOKIE, normalizeUserRole } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { getServerLanguage } from "@/lib/i18n-server";

function sanitizeNextPath(value: string | undefined): string {
  if (!value || !value.startsWith("/ticket-admin/")) {
    return "/ticket-admin/dashboard";
  }
  return value;
}

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPage({ searchParams }: Props) {
  const lang = await getServerLanguage();
  const cookieStore = await cookies();
  const role = normalizeUserRole(cookieStore.get(USER_ROLE_COOKIE)?.value);
  if (role === "admin") {
    redirect("/ticket-admin/dashboard");
  }

  const params = searchParams ? await searchParams : undefined;
  const rawNext = params?.next;
  const nextPath = sanitizeNextPath(typeof rawNext === "string" ? rawNext : undefined);
  const hasError = params?.error === "1";

  async function loginAction(formData: FormData) {
    "use server";
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");
    const nextRaw = formData.get("next");
    const next = sanitizeNextPath(typeof nextRaw === "string" ? nextRaw : undefined);
    const expectedUsername = process.env.ADMIN_LOGIN_USERNAME ?? "admin";
    const expectedPassword = process.env.ADMIN_LOGIN_PASSWORD ?? "admin";

    if (username === expectedUsername && password === expectedPassword) {
      const serverCookies = await cookies();
      serverCookies.set(USER_ROLE_COOKIE, "admin", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
      redirect(next);
    }

    redirect(`/ticket-admin?error=1&next=${encodeURIComponent(next)}`);
  }

  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-md items-center">
      <div className="card w-full overflow-hidden shadow-sm">
        <div className="border-b border-[var(--border)] bg-[var(--background)]/50 px-6 py-5">
          <h1 className="text-2xl font-bold tracking-tight">{t(lang, "adminLoginTitle")}</h1>
          <p className="muted mt-1 text-sm">{t(lang, "adminLoginHint")}</p>
        </div>

        <div className="space-y-4 p-6">
          {hasError ? (
            <p
              role="alert"
              className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-600"
            >
              {t(lang, "adminLoginError")}
            </p>
          ) : null}

          <form action={loginAction} className="space-y-4">
            <input type="hidden" name="next" value={nextPath} />
            <label className="block space-y-1.5 text-sm font-medium">
              <span>{t(lang, "adminUsernameLabel")}</span>
              <input
                type="text"
                name="username"
                required
                autoFocus
                className="input-field"
                autoComplete="username"
                aria-invalid={hasError}
              />
            </label>
            <label className="block space-y-1.5 text-sm font-medium">
              <span>{t(lang, "adminPasswordLabel")}</span>
              <input
                type="password"
                name="password"
                required
                className="input-field"
                autoComplete="current-password"
                aria-invalid={hasError}
              />
            </label>
            <button type="submit" className="button button-primary w-full">
              {t(lang, "adminLoginButton")}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
