"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { facilities } from "@/data/facilities";

export interface FacilityBranding {
  id: number;
  name: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  contact: {
    email: string;
    phone: string;
    website?: string;
  };
}

const CUSTOMER_FACILITY_KEY = "customer_selected_facility_id";

interface CustomerFacilityContextValue {
  selectedFacility: FacilityBranding | null;
  availableFacilities: FacilityBranding[];
  setSelectedFacility: (facilityId: number) => void;
  isLoading: boolean;
}

const CustomerFacilityContext = createContext<CustomerFacilityContextValue | undefined>(undefined);

export function CustomerFacilityProvider({ children }: { children: ReactNode }) {
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get available facilities for the customer
  // TODO: Replace with actual API call to get customer's facilities
  const availableFacilities: FacilityBranding[] = facilities
    .filter((f) => f.status === "active")
    .map((f) => ({
      id: f.id,
      name: f.name,
      logo: undefined, // TODO: Get from facility settings/API - defaults to Yipyy logo in header
      primaryColor: undefined, // TODO: Get from facility settings
      secondaryColor: undefined, // TODO: Get from facility settings
      contact: f.contact,
    }));

  useEffect(() => {
    // Load selected facility from localStorage or default to first available
    const stored = localStorage.getItem(CUSTOMER_FACILITY_KEY);
    if (stored) {
      const facilityId = parseInt(stored, 10);
      if (availableFacilities.some((f) => f.id === facilityId)) {
        setSelectedFacilityId(facilityId);
      } else {
        // If stored facility is not available, use first available
        setSelectedFacilityId(availableFacilities[0]?.id ?? null);
      }
    } else {
      // Default to first available facility
      setSelectedFacilityId(availableFacilities[0]?.id ?? null);
    }
    setIsLoading(false);
  }, []);

  const setSelectedFacility = (facilityId: number) => {
    if (availableFacilities.some((f) => f.id === facilityId)) {
      setSelectedFacilityId(facilityId);
      localStorage.setItem(CUSTOMER_FACILITY_KEY, facilityId.toString());
    }
  };

  const selectedFacility =
    selectedFacilityId !== null
      ? availableFacilities.find((f) => f.id === selectedFacilityId) ?? null
      : null;

  return (
    <CustomerFacilityContext.Provider
      value={{
        selectedFacility,
        availableFacilities,
        setSelectedFacility,
        isLoading,
      }}
    >
      {children}
    </CustomerFacilityContext.Provider>
  );
}

export function useCustomerFacility() {
  const context = useContext(CustomerFacilityContext);
  if (context === undefined) {
    // Return default values when used outside CustomerFacilityProvider (e.g., in facility context)
    // This allows components to work in both customer and facility contexts
    const defaultFacility = facilities.find((f) => f.status === "active");
    return {
      selectedFacility: defaultFacility
        ? {
            id: defaultFacility.id,
            name: defaultFacility.name,
            logo: undefined,
            primaryColor: undefined,
            secondaryColor: undefined,
            contact: defaultFacility.contact,
          }
        : null,
      availableFacilities: facilities
        .filter((f) => f.status === "active")
        .map((f) => ({
          id: f.id,
          name: f.name,
          logo: undefined,
          primaryColor: undefined,
          secondaryColor: undefined,
          contact: f.contact,
        })),
      setSelectedFacility: () => {
        // No-op in facility context
      },
      isLoading: false,
    };
  }
  return context;
}
