"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { BookingModal } from "@/components/bookings/modals/BookingModal";
import type {
  NewBooking as BookingData,
  ExtraService,
  FeedingScheduleItem,
  MedicationItem,
} from "@/types/booking";
import type { Client } from "@/types/client";

interface BookingModalConfig {
  clients: Client[];
  facilityId: number;
  facilityName: string;
  preSelectedClientId?: number;
  preSelectedPetId?: number;
  preSelectedService?: string;
  preSelectedStartDate?: string;
  preSelectedEndDate?: string;
  preSelectedCheckInTime?: string;
  preSelectedCheckOutTime?: string;
  preSelectedDaycareDates?: string[];
  preSelectedRoomId?: string;
  preSelectedDaycareSectionId?: string;
  preSelectedExtraServices?: ExtraService[];
  preSelectedFeedingSchedule?: FeedingScheduleItem[];
  preSelectedMedications?: MedicationItem[];
  preSelectedSpecialRequests?: string;
  preSelectedNotificationEmail?: boolean;
  preSelectedNotificationSMS?: boolean;
  onCreateBooking: (booking: BookingData) => void;
  isEstimateMode?: boolean;
  isCustomerMode?: boolean;
}

interface BookingModalContextValue {
  isOpen: boolean;
  openBookingModal: (config: BookingModalConfig) => void;
  closeBookingModal: () => void;
}

const BookingModalContext = createContext<BookingModalContextValue | null>(
  null,
);

export function BookingModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<BookingModalConfig | null>(null);
  const [openCount, setOpenCount] = useState(0);

  const openBookingModal = useCallback((newConfig: BookingModalConfig) => {
    setConfig(newConfig);
    setOpenCount((c) => c + 1);
    setIsOpen(true);
  }, []);

  const closeBookingModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
  }, []);

  return (
    <BookingModalContext.Provider
      value={{ isOpen, openBookingModal, closeBookingModal }}
    >
      {children}
      {config && (
        <BookingModal
          key={`${openCount}-${config.preSelectedClientId ?? "none"}-${config.preSelectedPetId ?? "none"}-${config.preSelectedService ?? "none"}`}
          open={isOpen}
          onOpenChange={handleOpenChange}
          clients={config.clients}
          facilityId={config.facilityId}
          facilityName={config.facilityName}
          onCreateBooking={config.onCreateBooking}
          preSelectedClientId={config.preSelectedClientId}
          preSelectedPetId={config.preSelectedPetId}
          preSelectedService={config.preSelectedService}
          preSelectedStartDate={config.preSelectedStartDate}
          preSelectedEndDate={config.preSelectedEndDate}
          preSelectedCheckInTime={config.preSelectedCheckInTime}
          preSelectedCheckOutTime={config.preSelectedCheckOutTime}
          preSelectedDaycareDates={config.preSelectedDaycareDates}
          preSelectedRoomId={config.preSelectedRoomId}
          preSelectedDaycareSectionId={config.preSelectedDaycareSectionId}
          preSelectedExtraServices={config.preSelectedExtraServices}
          preSelectedFeedingSchedule={config.preSelectedFeedingSchedule}
          preSelectedMedications={config.preSelectedMedications}
          preSelectedSpecialRequests={config.preSelectedSpecialRequests}
          preSelectedNotificationEmail={config.preSelectedNotificationEmail}
          preSelectedNotificationSMS={config.preSelectedNotificationSMS}
          estimateMode={config.isEstimateMode ?? false}
          isCustomerMode={config.isCustomerMode ?? false}
        />
      )}
    </BookingModalContext.Provider>
  );
}

export function useBookingModal() {
  const context = useContext(BookingModalContext);
  if (!context) {
    throw new Error(
      "useBookingModal must be used within a BookingModalProvider",
    );
  }
  return context;
}
