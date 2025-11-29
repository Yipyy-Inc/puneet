interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  order: number;
  required: boolean;
}

export interface OnboardingChecklist {
  id: string;
  leadId: string;
  facilityName: string;
  startedAt: string;
  completedAt: string | null;
  assignedTo: string;
  steps: OnboardingStepStatus[];
}

export interface OnboardingStepStatus {
  stepId: string;
  completed: boolean;
  completedAt: string | null;
  completedBy: string | null;
  notes: string;
}

export const onboardingSteps: OnboardingStep[] = [
  {
    id: "step-contract",
    title: "Contract Signed",
    description:
      "Ensure the service agreement and contract are signed by all parties",
    order: 1,
    required: true,
  },
  {
    id: "step-payment",
    title: "Payment Method Setup",
    description: "Configure payment method and billing information",
    order: 2,
    required: true,
  },
  {
    id: "step-training",
    title: "Initial Training Scheduled",
    description: "Schedule onboarding training session with the facility team",
    order: 3,
    required: true,
  },
  {
    id: "step-data-entry",
    title: "Facility Data Entry Completed",
    description: "Enter all facility information, services, and pricing",
    order: 4,
    required: true,
  },
  {
    id: "step-staff-accounts",
    title: "Staff Accounts Created",
    description: "Create user accounts for all facility staff members",
    order: 5,
    required: true,
  },
  {
    id: "step-go-live",
    title: "Go-Live Date Set",
    description: "Confirm and set the official launch date",
    order: 6,
    required: true,
  },
];

export const onboardingChecklists: OnboardingChecklist[] = [
  {
    id: "onboard-1",
    leadId: "lead-7",
    facilityName: "Coastal Critters Care",
    startedAt: "2025-01-10T09:00:00Z",
    completedAt: null,
    assignedTo: "user-1",
    steps: [
      {
        stepId: "step-contract",
        completed: true,
        completedAt: "2025-01-10T14:30:00Z",
        completedBy: "user-1",
        notes: "Contract signed via DocuSign",
      },
      {
        stepId: "step-payment",
        completed: true,
        completedAt: "2025-01-11T10:00:00Z",
        completedBy: "user-1",
        notes: "Credit card on file, auto-billing enabled",
      },
      {
        stepId: "step-training",
        completed: true,
        completedAt: "2025-01-12T09:00:00Z",
        completedBy: "user-2",
        notes: "Training scheduled for Jan 20th at 2pm",
      },
      {
        stepId: "step-data-entry",
        completed: false,
        completedAt: null,
        completedBy: null,
        notes: "",
      },
      {
        stepId: "step-staff-accounts",
        completed: false,
        completedAt: null,
        completedBy: null,
        notes: "",
      },
      {
        stepId: "step-go-live",
        completed: false,
        completedAt: null,
        completedBy: null,
        notes: "",
      },
    ],
  },
  {
    id: "onboard-2",
    leadId: "lead-8",
    facilityName: "Mountain View Pet Resort",
    startedAt: "2025-01-08T10:00:00Z",
    completedAt: "2025-01-15T16:00:00Z",
    assignedTo: "user-2",
    steps: [
      {
        stepId: "step-contract",
        completed: true,
        completedAt: "2025-01-08T11:00:00Z",
        completedBy: "user-2",
        notes: "Physical contract signed in office",
      },
      {
        stepId: "step-payment",
        completed: true,
        completedAt: "2025-01-08T14:00:00Z",
        completedBy: "user-2",
        notes: "ACH transfer setup complete",
      },
      {
        stepId: "step-training",
        completed: true,
        completedAt: "2025-01-09T10:00:00Z",
        completedBy: "user-2",
        notes: "Remote training completed successfully",
      },
      {
        stepId: "step-data-entry",
        completed: true,
        completedAt: "2025-01-12T15:00:00Z",
        completedBy: "user-3",
        notes: "All services and pricing configured",
      },
      {
        stepId: "step-staff-accounts",
        completed: true,
        completedAt: "2025-01-14T10:00:00Z",
        completedBy: "user-3",
        notes: "8 staff accounts created",
      },
      {
        stepId: "step-go-live",
        completed: true,
        completedAt: "2025-01-15T16:00:00Z",
        completedBy: "user-2",
        notes: "Launched on January 20th",
      },
    ],
  },
  {
    id: "onboard-3",
    leadId: "lead-9",
    facilityName: "Urban Paws Daycare",
    startedAt: "2025-01-14T11:00:00Z",
    completedAt: null,
    assignedTo: "user-1",
    steps: [
      {
        stepId: "step-contract",
        completed: true,
        completedAt: "2025-01-14T15:00:00Z",
        completedBy: "user-1",
        notes: "E-signature completed",
      },
      {
        stepId: "step-payment",
        completed: false,
        completedAt: null,
        completedBy: null,
        notes: "Awaiting finance team approval",
      },
      {
        stepId: "step-training",
        completed: false,
        completedAt: null,
        completedBy: null,
        notes: "",
      },
      {
        stepId: "step-data-entry",
        completed: false,
        completedAt: null,
        completedBy: null,
        notes: "",
      },
      {
        stepId: "step-staff-accounts",
        completed: false,
        completedAt: null,
        completedBy: null,
        notes: "",
      },
      {
        stepId: "step-go-live",
        completed: false,
        completedAt: null,
        completedBy: null,
        notes: "",
      },
    ],
  },
];

// Helper functions
export function getOnboardingProgress(checklist: OnboardingChecklist): number {
  const completedSteps = checklist.steps.filter((s) => s.completed).length;
  return Math.round((completedSteps / checklist.steps.length) * 100);
}

export function getPendingOnboardings(): OnboardingChecklist[] {
  return onboardingChecklists.filter((o) => o.completedAt === null);
}

export function getCompletedOnboardings(): OnboardingChecklist[] {
  return onboardingChecklists.filter((o) => o.completedAt !== null);
}
