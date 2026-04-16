import {
  DaycareDetails,
  BoardingDetails,
  EvaluationDetails,
  CustomServiceDetails,
} from "../service-details";
import type { FeedingScheduleItem, MedicationItem } from "@/types/booking";
import type { Pet } from "@/types/pet";

interface DetailsStepProps {
  selectedService: string;
  currentSubStep: number;
  isSubStepComplete?: (stepIndex: number) => boolean;
  // Daycare
  daycareSelectedDates: Date[];
  setDaycareSelectedDates: (value: Date[]) => void;
  daycareDateTimes: Array<{
    date: string;
    checkInTime: string;
    checkOutTime: string;
  }>;
  setDaycareDateTimes: (
    value: Array<{ date: string; checkInTime: string; checkOutTime: string }>,
  ) => void;
  roomAssignments: Array<{ petId: number; roomId: string }>;
  setRoomAssignments: (value: Array<{ petId: number; roomId: string }>) => void;
  // Boarding
  boardingRangeStart: Date | null;
  setBoardingRangeStart: (value: Date | null) => void;
  boardingRangeEnd: Date | null;
  setBoardingRangeEnd: (value: Date | null) => void;
  boardingDateTimes: Array<{
    date: string;
    checkInTime: string;
    checkOutTime: string;
  }>;
  setBoardingDateTimes: (
    value: Array<{ date: string; checkInTime: string; checkOutTime: string }>,
  ) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  checkInTime: string;
  setCheckInTime: (value: string) => void;
  checkOutTime: string;
  setCheckOutTime: (value: string) => void;
  serviceType: string;
  setServiceType: (value: string) => void;
  // Common
  feedingSchedule: FeedingScheduleItem[];
  setFeedingSchedule: (value: FeedingScheduleItem[]) => void;
  medications: MedicationItem[];
  setMedications: (value: MedicationItem[]) => void;
  feedingMedicationTab: "feeding" | "medication";
  setFeedingMedicationTab: (value: "feeding" | "medication") => void;
  extraServices: Array<{ serviceId: string; quantity: number; petId: number }>;
  setExtraServices: (
    services: Array<{ serviceId: string; quantity: number; petId: number }>,
  ) => void;
  selectedPets: Pet[];
  /** When true, room/section eligibility rules are bypassed (used for guest estimates
   *  where pet weight/type are unknown). */
  skipEligibility?: boolean;
}

export function DetailsStep({
  selectedService,
  currentSubStep,
  isSubStepComplete,
  daycareSelectedDates,
  setDaycareSelectedDates,
  daycareDateTimes,
  setDaycareDateTimes,
  roomAssignments,
  setRoomAssignments,
  boardingRangeStart,
  setBoardingRangeStart,
  boardingRangeEnd,
  setBoardingRangeEnd,
  boardingDateTimes,
  setBoardingDateTimes,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  checkInTime,
  setCheckInTime,
  checkOutTime,
  setCheckOutTime,
  serviceType,
  setServiceType,
  feedingSchedule,
  setFeedingSchedule,
  medications,
  setMedications,
  extraServices,
  setExtraServices,
  selectedPets,
  skipEligibility,
}: DetailsStepProps) {
  return (
    <div className="space-y-4">
      {/* Service-specific fields */}
      {selectedService === "daycare" && (
        <DaycareDetails
          currentSubStep={currentSubStep}
          isSubStepComplete={isSubStepComplete}
          daycareSelectedDates={daycareSelectedDates}
          setDaycareSelectedDates={setDaycareSelectedDates}
          daycareDateTimes={daycareDateTimes}
          setDaycareDateTimes={setDaycareDateTimes}
          setServiceType={setServiceType}
          feedingSchedule={feedingSchedule}
          setFeedingSchedule={setFeedingSchedule}
          medications={medications}
          setMedications={setMedications}
          roomAssignments={roomAssignments}
          setRoomAssignments={setRoomAssignments}
          extraServices={extraServices}
          setExtraServices={setExtraServices}
          selectedPets={selectedPets}
          skipEligibility={skipEligibility}
        />
      )}

      {selectedService === "boarding" && (
        <BoardingDetails
          currentSubStep={currentSubStep}
          isSubStepComplete={isSubStepComplete}
          boardingRangeStart={boardingRangeStart}
          setBoardingRangeStart={setBoardingRangeStart}
          boardingRangeEnd={boardingRangeEnd}
          setBoardingRangeEnd={setBoardingRangeEnd}
          boardingDateTimes={boardingDateTimes}
          setBoardingDateTimes={setBoardingDateTimes}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
          setCheckInTime={setCheckInTime}
          setCheckOutTime={setCheckOutTime}
          serviceType={serviceType}
          setServiceType={setServiceType}
          roomAssignments={roomAssignments}
          setRoomAssignments={setRoomAssignments}
          feedingSchedule={feedingSchedule}
          setFeedingSchedule={setFeedingSchedule}
          medications={medications}
          setMedications={setMedications}
          extraServices={extraServices}
          setExtraServices={setExtraServices}
          selectedPets={selectedPets}
          skipEligibility={skipEligibility}
        />
      )}

      {selectedService === "evaluation" && (
        <EvaluationDetails
          currentSubStep={currentSubStep}
          isSubStepComplete={isSubStepComplete}
          startDate={startDate}
          setStartDate={setStartDate}
          checkInTime={checkInTime}
          setCheckInTime={setCheckInTime}
          checkOutTime={checkOutTime}
          setCheckOutTime={setCheckOutTime}
          extraServices={extraServices}
          setExtraServices={setExtraServices}
          selectedPets={selectedPets}
        />
      )}

      {!["daycare", "boarding", "evaluation"].includes(selectedService) && (
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
      )}
    </div>
  );
}
