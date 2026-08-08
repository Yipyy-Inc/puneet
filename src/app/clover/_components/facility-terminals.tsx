import {
  CheckCircle2,
  CircleAlert,
  Smartphone,
  TriangleAlert,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { TerminalReadiness } from "@/lib/clover/devices";

// ============================================================================
// The facility's own card terminals.
//
// A server component: there is nothing to interact with yet, so it costs no
// client JavaScript. It answers one question — "is my terminal going to work"
// — and the answer is deliberately three-part, because three different people
// fix the three ways it can be no:
//
//   no device on the account   the facility, by buying or activating one
//   an unsupported model       whoever chose the hardware
//   Cloud Pay Display missing  the facility, from their Clover dashboard
//
// A single "not ready" would send all three to the wrong place.
// ============================================================================

export function FacilityTerminals({
  readiness,
}: {
  readiness: TerminalReadiness;
}) {
  if (readiness.kind === "not_connected") return null;

  return (
    <div className="mx-auto mt-4 max-w-md px-4">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-2">
            <Smartphone className="text-muted-foreground size-4" />
            <p className="text-sm font-semibold">Card terminals</p>
          </div>

          {readiness.kind === "unreadable" && (
            <p className="text-muted-foreground text-sm/relaxed">
              {readiness.detail}
            </p>
          )}

          {readiness.kind === "no_terminals" && (
            <div className="space-y-2">
              <p className="text-sm/relaxed">
                No Clover device is registered to this merchant account yet.
              </p>
              <p className="text-muted-foreground text-xs/relaxed">
                A terminal bought from Clover appears here on its own once it is
                activated — there is nothing to enter. Clover Flex, Mini and
                Compact can take payments through Yipyy.
              </p>
            </div>
          )}

          {readiness.kind === "terminals" && (
            <div className="space-y-2">
              {readiness.terminals.map((terminal) => (
                <div
                  key={terminal.id}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  {terminal.support === "supported" ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  ) : terminal.support === "unsupported" ? (
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  ) : (
                    <CircleAlert className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* The facility's own name wins. A counter with three
                          identical "Flex 4"s needs "Front desk", and the model
                          is what support asks for — so both are shown. */}
                      <p className="text-sm font-medium">
                        {terminal.label ??
                          terminal.name ??
                          terminal.model ??
                          "Clover device"}
                      </p>
                      {terminal.isDefault && (
                        <span className="rounded-full border border-emerald-500/30 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                          default
                        </span>
                      )}
                      {!terminal.isActive && (
                        <span className="text-muted-foreground rounded-full border px-2 py-0.5 text-[10px]">
                          retired
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {[
                        terminal.label ? terminal.name : null,
                        terminal.model,
                        terminal.serial,
                      ]
                        .filter(Boolean)
                        .join(" · ") || terminal.id}
                    </p>
                    {!terminal.label && (
                      <p className="text-muted-foreground mt-1 text-xs/relaxed">
                        Unnamed. With more than one terminal, give each a name
                        so staff can tell them apart.
                      </p>
                    )}
                    {terminal.support === "unsupported" && (
                      <p className="mt-1 text-xs/relaxed text-amber-700 dark:text-amber-500">
                        This model connects over a local network, which Yipyy
                        cannot reach. Card payments through Yipyy need a Flex,
                        Mini or Compact.
                      </p>
                    )}
                    {terminal.support === "unknown" && (
                      <p className="text-muted-foreground mt-1 text-xs/relaxed">
                        We do not recognise this model, so we cannot say yet
                        whether it can take payments through Yipyy.
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {/* Said plainly rather than shown as a tick nobody checked. */}
              <p className="text-muted-foreground text-xs/relaxed">
                Taking a payment on a terminal also needs Cloud Pay Display
                installed on it from your Clover dashboard. Yipyy cannot see
                that yet, so it is not confirmed here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
