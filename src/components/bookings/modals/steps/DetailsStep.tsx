import type { MedicationStepState } from "@/components/booking/medications/use-medication-step";
import {
  FEEDING_SUB_STEP_ID,
  MEDICATION_SUB_STEP_ID,
} from "@/lib/bookings/care-steps";
import type { FeedingStepState } from "@/components/booking/feeding/use-feeding-step";
import type { Pet } from "@/types/pet";

import { CustomServiceDetails } from "../service-details/CustomServiceDetails";
import { CareStepPanel } from "./care-step-panel";

// ============================================================================
// The Details screens the booking wizard does not draw itself (2026-10-02):
//
//   the care steps   Feeding (3) and Medication (4), for every service the
//                    facility turns them on for
//   a custom service its date and time
//
// Boarding, daycare, grooming and training draw their own screens in the
// wizard — schedule, room type, add-ons, package, groomer or trainer and
// time, program, class, goals — from the client's mock. Their old detail
// screens (BoardingDetails, DaycareDetails, GroomingDetails and the training
// series step) were reachable from here only, and are gone. So is the
// evaluation's (EvaluationDetails, 2026-10-02): its Date & time and About
// your pet are the client's evaluation mock, drawn in the wizard too.
// ============================================================================

interface DetailsStepProps {
  selectedService: string;
  currentSubStep: number;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  checkInTime: string;
  setCheckInTime: (value: string) => void;
  checkOutTime: string;
  setCheckOutTime: (value: string) => void;
  selectedPets: Pet[];
  feedingStep: FeedingStepState;
  medicationStep: MedicationStepState;
  /** The service's own sub-steps are answered: the care steps have days. */
  careStepReady: boolean;
  /** "Step 3 of 4", for the care steps' own heading. */
  careStepLabel: string;
}

export function DetailsStep({
  selectedService,
  currentSubStep,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  checkInTime,
  setCheckInTime,
  checkOutTime,
  setCheckOutTime,
  selectedPets,
  feedingStep,
  medicationStep,
  careStepReady,
  careStepLabel,
}: DetailsStepProps) {
  if (
    currentSubStep === FEEDING_SUB_STEP_ID ||
    currentSubStep === MEDICATION_SUB_STEP_ID
  ) {
    return (
      <CareStepPanel
        subStepId={currentSubStep}
        ready={careStepReady}
        feedingStep={feedingStep}
        medicationStep={medicationStep}
        stepLabel={careStepLabel}
      />
    );
  }

  return (
    <CustomServiceDetails
      serviceId={selectedService}
      currentSubStep={currentSubStep}
      startDate={startDate}
      setStartDate={setStartDate}
      endDate={endDate}
      setEndDate={setEndDate}
      checkInTime={checkInTime}
      setCheckInTime={setCheckInTime}
      checkOutTime={checkOutTime}
      setCheckOutTime={setCheckOutTime}
      selectedPets={selectedPets}
    />
  );
}
