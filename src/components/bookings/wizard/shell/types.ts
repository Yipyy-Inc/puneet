import type { WizardStepState } from "@/lib/bookings/wizard/progress";

export type { WizardStepState };

/** One of the four steps, as the rail, the pills and the header show it. */
export interface WizardStepView {
  id: "client-pet" | "service" | "details" | "confirm";
  title: string;
  /** One line under the title: who, which service, the dates, the action. */
  summary: string;
  state: WizardStepState;
  /** Present when the step can be opened from here (a finished step). */
  onSelect?: () => void;
}

/** One screen inside Details. */
export interface WizardSubStepView {
  id: number;
  title: string;
  /** What was answered there, once it has been ("4 nights", "2 meals"). */
  summary?: string | null;
  state: WizardStepState;
  onSelect?: () => void;
}
