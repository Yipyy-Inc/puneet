import { DaycareDetails, BoardingDetails } from "../service-details";
import type { FeedingScheduleItem, MedicationItem } from "@/lib/types";
import { Pet } from "@/lib/types";

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
  setStartDate: (value: string) => void;
  setEndDate: (value: string) => void;
  setCheckInTime: (value: string) => void;
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
  setStartDate,
  setEndDate,
  setCheckInTime,
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
        />
      )}
    </div>
  );
}
