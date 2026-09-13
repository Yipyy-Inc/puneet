import { redirect } from "next/navigation";

// The check-in desk moved to the staff portal, where every member who checks
// dogs in can reach it. An old link lands there, with the code it carried.
export default async function OldCheckInPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string | string[] }>;
}) {
  const { code } = await searchParams;
  const value = Array.isArray(code) ? code[0] : code;
  redirect(
    value
      ? `/employee/check-in?code=${encodeURIComponent(value)}`
      : "/employee/check-in",
  );
}
