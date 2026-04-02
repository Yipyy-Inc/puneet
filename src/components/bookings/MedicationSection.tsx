"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Pill,
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Ban,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { MedicationEntry } from "@/types/booking";

interface MedicationSectionProps {
  entries: MedicationEntry[];
}

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function fmtTimestamp(ts: string) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

const doseStatusIcon = {
  given: <CheckCircle2 className="size-3.5 text-emerald-500" />,
  skipped: <Ban className="size-3.5 text-amber-500" />,
  refused: <XCircle className="size-3.5 text-red-500" />,
  pending: <Circle className="text-muted-foreground/30 size-3.5" />,
};

const doseStatusLabel = {
  given: "Given",
  skipped: "Skipped",
  refused: "Refused",
  pending: "Pending",
};

export function MedicationSection({ entries }: MedicationSectionProps) {
  const [meds, setMeds] = useState(entries);

  const handleAdminister = (medId: string, doseIdx: number) => {
    setMeds((prev) =>
      prev.map((med) =>
        med.id === medId
          ? {
              ...med,
              doses: med.doses.map((d, i) =>
                i === doseIdx
                  ? {
                      ...d,
                      status: "given" as const,
                      administeredBy: "You",
                      administeredAt: new Date().toISOString(),
                    }
                  : d,
              ),
            }
          : med,
      ),
    );
    toast.success("Medication administered");
  };

  if (meds.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/30 pb-3">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
          <Pill className="size-3.5" />
          Medications
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y pt-0">
        {meds.map((med) => (
          <div key={med.id} className="py-4 first:pt-4">
            {/* Header */}
            <div className="flex items-start gap-2">
              {med.isCritical && (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{med.name}</span>
                  {med.isCritical && (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0 text-[9px] font-bold text-amber-700 uppercase">
                      Critical
                    </span>
                  )}
                </div>
                <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
                  <span className="font-medium">{med.dosage}</span>
                  <span>·</span>
                  <span>{med.method}</span>
                  <span>·</span>
                  <span>{med.frequency}</span>
                </div>
                {med.instructions && (
                  <p
                    className={cn(
                      "mt-1.5 rounded-md border px-2.5 py-1.5 text-xs",
                      med.isCritical
                        ? "border-amber-200 bg-amber-50 font-medium text-amber-800"
                        : "border-border bg-muted/20 text-muted-foreground italic",
                    )}
                  >
                    {med.isCritical && "⚠ "}
                    {med.instructions}
                  </p>
                )}
              </div>
            </div>

            {/* Doses timeline */}
            <div className="mt-3 space-y-1.5 pl-1">
              {med.doses.map((dose, idx) => (
                <div
                  key={idx}
                  className="bg-background flex items-center gap-2.5 rounded-lg border px-3 py-2"
                >
                  {doseStatusIcon[dose.status]}
                  <div className="min-w-0 flex-1">
                    <span className="text-xs">
                      <Clock className="mr-1 inline size-3" />
                      {fmtTime(
                        new Date(dose.scheduledAt).toTimeString().slice(0, 5),
                      )}
                    </span>
                    {dose.administeredBy && (
                      <span className="text-muted-foreground ml-2 text-[10px]">
                        {doseStatusLabel[dose.status]} by {dose.administeredBy}
                        {dose.administeredAt &&
                          ` at ${fmtTimestamp(dose.administeredAt)}`}
                      </span>
                    )}
                    {dose.skipReason && (
                      <span className="text-muted-foreground ml-2 text-[10px]">
                        — {dose.skipReason}
                      </span>
                    )}
                  </div>
                  {dose.status === "pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 gap-1 text-[10px]"
                      onClick={() => handleAdminister(med.id, idx)}
                    >
                      <CheckCircle2 className="size-3" />
                      Give
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
