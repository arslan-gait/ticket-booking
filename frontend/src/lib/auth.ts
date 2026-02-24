export const USER_ROLE_COOKIE = "user_role";

export type UserRole = "user" | "admin";

export function normalizeUserRole(role: string | null | undefined): UserRole {
  return role === "admin" ? "admin" : "user";
}

export function readUserRoleFromCookieString(cookieString: string): UserRole {
  const cookie = cookieString
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${USER_ROLE_COOKIE}=`));
  if (!cookie) return "user";
  const value = cookie.slice(USER_ROLE_COOKIE.length + 1);
  return normalizeUserRole(value);
}
