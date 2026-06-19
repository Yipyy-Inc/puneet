"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCustomServices } from "@/hooks/use-custom-services";
import { Pencil, Save, Send } from "lucide-react";
import { toast } from "sonner";
import type { CustomServiceModule } from "@/types/facility";

interface FacilitySettingsEditorProps {
  module: CustomServiceModule;
}

/**
 * The only settings a facility can edit on a published custom module. Everything
 * else is locked to the superadmin's configuration and changed via "Request a
 * Change". The cancellation bounds (hours/fee) are locked; only the
 * customer-facing policy text is editable here.
 */
export function FacilitySettingsEditor({
  module,
}: FacilitySettingsEditorProps) {
  const { updateModule } = useCustomServices();
  const cancel = module.onlineBooking.cancellationPolicy;

  const [description, setDescription] = useState(module.description ?? "");
  const [internalNotes, setInternalNotes] = useState(
    module.internalNotes ?? "",
  );
  const [cancellationText, setCancellationText] = useState(cancel.text ?? "");
  const [confirmationMessage, setConfirmationMessage] = useState(
    module.onlineBooking.confirmationMessage ?? "",
  );

  const [requestOpen, setRequestOpen] = useState(false);
  const [requestText, setRequestText] = useState("");

  const dirty =
    description !== (module.description ?? "") ||
    internalNotes !== (module.internalNotes ?? "") ||
    cancellationText !== (cancel.text ?? "") ||
    confirmationMessage !== (module.onlineBooking.confirmationMessage ?? "");

  const handleSave = () => {
    updateModule(module.id, {
      description,
      internalNotes,
      onlineBooking: {
        ...module.onlineBooking,
        confirmationMessage,
        cancellationPolicy: { ...cancel, text: cancellationText },
      },
    });
    toast.success("Settings saved");
  };

  const handleSendRequest = () => {
    toast.success("Change request sent to Yipyy support", {
      description: "Our team will review your request and follow up by email.",
    });
    setRequestOpen(false);
    setRequestText("");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Pencil className="size-4" />
              Settings You Can Edit
            </CardTitle>
            <CardDescription>
              Everything else is configured by Yipyy. Use “Request a Change” to
              ask us to adjust a locked setting.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => setRequestOpen(true)}
          >
            <Send className="mr-1.5 size-3.5" />
            Request a Change
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="settings-description">Public Description</Label>
          <Textarea
            id="settings-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Shown to customers on the booking portal."
            className="resize-none"
          />
          <p className="text-muted-foreground text-xs">
            The text customers see for this service.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="settings-confirmation">
            Booking Confirmation Message
          </Label>
          <Textarea
            id="settings-confirmation"
            rows={3}
            value={confirmationMessage}
            onChange={(e) => setConfirmationMessage(e.target.value)}
            placeholder="Shown to the client right after they complete a booking."
            className="resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="settings-cancellation">Cancellation Policy</Label>
          <Textarea
            id="settings-cancellation"
            rows={2}
            value={cancellationText}
            onChange={(e) => setCancellationText(e.target.value)}
            placeholder="Describe your cancellation policy for customers."
            className="resize-none"
          />
          <p className="text-muted-foreground text-xs">
            Within your plan limits: {cancel.hoursBeforeBooking}h notice,{" "}
            {cancel.feePercentage}% fee (set by Yipyy).
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="settings-notes">Internal Notes</Label>
          <Textarea
            id="settings-notes"
            rows={2}
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="Staff-only notes. Not shown to customers."
            className="resize-none"
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!dirty}>
            <Save className="mr-1.5 size-4" />
            Save Changes
          </Button>
        </div>
      </CardContent>

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request a Change</DialogTitle>
            <DialogDescription>
              Ask Yipyy to modify a locked setting for {module.name}. Our team
              reviews requests and follows up by email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-1">
            <Label htmlFor="change-request">What would you like changed?</Label>
            <Textarea
              id="change-request"
              rows={4}
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
              placeholder="e.g. Increase max simultaneous bookings from 4 to 6, or change the pricing model."
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendRequest} disabled={!requestText.trim()}>
              <Send className="mr-1.5 size-4" />
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
