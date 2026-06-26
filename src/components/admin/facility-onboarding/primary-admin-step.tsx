"use client";

import { useForm } from "@tanstack/react-form";
import { Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/ui/form/form-field";

import { WizardStepFrame } from "./wizard-step-frame";
import { primaryAdminSchema } from "./wizard-schemas";
import type { StepProps } from "./wizard-types";

export function PrimaryAdminStep({
  draft,
  onNext,
  onBack,
  onCancel,
}: StepProps) {
  const form = useForm({
    defaultValues: {
      adminFirstName: draft.adminFirstName,
      adminLastName: draft.adminLastName,
      adminEmail: draft.adminEmail,
    },
    validators: { onSubmit: primaryAdminSchema },
    onSubmit: ({ value }) => onNext(value),
  });

  return (
    <WizardStepFrame
      stepIndex={4}
      form={form}
      onBack={onBack ? () => onBack(form.state.values) : undefined}
      onCancel={onCancel}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          form={form}
          name="adminFirstName"
          label="First Name"
          placeholder="Marie"
        />
        <FormField
          form={form}
          name="adminLastName"
          label="Last Name"
          placeholder="Tremblay"
        />
      </div>

      <FormField
        form={form}
        name="adminEmail"
        label="Email"
        type="email"
        placeholder="marie@doggieville.com"
      />

      <div className="flex items-center justify-between rounded-lg border p-3">
        <Label className="m-0">Role</Label>
        <Badge variant="secondary">Facility Admin</Badge>
      </div>

      <div className="text-muted-foreground flex items-start gap-2 rounded-lg border border-dashed p-3 text-xs">
        <Info className="mt-0.5 size-4 shrink-0" />
        <span>
          A welcome email with a login link will be sent to this address on
          creation.
        </span>
      </div>
    </WizardStepFrame>
  );
}
