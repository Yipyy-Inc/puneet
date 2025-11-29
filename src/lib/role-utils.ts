"use client";

export type UserRole = "super_admin" | "facility_admin";

const ROLE_COOKIE_NAME = "user_role";

export function getUserRole(): UserRole | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split("; ");
  const roleCookie = cookies.find((cookie) =>
    cookie.startsWith(`${ROLE_COOKIE_NAME}=`),
  );

  if (!roleCookie) return null;

  const role = roleCookie.split("=")[1] as UserRole;
  return role === "super_admin" || role === "facility_admin" ? role : null;
}

export function setUserRole(role: UserRole): void {
  if (typeof document === "undefined") return;

  document.cookie = `${ROLE_COOKIE_NAME}=${role}; path=/; max-age=31536000`; // 1 year
}
