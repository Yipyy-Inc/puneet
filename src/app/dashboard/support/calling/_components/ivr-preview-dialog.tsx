"use client";

import type { ReactNode } from "react";

import { DESTINATIONS } from "@/data/support-ivr";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { IVRDestination, SupportIvrConfig } from "@/types/support-ivr";

function destLabel(v: IVRDestination): string {
  return DESTINATIONS.find((d) => d.value === v)?.label ?? v;
}

export function IvrPreviewDialog({
  config,
  trigger,
}: {
  config: SupportIvrConfig;
  trigger: ReactNode;
}) {
  const activeRules = config.rules.filter((r) => r.enabled);

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>IVR preview</DialogTitle>
          <DialogDescription>
            How a caller flows through the auto-attendant.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="bg-muted/30 rounded-lg border p-3">
            <p className="text-muted-foreground text-xs font-semibold uppercase">
              Greeting
            </p>
            <p className="mt-1">“{config.greeting}”</p>
          </div>

          <div>
            <p className="text-muted-foreground text-xs font-semibold uppercase">
              1 · Smart rules (evaluated first)
            </p>
            <div className="mt-2 space-y-1.5">
              {activeRules.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  No active rules.
                </p>
              ) : (
                activeRules.map((r, i) => (
                  <div key={r.id} className="flex gap-2 rounded-md border p-2">
                    <span className="text-muted-foreground font-mono text-xs">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-medium">{r.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {r.condition}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <p className="text-muted-foreground text-xs font-semibold uppercase">
              2 · Menu options
            </p>
            <div className="mt-2 space-y-1.5">
              {config.menu.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center gap-2 rounded-md border p-2"
                >
                  <span className="bg-muted flex size-6 items-center justify-center rounded text-xs font-bold">
                    {o.key}
                  </span>
                  <span className="flex-1">{o.label}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {destLabel(o.destination)}
                    {o.target ? ` · ${o.target}` : ""}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
