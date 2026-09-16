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

/**
 * Which fixture facility an owner lands on with nothing stored.
 *
 * The first active one — which is NOT the one the fixture rows belong to, and
 * that must stay true. See the block in the provider.
 */
function defaultFixtureFacility() {
  return facilities.find((f) => f.status === "active");
}

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
  // The `id` deliberately does NOT — it stays the fixture's key, because the
  // call sites that filter by it filter fixture arrays and a uuid matches none
  // of them. See docs/quality/debt-map.md.
  //
  // Stated plainly because the halves disagree: what you SEE is real, what the
  // fixture screens FILTER BY is not.
  //
  // ── DO NOT "FIX" THE MISMATCH. IT IS LOAD-BEARING (measured 2026-09-16) ──
  //
  // The default is `availableFacilities[0]`, facility 1. Every fixture row a
  // customer screen filters — all 26 bookings, all 15 documents, all 32 gift
  // cards — carries facility 11, the LAST entry in the list. So
  // `row.facilityId === selectedFacility.id` is `11 === 1` for every row on
  // every screen: the cameras page, the documents list, the gift-card and
  // balance tabs and the pet profile's stay history are not scoped by it, they
  // are EMPTY. That reads like a bug, and the obvious repair is to point the
  // default at facility 11 so the fixture screens agree with the fixture.
  //
  // That repair would expose one customer's data to another. These screens
  // pair the fixture facility filter with `clientId === customerId`, where
  // `customerId` is the REAL client's `ref` — and real refs start at 15 and
  // run 15,16,17,18,19,20,21,22,28,29, straight through the fixture's own id
  // range. The wallet's `MOCK_CLIENT_ID` is literally 15. So the moment the
  // facility halves agree, the signed-in owner whose ref is 15 is shown
  // fixture client 15's credits, gift cards and stays as their own.
  //
  // The mismatch is the only thing holding that apart. It is an accident, not
  // a design, so it is written down rather than relied on quietly: the fix is
  // for these screens to read Postgres, NOT for the two numbers to agree.
  // Until then, empty is the correct output. Debt map.
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
      const defaultId = defaultFixtureFacility()?.id ?? null;
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
      id: fixtureFacility?.id ?? defaultFixtureFacility()?.id ?? 0,
      name: branding.name,
      logo: branding.logoUrl ?? undefined,
      primaryColor: branding.primaryColor ?? undefined,
      secondaryColor: branding.accentColor ?? undefined,
      contact: fixtureFacility?.contact ??
        defaultFixtureFacility()?.contact ?? { email: "", phone: "" },
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
    const defaultFacility = defaultFixtureFacility();
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
