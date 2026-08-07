"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, Globe, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

// ============================================================================
// The facility's own front door, and whether it actually opens.
//
// Spec 002 D2. `pawradise.yipyy.com` serves Pawradise's branded login, and a
// wildcard CNAME at the registrar makes every such host RESOLVE — but a host
// that resolves and is not attached to the Vercel project answers with a
// deployment-not-found page, which looks exactly like the platform being down
// to the one person it matters most to.
//
// So the state is asked of Vercel rather than assumed, and shown here. The
// button exists because the attach at provisioning time is deliberately
// non-fatal: the facility is committed by then, so a failed attach must not
// fail the request, which means something has to be able to finish the job
// later.
// ============================================================================

type Status =
  | { attached: true; host: string; verified: boolean }
  | { attached: false; host: string | null; reason: string };

export function FacilityWebAddress({
  facilityId,
  slug,
}: {
  facilityId: string;
  slug: string;
}) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "facility", facilityId, "domain"],
    queryFn: async (): Promise<Status> => {
      const response = await fetch(`/api/facilities/${facilityId}/domain`);
      if (!response.ok) throw new Error("Could not check the web address.");
      return (await response.json()) as Status;
    },
    retry: false,
  });

  const attach = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/facilities/${facilityId}/domain`, {
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as Status | null;
      if (!body?.attached) {
        throw new Error(
          body && "reason" in body ? body.reason : "Could not attach it.",
        );
      }
      return body;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["admin", "facility", facilityId, "domain"],
      }),
  });

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="size-3.5 animate-spin" />
        Checking the web address…
      </div>
    );
  }

  const host = data?.host ?? slug;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Globe className="text-muted-foreground size-4" />
        {data?.attached ? (
          <a
            href={`https://${host}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:underline"
          >
            {host}
            <ExternalLink className="ml-1 inline size-3" />
          </a>
        ) : (
          <span className="font-medium">{host}</span>
        )}

        {data?.attached && data.verified && (
          <span className="flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 className="size-3.5" />
            live
          </span>
        )}
        {data?.attached && !data.verified && (
          <span className="text-xs text-amber-600">
            attached, certificate still issuing
          </span>
        )}
      </div>

      {data && !data.attached && (
        <div className="rounded-lg bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
          <p className="text-amber-900 dark:text-amber-200">
            This facility has no working web address yet — {data.reason}
          </p>
          <Button
            size="sm"
            className="mt-2 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => attach.mutate()}
            disabled={attach.isPending}
          >
            {attach.isPending ? (
              <>
                <Loader2 className="mr-2 size-3.5 animate-spin" />
                Attaching…
              </>
            ) : (
              "Attach it now"
            )}
          </Button>
          {attach.isError && (
            <p className="text-destructive mt-2 text-xs">
              {attach.error instanceof Error
                ? attach.error.message
                : "Could not attach it."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
