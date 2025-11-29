"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LeadForm, LeadFormData } from "@/components/crm/LeadForm";
import { Lead } from "@/data/crm/leads";

interface LeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead;
  onSave?: (data: LeadFormData) => void;
}

export function LeadModal({
  open,
  onOpenChange,
  lead,
  onSave,
}: LeadModalProps) {
  const handleSubmit = (data: LeadFormData) => {
    onSave?.(data);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? "Edit Lead" : "Create New Lead"}</DialogTitle>
        </DialogHeader>
        <LeadForm
          initialData={lead}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
}
