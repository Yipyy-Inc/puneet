"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, FileSignature } from "lucide-react";
import {
  defaultTrainingWaivers,
  type TrainingWaiver,
} from "@/data/training-waivers";

interface Props {
  /** The set of waiver ids the owner has agreed to. */
  agreed: Set<string>;
  onChange: (next: Set<string>) => void;
  /** Optional override; defaults to the bundled catalog. */
  waivers?: TrainingWaiver[];
}

/** Shared waivers checklist used by both the enrollment dialog and the
 *  drop-in dialog. Required items are gated by the caller via
 *  `allRequiredWaiversSigned()`. */
export function TrainingWaiversSection({
  agreed,
  onChange,
  waivers = defaultTrainingWaivers,
}: Props) {
  return (
    <div className="space-y-2">
      <Label className="inline-flex items-center gap-1.5">
        <FileSignature className="size-4" />
        Waivers <span className="text-destructive">*</span>
      </Label>
      <ul className="space-y-2">
        {waivers.map((waiver) => {
          const checked = agreed.has(waiver.id);
          return (
            <WaiverRow
              key={waiver.id}
              waiver={waiver}
              checked={checked}
              onCheckedChange={(next) => {
                const updated = new Set(agreed);
                if (next) updated.add(waiver.id);
                else updated.delete(waiver.id);
                onChange(updated);
              }}
            />
          );
        })}
      </ul>
    </div>
  );
}

function WaiverRow({
  waiver,
  checked,
  onCheckedChange,
}: {
  waiver: TrainingWaiver;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <li
      className={cn(
        "rounded-lg border bg-card px-3 py-2.5 transition-colors",
        checked && "border-emerald-200 bg-emerald-50/30",
      )}
    >
      <div className="flex items-start gap-2.5">
        <Checkbox
          id={`waiver-${waiver.id}`}
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Label
              htmlFor={`waiver-${waiver.id}`}
              className="cursor-pointer text-sm font-medium"
            >
              {waiver.title}
            </Label>
            {waiver.required ? (
              <Badge
                variant="outline"
                className="border-rose-200 bg-rose-50 text-[10px] text-rose-700"
              >
                Required
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-slate-200 bg-slate-50 text-[10px] text-slate-600"
              >
                Optional
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-0.5 text-[12px]/relaxed">
            {waiver.summary}
          </p>
          <Collapsible open={expanded} onOpenChange={setExpanded}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground mt-1 inline-flex items-center gap-0.5 text-[11px] underline-offset-2 hover:underline"
              >
                {expanded ? (
                  <ChevronDown className="size-3" />
                ) : (
                  <ChevronRight className="size-3" />
                )}
                {expanded ? "Hide full text" : "View full text"}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <p className="mt-1.5 rounded-md border bg-slate-50/60 px-2.5 py-2 text-[11.5px]/relaxed text-slate-700">
                {waiver.fullText}
              </p>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </li>
  );
}
