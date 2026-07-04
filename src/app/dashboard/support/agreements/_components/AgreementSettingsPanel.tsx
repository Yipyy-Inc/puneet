"use client";

import { CalendarClock, Settings2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AgreementDocumentType } from "@/lib/api/agreements";

const DOCUMENT_TYPES: AgreementDocumentType[] = [
  "Agreement",
  "Waiver",
  "Addendum",
  "Amendment",
  "Terms",
];

export interface AgreementSettingsValues {
  name: string;
  type: AgreementDocumentType;
  description: string;
  expiresAt: string | null;
}

export function AgreementSettingsPanel({
  values,
  onChange,
  onClose,
}: {
  values: AgreementSettingsValues;
  onChange: (patch: Partial<AgreementSettingsValues>) => void;
  onClose: () => void;
}) {
  return (
    <aside className="bg-muted/20 flex w-72 shrink-0 flex-col border-l">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Settings2 className="text-muted-foreground size-4" />
          Document Settings
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onClose}
          aria-label="Close settings"
        >
          <X className="size-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="doc-name">Document Name</Label>
            <Input
              id="doc-name"
              value={values.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. Boarding Liability Waiver"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-type">Document Type</Label>
            <Select
              value={values.type}
              onValueChange={(v) =>
                onChange({ type: v as AgreementDocumentType })
              }
            >
              <SelectTrigger id="doc-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-description">Internal Description</Label>
            <Textarea
              id="doc-description"
              value={values.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Internal notes about when to use this template (not shown to facilities)."
              rows={4}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-expiry" className="flex items-center gap-1.5">
              <CalendarClock className="text-muted-foreground size-3.5" />
              Default Expiry
              <span className="text-muted-foreground text-xs font-normal">
                (optional)
              </span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="doc-expiry"
                type="date"
                value={values.expiresAt ?? ""}
                onChange={(e) =>
                  onChange({ expiresAt: e.target.value || null })
                }
              />
              {values.expiresAt ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => onChange({ expiresAt: null })}
                >
                  Clear
                </Button>
              ) : null}
            </div>
            <p className="text-muted-foreground text-[11px]">
              Sent agreements inherit this date and trigger a renewal reminder
              as it approaches.
            </p>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
