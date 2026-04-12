"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { FacilityRoom } from "@/types/rooms";

function blank(categoryId: string, facilityId: number): FacilityRoom {
  return {
    id: `room-${Date.now()}`,
    categoryId,
    facilityId,
    name: "",
    active: true,
    capacity: undefined,
    staffNotes: "",
  };
}

interface Props {
  open: boolean;
  editing: FacilityRoom | null;
  categoryId: string;
  categoryName?: string;
  facilityId?: number;
  onClose: () => void;
  onSave: (room: FacilityRoom) => void;
}

export function RoomUnitFormDialog({
  open, editing, categoryId, categoryName, facilityId = 11, onClose, onSave,
}: Props) {
  const [form, setForm] = useState<FacilityRoom>(() => blank(categoryId, facilityId));

  useEffect(() => {
    setForm(editing ? { ...editing } : blank(categoryId, facilityId));
  }, [editing, open, categoryId, facilityId]);

  const valid = form.name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Room Unit" : `Add Unit${categoryName ? ` — ${categoryName}` : ""}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Room Name <span className="text-destructive">*</span></Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Suite 01, Condo 14, Deluxe A…"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Capacity Override</Label>
            <Input
              type="number" min={1}
              value={form.capacity ?? ""}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                setForm({ ...form, capacity: isNaN(v) ? undefined : v });
              }}
              placeholder="Leave blank to use category default"
            />
            <p className="text-muted-foreground text-xs">
              Overrides the category default for this unit only.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Staff Notes</Label>
            <Textarea
              value={form.staffNotes ?? ""}
              onChange={(e) => setForm({ ...form, staffNotes: e.target.value })}
              placeholder="Internal notes — e.g. 'Under renovation', 'Extra large crate inside'…"
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="flex items-center gap-2.5">
            <Switch
              checked={form.active}
              onCheckedChange={(v) => setForm({ ...form, active: v })}
            />
            <Label className="cursor-pointer font-normal text-sm">
              {form.active
                ? "Active — available for booking"
                : "Inactive — hidden from bookings"}
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!valid} onClick={() => onSave(form)}>
            {editing ? "Save Changes" : "Add Room"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
