"use client";

import { useState } from "react";
import { Boxes, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MasterService } from "@/types/service-catalog";

const CATEGORY_OPTIONS: { value: MasterService["category"]; label: string }[] =
  [
    { value: "boarding", label: "Boarding" },
    { value: "daycare", label: "Daycare" },
    { value: "grooming", label: "Grooming" },
    { value: "training", label: "Training" },
    { value: "addon", label: "Add-ons" },
    { value: "spa", label: "Spa" },
    { value: "transport", label: "Transport" },
    { value: "custom", label: "Custom" },
  ];

const UNIT_OPTIONS: { value: MasterService["unit"]; label: string }[] = [
  { value: "per_visit", label: "Per visit" },
  { value: "per_night", label: "Per night" },
  { value: "per_hour", label: "Per hour" },
  { value: "per_session", label: "Per session" },
  { value: "flat", label: "Flat rate" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (service: MasterService) => void;
}

export function NewServiceDialog({ open, onOpenChange, onCreate }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] =
    useState<MasterService["category"]>("boarding");
  const [unit, setUnit] = useState<MasterService["unit"]>("per_visit");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  const valid = name.trim() !== "" && price.trim() !== "" && Number(price) >= 0;

  function reset() {
    setName("");
    setCategory("boarding");
    setUnit("per_visit");
    setPrice("");
    setDescription("");
  }

  function close(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function create() {
    if (!valid) return;
    const now = new Date().toISOString();
    onCreate({
      id: `svc-new-${Date.now()}`,
      name: name.trim(),
      category,
      description: description.trim(),
      defaultPrice: Number(price),
      unit,
      taxable: true,
      requiresApproval: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Boxes className="size-5" />
            New master service
          </DialogTitle>
          <DialogDescription>
            Define the service once for the whole network.
          </DialogDescription>
        </DialogHeader>

        {/* Master-level explainer */}
        <div className="flex items-start gap-2 rounded-lg border border-sky-300/50 bg-sky-50/60 px-3 py-2 text-xs text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-200">
          <Info className="mt-px size-3.5 shrink-0 text-sky-500" />
          <span>
            This creates a <strong>network-level master definition</strong>. It
            won&apos;t be bookable anywhere until you{" "}
            <strong>enable it per location</strong> using the location toggles
            in the table.
          </span>
        </div>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Service name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Overnight Boarding — Deluxe"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Type</Label>
              <Select
                value={category}
                onValueChange={(v) =>
                  setCategory(v as MasterService["category"])
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Unit</Label>
              <Select
                value={unit}
                onValueChange={(v) => setUnit(v as MasterService["unit"])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Base price *</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">$</span>
              <Input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
              />
            </div>
            <p className="text-muted-foreground text-[11px]">
              Network default — each location can override this once enabled.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description shown to staff & clients"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button onClick={create} disabled={!valid}>
            Create master service
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
