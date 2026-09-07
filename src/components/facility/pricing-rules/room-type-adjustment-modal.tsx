"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

import { toast } from "sonner";
import type { RoomTypeAdjustment } from "@/types/boarding";
import {
  makeId,
  BOARDING_ROOM_OPTIONS,
  normalizeApplicableServices,
} from "@/components/facility/pricing-rules/shared";
import type { ServiceOption } from "@/components/facility/pricing-rules/shared";

// ── Room-Type Adjustment Modal ──────────────────────────────────────

export function RoomTypeAdjustmentModal({
  open,
  onOpenChange,
  editing,
  serviceType,
  serviceOptions,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: RoomTypeAdjustment | null;
  serviceType: string;
  serviceOptions: ServiceOption[];
  onSave: (rule: RoomTypeAdjustment) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    roomTypeIds: ["standard"],
    minNights: null as number | null,
    maxNights: null as number | null,
    sameRoomRequired: true,
    adjustmentKind: "discount" as "discount" | "surcharge",
    adjustmentType: "percentage" as "flat" | "percentage",
    amount: 10,
    applicableServices: normalizeApplicableServices(
      serviceType === "all" ? ["boarding"] : [serviceType],
    ),
  });

  const [prevEditing, setPrevEditing] = useState(editing);
  if (editing !== prevEditing) {
    setPrevEditing(editing);
    if (editing) {
      setForm({
        name: editing.name,
        roomTypeIds: editing.roomTypeIds,
        minNights: editing.minNights ?? null,
        maxNights: editing.maxNights ?? null,
        sameRoomRequired: editing.sameRoomRequired,
        adjustmentKind: editing.adjustmentKind,
        adjustmentType: editing.adjustmentType,
        amount: editing.amount,
        applicableServices: normalizeApplicableServices(
          editing.applicableServices,
        ),
      });
    } else {
      setForm({
        name: "",
        roomTypeIds: ["standard"],
        minNights: null,
        maxNights: null,
        sameRoomRequired: true,
        adjustmentKind: "discount",
        adjustmentType: "percentage",
        amount: 10,
        applicableServices: normalizeApplicableServices(
          serviceType === "all" ? ["boarding"] : [serviceType],
        ),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Room-Type Rule" : "Add Room-Type Rule"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Rule Name</Label>
            <Input
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g. Deluxe room long-stay discount"
            />
          </div>

          <div className="space-y-2">
            <Label>Room Types</Label>
            <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
              {BOARDING_ROOM_OPTIONS.map((roomType) => (
                <label key={roomType.value} className="flex items-center gap-2">
                  <Checkbox
                    checked={form.roomTypeIds.includes(roomType.value)}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({
                        ...prev,
                        roomTypeIds:
                          checked === true
                            ? prev.roomTypeIds.includes(roomType.value)
                              ? prev.roomTypeIds
                              : [...prev.roomTypeIds, roomType.value]
                            : prev.roomTypeIds.filter(
                                (value) => value !== roomType.value,
                              ),
                      }))
                    }
                  />
                  <span className="text-xs">{roomType.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Min nights</Label>
              <Input
                type="number"
                min={1}
                value={form.minNights ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    minNights: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                placeholder="Any"
              />
            </div>
            <div className="space-y-2">
              <Label>Max nights</Label>
              <Input
                type="number"
                min={1}
                value={form.maxNights ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    maxNights: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                placeholder="No cap"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={form.sameRoomRequired}
              onCheckedChange={(checked) =>
                setForm((prev) => ({
                  ...prev,
                  sameRoomRequired: checked === true,
                }))
              }
            />
            <span className="text-sm">Require same room for all nights</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.adjustmentKind}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    adjustmentKind: value as "discount" | "surcharge",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discount">Discount</SelectItem>
                  <SelectItem value="surcharge">Surcharge</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <Select
                value={form.adjustmentType}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    adjustmentType: value as "flat" | "percentage",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percent</SelectItem>
                  <SelectItem value="flat">Flat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{form.adjustmentType === "percentage" ? "%" : "$"}</Label>
              <Input
                type="number"
                min={0}
                value={form.amount}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    amount: Number(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Where this applies</Label>
            <div className="space-y-2 rounded-lg border p-3">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={form.applicableServices.includes("all")}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({
                      ...prev,
                      applicableServices: checked === true ? ["all"] : [],
                    }))
                  }
                />
                <span className="text-sm font-medium">All services</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {serviceOptions.map((service) => (
                  <label
                    key={service.value}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      checked={form.applicableServices.includes(service.value)}
                      onCheckedChange={(checked) =>
                        setForm((prev) => {
                          const withoutAll = prev.applicableServices.filter(
                            (value) => value !== "all",
                          );
                          if (checked === true) {
                            if (withoutAll.includes(service.value)) return prev;
                            return {
                              ...prev,
                              applicableServices: [
                                ...withoutAll,
                                service.value,
                              ],
                            };
                          }
                          return {
                            ...prev,
                            applicableServices: withoutAll.filter(
                              (value) => value !== service.value,
                            ),
                          };
                        })
                      }
                      disabled={form.applicableServices.includes("all")}
                    />
                    <span className="text-xs">{service.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!form.name.trim()) {
                toast.error("Name is required");
                return;
              }
              if (form.roomTypeIds.length === 0) {
                toast.error("Select at least one room type");
                return;
              }

              onSave({
                id: editing?.id ?? makeId("rta"),
                name: form.name,
                roomTypeIds: form.roomTypeIds,
                minNights: form.minNights,
                maxNights: form.maxNights,
                sameRoomRequired: form.sameRoomRequired,
                adjustmentKind: form.adjustmentKind,
                adjustmentType: form.adjustmentType,
                amount: form.amount,
                applicableServices: normalizeApplicableServices(
                  form.applicableServices,
                ),
                isActive: editing?.isActive ?? true,
              });
            }}
          >
            {editing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
