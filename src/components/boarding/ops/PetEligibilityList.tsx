"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type EvaluationIndicator = "valid" | "expired" | "failed" | "missing";

export interface EligibilityRow {
  petId: number;
  petName: string;
  petType: "dog" | "cat";
  breed: string;
  eligible: boolean;
  reasons: string[];
  evaluationRequired: boolean;
  evaluationIndicator?: EvaluationIndicator;
}

function evalBadge(indicator?: EvaluationIndicator) {
  if (!indicator) return null;
  if (indicator === "valid") return <Badge variant="success">Eval: Valid</Badge>;
  if (indicator === "expired")
    return <Badge variant="destructive">Eval: Expired</Badge>;
  if (indicator === "failed")
    return <Badge variant="destructive">Eval: Failed</Badge>;
  return <Badge variant="warning">Eval: Missing</Badge>;
}

export function PetEligibilityList({ rows }: { rows: EligibilityRow[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Pet Eligibility</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No pets.</div>
        ) : (
          rows.map((row) => (
            <div
              key={row.petId}
              className={[
                "rounded-md border p-3 flex items-start justify-between gap-4",
                "data-[eligible=false]:bg-destructive/5 data-[eligible=false]:border-destructive/30",
                "data-[eligible=false]:opacity-80",
              ].join(" ")}
              data-eligible={row.eligible}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="font-medium truncate">
                    {row.petName}{" "}
                    <span className="text-muted-foreground font-normal">
                      ({row.breed})
                    </span>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {row.petType}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {row.eligible ? "Eligible" : "Ineligible"}
                  {!row.eligible && row.reasons.length > 0 && (
                    <span className="ml-2">
                      • {row.reasons.join(" • ")}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                {row.evaluationRequired && evalBadge(row.evaluationIndicator)}
                {row.eligible ? (
                  <Badge variant="success">OK</Badge>
                ) : (
                  <Badge variant="destructive">Blocked</Badge>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

