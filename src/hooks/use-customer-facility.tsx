"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
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

const CustomerFacilityContext = createContext<
  CustomerFacilityContextValue | undefined
>(undefined);

/**
 * The facility this portal is FOR, resolved from the hostname by the server
 * layout. `null` on the apex, where there is no facility.
 */
export interface RealFacilityBranding {
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
}

export function CustomerFacilityProvider({
  children,
  branding,
}: {
  children: ReactNode;
  /** From `getBrandingBySlug()` in the customer layout. */
  branding?: RealFacilityBranding | null;
}) {
  // ── WHY THE FIXTURE IS STILL HERE, AND WHAT IT IS STILL FOR ─────────────
  //
  // Walking CUJ-20 on 2026-08-19 found this provider naming the WRONG BUSINESS
  // to every customer: it mapped src/data/facilities.ts, filtered to active,
  // and defaulted to `availableFacilities[0]` — so somebody who joined
  // Doggieville Mtl saw "Paws & Play Daycare" in the sidebar, the header, the
  // switcher and the welcome line. /sign-in, /sign-up and /join were correct
  // the whole time, because those read the hostname.
  //
  // So the NAME and the MARK now come from the hostname too, via
  // getBrandingBySlug() in the server layout.
  //
  // The `id` deliberately does NOT. Twenty-eight call sites filter fixture
  // arrays by `selectedFacility.id` — bookings, packages, report cards, the
  // billing tabs — and a facility uuid matches none of them. Changing it would
  // turn every one of those screens silently empty, which is a worse failure
  // than a wrong name because nothing on screen says anything is missing. The
  // id stays the fixture's until the screens behind it read Postgres; see
  // docs/quality/debt-map.md.
  //
  // Stated plainly because the halves disagree: what you SEE is real, what the
  // fixture screens FILTER BY is not.
  const availableFacilities: FacilityBranding[] = useMemo(
    () =>
      facilities
        .filter((f) => f.status === "active")
        .map((f) => ({
          id: f.id,
          name: f.name,
          logo: undefined,
          primaryColor: undefined,
          secondaryColor: undefined,
          contact: f.contact,
        })),
    [],
  );

  // Start null to match server render — hydrate from localStorage in effect
  const [state, setState] = useState<{
    facilityId: number | null;
    loading: boolean;
  }>({ facilityId: null, loading: true });

  useEffect(() => {
    requestAnimationFrame(() => {
      const stored = localStorage.getItem(CUSTOMER_FACILITY_KEY);
      if (stored) {
        const id = parseInt(stored, 10);
        if (availableFacilities.some((f) => f.id === id)) {
          setState({ facilityId: id, loading: false });
          return;
        }
      }
      const defaultId = availableFacilities[0]?.id ?? null;
      if (defaultId !== null) {
        localStorage.setItem(CUSTOMER_FACILITY_KEY, defaultId.toString());
      }
      setState({ facilityId: defaultId, loading: false });
    });
  }, [availableFacilities]);

  const selectedFacilityId = state.facilityId;
  const isLoading = state.loading;

  const setSelectedFacilityId = (id: number | null) => {
    setState((prev) => ({ ...prev, facilityId: id }));
  };

  const setSelectedFacility = (facilityId: number) => {
    if (availableFacilities.some((f) => f.id === facilityId)) {
      setSelectedFacilityId(facilityId);
      localStorage.setItem(CUSTOMER_FACILITY_KEY, facilityId.toString());
    }
  };

  const fixtureFacility =
    selectedFacilityId !== null
      ? (availableFacilities.find((f) => f.id === selectedFacilityId) ?? null)
      : null;

  // The real facility's identity over the fixture's id. On the apex there is no
  // hostname facility, so the fixture stands alone and this is a no-op — which
  // is every customer who signed up before facilities had their own addresses.
  const selectedFacility = useMemo(() => {
    if (!branding) return fixtureFacility;
    return {
      id: fixtureFacility?.id ?? availableFacilities[0]?.id ?? 0,
      name: branding.name,
      logo: branding.logoUrl ?? undefined,
      primaryColor: branding.primaryColor ?? undefined,
      secondaryColor: branding.accentColor ?? undefined,
      contact: fixtureFacility?.contact ??
        availableFacilities[0]?.contact ?? { email: "", phone: "" },
    };
  }, [branding, fixtureFacility, availableFacilities]);

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
