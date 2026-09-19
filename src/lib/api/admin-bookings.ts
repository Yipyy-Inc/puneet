import type { AdminBookingMatch } from "@/app/api/admin/bookings/route";
import type { AdminBookingDetail } from "@/app/api/admin/bookings/[ref]/route";

export type { AdminBookingDetail, AdminBookingMatch };

async function readJson<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const message = (body as { error?: string } | null)?.error;
    throw Object.assign(
      new Error(message ?? `Request failed (${res.status})`),
      {
        status: res.status,
      },
    );
  }
  return body as T;
}

/** Any facility's bookings, for Yipyy's own team. Strict: no fixture. */
export const adminBookingQueries = {
  /** Bookings a typed number could mean (#10896 or 896), across facilities. */
  lookup: (q: string) => ({
    queryKey: ["admin", "bookings", "lookup", q] as const,
    queryFn: async () =>
      readJson<AdminBookingMatch[]>(
        await fetch(`/api/admin/bookings?q=${encodeURIComponent(q)}`),
      ),
  }),
  detail: (ref: number) => ({
    queryKey: ["admin", "bookings", "detail", ref] as const,
    queryFn: async () =>
      readJson<AdminBookingDetail>(await fetch(`/api/admin/bookings/${ref}`)),
  }),
};
