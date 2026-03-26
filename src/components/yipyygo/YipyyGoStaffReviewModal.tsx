"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2,
  MessageSquare,
  Pencil,
  UserCheck,
  Utensils,
  Pill,
  Package,
  DollarSign,
  Heart,
} from "lucide-react";
import { toast } from "sonner";
import type { YipyyGoFormData } from "@/data/yipyygo-forms";
import {
  updateYipyyGoStaffStatus,
  setYipyyGoManuallyCompleted,
  saveYipyyGoForm,
  createStubYipyyGoFormManuallyCompleted,
} from "@/data/yipyygo-forms";
import { logStaffEdit, logStaffManualComplete } from "@/lib/checkin-audit";

interface YipyyGoStaffReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: YipyyGoFormData | null;
  bookingId: number | string;
  /** For audit when form is null (manual complete) */
  facilityId?: number;
  /** Staff user ID (mock) */
  staffUserId?: number;
  onApproved?: () => void;
}

export function YipyyGoStaffReviewModal({
  open,
  onOpenChange,
  form,
  bookingId,
  facilityId: facilityIdProp,
  staffUserId = 1,
  onApproved,
}: YipyyGoStaffReviewModalProps) {
  const facilityId = form?.facilityId ?? facilityIdProp ?? 0;
  const [requestChangesOpen, setRequestChangesOpen] = useState(false);
  const [requestChangesMessage, setRequestChangesMessage] = useState("");
  const [editReasonOpen, setEditReasonOpen] = useState(false);
  const [internalEditReason, setInternalEditReason] = useState("");
  const [manualCompleteOpen, setManualCompleteOpen] = useState(false);

  const handleApprove = () => {
    const updated = updateYipyyGoStaffStatus(bookingId, {
      staffStatus: "approved",
      reviewedBy: staffUserId,
    });
    if (updated) {
      logStaffEdit({
        facilityId,
        bookingId: Number(bookingId),
        petId: form?.petId,
        staffUserId,
        details: "approved",
      });
      toast.success("YipyyGo form approved");
      onApproved?.();
      onOpenChange(false);
    }
  };

  const handleRequestChanges = () => {
    if (!requestChangesMessage.trim()) {
      toast.error("Please enter a message for the customer");
      return;
    }
    const updated = updateYipyyGoStaffStatus(bookingId, {
      staffStatus: "corrections_requested",
      reviewedBy: staffUserId,
      requestChangesMessage: requestChangesMessage.trim(),
    });
    if (updated) {
      logStaffEdit({
        facilityId,
        bookingId: Number(bookingId),
        petId: form?.petId,
        staffUserId,
        details: "corrections_requested",
        metadata: { message: requestChangesMessage.trim() },
      });
      toast.success("Change request sent to customer");
      setRequestChangesMessage("");
      setRequestChangesOpen(false);
      onOpenChange(false);
    }
  };

  const handleEditInternally = () => {
    if (!internalEditReason.trim()) {
      toast.error("Please provide a reason for internal edit");
      return;
    }
    if (!form) return;
    const updated = saveYipyyGoForm({
      ...form,
      staffStatus: "approved",
      reviewedAt: new Date().toISOString(),
      reviewedBy: staffUserId,
      internalEditReason: internalEditReason.trim(),
    });
    if (updated) {
      logStaffEdit({
        facilityId,
        bookingId: Number(bookingId),
        petId: form?.petId,
        staffUserId,
        details: "internal_edit",
        metadata: { reason: internalEditReason.trim() },
      });
      toast.success("Form updated internally and approved");
      setInternalEditReason("");
      setEditReasonOpen(false);
      onApproved?.();
      onOpenChange(false);
    }
  };

  const handleManualComplete = () => {
    const updated = setYipyyGoManuallyCompleted(bookingId, staffUserId);
    if (updated) {
      logStaffManualComplete({
        facilityId,
        bookingId: Number(bookingId),
        petId: form?.petId,
        staffUserId,
      });
      toast.success("Marked as manually completed");
      setManualCompleteOpen(false);
      onApproved?.();
      onOpenChange(false);
    }
  };

  const handleManualCompleteNoForm = () => {
    createStubYipyyGoFormManuallyCompleted({
      bookingId: Number(bookingId),
      facilityId,
      completedBy: staffUserId,
    });
    logStaffManualComplete({
      facilityId,
      bookingId: Number(bookingId),
      staffUserId,
    });
    toast.success("Marked as manually completed (no form on file)");
    onApproved?.();
    onOpenChange(false);
  };

  if (!form) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <p className="text-muted-foreground">
            No YipyyGo form found for this booking.
          </p>
          <p className="text-muted-foreground text-sm">
            You can mark as manually completed if the customer did not submit.
            This is logged for audit.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={handleManualCompleteNoForm}>
              Mark Manually Completed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const hasSubmitted = Boolean(form.submittedAt);
  const selectedAddOns = form.addOns?.filter((a) => a.selected) ?? [];
  const tipLabel = form.tip
    ? form.tip.type === "percentage"
      ? `${form.tip.percentage}%`
      : `$${form.tip.customAmount ?? 0}`
    : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>YipyyGo Review – Booking #{bookingId}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Belongings + photo */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Package className="size-4" />
                  Belongings
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {form.belongings?.length ? (
                  <ul className="list-disc space-y-1 pl-4">
                    {form.belongings.map((b) => (
                      <li key={b.id}>
                        {b.type.replace("_", " ")}{" "}
                        {b.quantity ? `× ${b.quantity}` : ""}
                        {b.notes ? ` – ${b.notes}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">None listed</p>
                )}
                {form.belongingsPhotoUrl && (
                  <p className="text-muted-foreground mt-2">Photo attached</p>
                )}
              </CardContent>
            </Card>

            {/* Feeding */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Utensils className="size-4" />
                  Feeding
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {form.feedingInstructions?.foodType ||
                form.feedingInstructions?.portionSize ? (
                  <p>
                    {form.feedingInstructions.foodType} –{" "}
                    {form.feedingInstructions.portionSize}{" "}
                    {form.feedingInstructions.portionUnit}
                  </p>
                ) : (
                  <p className="text-muted-foreground">Not provided</p>
                )}
              </CardContent>
            </Card>

            {/* Medications */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Pill className="size-4" />
                  Medications
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {form.noMedications ? (
                  <p className="text-muted-foreground">No medications</p>
                ) : form.medications?.length ? (
                  <ul className="list-disc space-y-1 pl-4">
                    {form.medications.map((m) => (
                      <li key={m.id}>
                        {m.name} – {m.dosage}, {m.frequency}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">None listed</p>
                )}
              </CardContent>
            </Card>

            {/* Notes / behavior */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Heart className="size-4" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {form.behaviorNotes?.specialNotes ? (
                  <p>{form.behaviorNotes.specialNotes}</p>
                ) : (
                  <p className="text-muted-foreground">No notes</p>
                )}
              </CardContent>
            </Card>

            {/* Add-ons + tip */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <DollarSign className="size-4" />
                  Add-ons & tip
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {selectedAddOns.length > 0 ? (
                  <ul className="list-disc pl-4">
                    {selectedAddOns.map((a) => (
                      <li key={a.id}>
                        {a.name} {a.quantity ? `× ${a.quantity}` : ""} – $
                        {a.price}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No add-ons selected</p>
                )}
                {tipLabel && <p className="mt-2">Tip: {tipLabel}</p>}
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {hasSubmitted ? (
              <>
                <Button onClick={handleApprove}>
                  <CheckCircle2 className="mr-2 size-4" />
                  Approve
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setRequestChangesOpen(true)}
                >
                  <MessageSquare className="mr-2 size-4" />
                  Request changes
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setEditReasonOpen(true)}
                >
                  <Pencil className="mr-2 size-4" />
                  Edit internally
                </Button>
              </>
            ) : null}
            <Button
              variant="outline"
              onClick={() => setManualCompleteOpen(true)}
            >
              <UserCheck className="mr-2 size-4" />
              Manual completion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request changes dialog */}
      <Dialog open={requestChangesOpen} onOpenChange={setRequestChangesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request changes</DialogTitle>
          </DialogHeader>
          <Label>Message to customer (what to fix)</Label>
          <Textarea
            value={requestChangesMessage}
            onChange={(e) => setRequestChangesMessage(e.target.value)}
            placeholder="e.g. Please add medication times and upload a photo of the medication label."
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRequestChangesOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleRequestChanges}>Send request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit internally – reason required */}
      <Dialog open={editReasonOpen} onOpenChange={setEditReasonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit internally</DialogTitle>
          </DialogHeader>
          <Label>Reason for internal edit (required)</Label>
          <Textarea
            value={internalEditReason}
            onChange={(e) => setInternalEditReason(e.target.value)}
            placeholder="e.g. Corrected feeding amount per front desk note."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditReasonOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditInternally}
              disabled={!internalEditReason.trim()}
            >
              Save & approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual completion */}
      <Dialog open={manualCompleteOpen} onOpenChange={setManualCompleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual completion</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Mark this booking’s YipyyGo as completed without a customer
            submission. Use when the customer provided info in person or by
            phone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setManualCompleteOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleManualComplete}>Mark completed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
