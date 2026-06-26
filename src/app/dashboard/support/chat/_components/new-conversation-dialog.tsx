"use client";

import { useState } from "react";

import { facilities } from "@/data/facilities";
import { createConversation } from "@/hooks/use-support-inbox";
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

interface FacilityOwner {
  name?: string;
  email?: string;
}

export function NewConversationDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const [facilityId, setFacilityId] = useState("");
  const selected = facilities.find((f) => String(f.id) === facilityId);

  function create() {
    if (!selected) return;
    const owner = (selected as { owner?: FacilityOwner }).owner ?? {};
    const id = createConversation({
      id: selected.id,
      name: selected.name,
      contactName: owner.name ?? "Primary contact",
      contactEmail: owner.email ?? "",
    });
    onCreated(id);
    setFacilityId("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New conversation</DialogTitle>
          <DialogDescription>
            Start a support conversation with a facility. It links to their
            account and is recorded in their Logs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="new-conv-facility">Facility</Label>
          <Select value={facilityId} onValueChange={setFacilityId}>
            <SelectTrigger id="new-conv-facility">
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!selected} onClick={create}>
            Start conversation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
