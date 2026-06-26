"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Search } from "lucide-react";

import { facilities } from "@/data/facilities";
import { importQueries } from "@/lib/api/imports";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SourceLogo } from "../source-logo";
import { ImportStepFrame } from "./import-step-frame";
import type { WizardStepProps } from "./wizard-types";

export function StepSelectFacility({
  draft,
  update,
  onNext,
  onBack,
  onCancel,
}: WizardStepProps) {
  const [query, setQuery] = useState("");

  const matches = facilities
    .filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  const { data: priorImports = [] } = useQuery({
    ...importQueries.historyForFacility(draft.facilityId ?? -1),
    enabled: draft.facilityId != null,
  });

  return (
    <ImportStepFrame
      stepIndex={1}
      canContinue={draft.facilityId != null}
      onContinue={onNext}
      onBack={onBack}
      onCancel={onCancel}
    >
      <div className="relative">
        <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Which facility is this import for?"
          className="h-11 pl-9 text-base"
        />
      </div>

      <div className="space-y-1.5">
        {matches.map((f) => {
          const selected = draft.facilityId === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => update({ facilityId: f.id })}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                selected
                  ? "border-violet-500 bg-violet-500/5"
                  : "hover:bg-muted/50",
              )}
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{f.name}</p>
                <p className="text-muted-foreground text-xs capitalize">
                  {f.plan} · {f.status}
                </p>
              </div>
              {selected && <Check className="size-4 text-violet-600" />}
            </button>
          );
        })}
        {matches.length === 0 && (
          <p className="text-muted-foreground rounded-lg border border-dashed py-6 text-center text-sm">
            No facilities match “{query}”.
          </p>
        )}
      </div>

      {draft.facilityId != null && (
        <div className="rounded-lg border">
          <div className="border-b px-3 py-2 text-xs font-semibold tracking-wide uppercase">
            Prior imports for this facility
          </div>
          {priorImports.length === 0 ? (
            <p className="text-muted-foreground px-3 py-4 text-sm">
              No previous imports — this would be the first.
            </p>
          ) : (
            <div className="divide-y">
              {priorImports.map((imp) => (
                <div
                  key={imp.id}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm"
                >
                  <SourceLogo sourceId={imp.sourceId} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{imp.sourceName}</p>
                    <p className="text-muted-foreground text-xs">
                      {imp.customers} customers · {imp.pets} pets ·{" "}
                      {imp.bookings} bookings
                    </p>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {new Date(imp.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </ImportStepFrame>
  );
}
