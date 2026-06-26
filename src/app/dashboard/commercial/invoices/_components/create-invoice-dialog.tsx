"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface InvoiceFacilityOption {
  id: number;
  name: string;
  plan: string;
}

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilities: InvoiceFacilityOption[];
  onCreate: (facilityId: number) => void;
}

export function CreateInvoiceDialog({
  open,
  onOpenChange,
  facilities,
  onCreate,
}: CreateInvoiceDialogProps) {
  const [facilityId, setFacilityId] = useState<string>("");

  const selected = facilities.find((f) => String(f.id) === facilityId);

  function submit() {
    if (!selected) return;
    onCreate(selected.id);
    setFacilityId("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create invoice</DialogTitle>
          <DialogDescription>
            Generate a draft invoice from a facility&apos;s current subscription
            plan. It can be reviewed and sent afterwards.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invoice-facility">Facility</Label>
            <Select value={facilityId} onValueChange={setFacilityId}>
              <SelectTrigger id="invoice-facility">
                <SelectValue placeholder="Select a facility" />
              </SelectTrigger>
              <SelectContent>
                {facilities.map((f) => (
                  <SelectItem key={f.id} value={String(f.id)}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selected && (
            <p className="text-muted-foreground text-sm">
              Plan:{" "}
              <span className="text-foreground font-medium">
                {selected.plan}
              </span>{" "}
              — line items (subscription, add-ons, tax) are derived from the
              facility&apos;s active subscription.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={!selected}
            onClick={submit}
          >
            Create draft invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
