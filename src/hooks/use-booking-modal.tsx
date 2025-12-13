"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  BookingModal,
  type BookingData,
} from "@/components/bookings/modals/BookingModal";

import { Client } from "@/lib/types";

interface BookingModalConfig {
  clients: Client[];
  facilityId: number;
  facilityName: string;
  preSelectedClientId?: number;
  preSelectedPetId?: number;
  preSelectedService?: string;
  onCreateBooking: (booking: BookingData) => void;
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

  const openBookingModal = useCallback((newConfig: BookingModalConfig) => {
    setConfig(newConfig);
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
          key={`${config.preSelectedClientId ?? "none"}-${config.preSelectedPetId ?? "none"}-${config.preSelectedService ?? "none"}`}
          open={isOpen}
          onOpenChange={handleOpenChange}
          clients={config.clients}
          facilityId={config.facilityId}
          facilityName={config.facilityName}
          onCreateBooking={config.onCreateBooking}
          preSelectedClientId={config.preSelectedClientId}
          preSelectedPetId={config.preSelectedPetId}
          preSelectedService={config.preSelectedService}
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
