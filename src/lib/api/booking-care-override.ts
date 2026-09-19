import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { PendingCareItem } from "@/lib/care-completion";

/**
 * Keeps why a pet was checked out with today's care not logged
 * (POST /api/bookings/[ref]/care-override). Resolves only once the reason is
 * saved, so checkout never opens on a reason that was lost.
 */
export function useRecordCareOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      bookingRef: number;
      reason: string;
      pending: PendingCareItem[];
    }) => {
      const res = await fetch(
        `/api/bookings/${input.bookingRef}/care-override`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: input.reason,
            items: input.pending.map((item) => ({
              kind: item.kind,
              label: item.label,
              critical: Boolean(item.isCritical),
            })),
          }),
        },
      );
      const body = (await res.json().catch(() => null)) as {
        id?: string;
        error?: string;
      } | null;
      if (!res.ok) {
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      return body?.id ?? "";
    },
    onSuccess: (_id, input) =>
      queryClient.invalidateQueries({
        queryKey: ["bookings", "history", input.bookingRef],
      }),
  });
}
