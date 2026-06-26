"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export interface LocationFormValues {
  name: string;
  address: string;
  services: string[];
  phone: string;
}

const SERVICE_OPTIONS = [
  "daycare",
  "boarding",
  "grooming",
  "training",
  "retail",
  "vet",
];

export interface LocationFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  initial?: LocationFormValues | null;
  onSubmit: (values: LocationFormValues) => void;
}

export function LocationFormModal({
  open,
  onOpenChange,
  mode,
  initial,
  onSubmit,
}: LocationFormModalProps) {
  // Lazy init from `initial`; the parent passes a changing `key` so this
  // remounts (and re-reads `initial`) each time the modal opens.
  const [name, setName] = useState(initial?.name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [services, setServices] = useState<string[]>(initial?.services ?? []);

  const valid = name.trim() !== "" && address.trim() !== "";

  const toggleService = (s: string) =>
    setServices((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );

  const submit = () => {
    if (!valid) return;
    onSubmit({
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      services,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Add location" : "Edit location"}
          </DialogTitle>
          <DialogDescription>
            {mode === "add"
              ? "Create a new location for this facility."
              : "Update this location's details."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="loc-name">Location name</Label>
            <Input
              id="loc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Downtown Branch"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="loc-address">Address</Label>
            <Input
              id="loc-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, City"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="loc-phone">Phone</Label>
            <Input
              id="loc-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Services</Label>
            <div className="grid grid-cols-2 gap-2">
              {SERVICE_OPTIONS.map((s) => (
                <Label
                  key={s}
                  htmlFor={`svc-${s}`}
                  className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm font-normal capitalize"
                >
                  <Checkbox
                    id={`svc-${s}`}
                    checked={services.includes(s)}
                    onCheckedChange={() => toggleService(s)}
                  />
                  {s}
                </Label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!valid} onClick={submit}>
            {mode === "add" ? "Add location" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
