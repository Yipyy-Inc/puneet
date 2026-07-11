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
  /** Training-only: deep-link the booking flow to a Course Type so Step 3
   *  skips the course-type picker and scopes its series to this course. */
  preSelectedCourseTypeId?: string;
  /** Skip the Service step entirely when a service is preselected. Useful when
   *  the caller already knows which module the booking belongs to (e.g. the
   *  global "+ New Booking" button fired from inside a service section). */
  lockService?: boolean;
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
  /** Pass-redemption mode: no payment step; on confirm the pass is auto-applied
   *  via `onRedeem`, which returns how many passes remain. */
  passRedemption?: {
    serviceLabel: string;
    category: string;
    onRedeem: (ctx: { petId?: number; petName?: string }) => {
      ok: boolean;
      passesLeft: number;
    };
  };
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
          preSelectedCourseTypeId={config.preSelectedCourseTypeId}
          lockService={config.lockService ?? false}
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
          passRedemption={config.passRedemption}
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
