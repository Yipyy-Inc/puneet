"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { submitRequest } from "@/data/module-requests";

interface ModuleRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: number;
  facilityName: string;
}

export function ModuleRequestForm({
  open,
  onOpenChange,
  facilityId,
  facilityName,
}: ModuleRequestFormProps) {
  const [serviceName, setServiceName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("unsure");
  const [priority, setPriority] = useState("normal");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!serviceName.trim() || !description.trim()) return;
    submitRequest({
      facilityId,
      facilityName,
      requestedBy: "Facility Admin",
      serviceName: serviceName.trim(),
      description: description.trim(),
      suggestedCategory: category as "unsure",
      priority: priority as "normal" | "urgent",
    });
    setSubmitted(true);
    toast.success("Module request submitted");
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setServiceName("");
      setDescription("");
      setCategory("unsure");
      setPriority("normal");
      setSubmitted(false);
    }, 200);
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md text-center">
          <div className="py-6">
            <CheckCircle className="mx-auto mb-4 size-12 text-emerald-500" />
            <DialogTitle className="text-lg">Request Submitted</DialogTitle>
            <p className="text-muted-foreground mt-2 text-sm">
              Your request for &ldquo;{serviceName}&rdquo; has been submitted.
              The Yipyy team will build and configure this module for you.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="size-5" />
            Request a New Service Module
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-1.5">
            <Label className="text-sm">
              What service do you need?{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="e.g., Dog Swimming, Pet Taxi, Puppy Socialization..."
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-sm">
              Describe what this service involves{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="We have an indoor pool and want to offer supervised swim sessions for dogs. Sessions are 45 minutes..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label className="text-sm">Service category (best guess)</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="timed_session">
                    Timed session (appointments)
                  </SelectItem>
                  <SelectItem value="stay_based">
                    Stay-based (overnight/multi-day)
                  </SelectItem>
                  <SelectItem value="transport">
                    Transport / pickup-dropoff
                  </SelectItem>
                  <SelectItem value="event_based">
                    Event / class / group
                  </SelectItem>
                  <SelectItem value="one_time_appointment">
                    One-time appointment
                  </SelectItem>
                  <SelectItem value="addon_only">
                    Add-on to another service
                  </SelectItem>
                  <SelectItem value="unsure">Not sure</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-sm">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!serviceName.trim() || !description.trim()}
          >
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
