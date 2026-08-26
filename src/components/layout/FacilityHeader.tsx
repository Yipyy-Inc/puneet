"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Plus, User, Calendar, ShoppingBag, Zap, FileText } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFacilityProfile } from "@/lib/api/facility-profile";
import { clientQueries, useCreateClient } from "@/lib/api/client";
import { bookingMutations } from "@/lib/api/booking";
import { useBookingModal } from "@/hooks/use-booking-modal";
import { useLocationContext } from "@/hooks/use-location-context";
import { usePermission } from "@/hooks/use-facility-rbac";

import type { AdditionalContact } from "@/types/client";
import type { NewBooking } from "@/types/booking";
import type { Pet } from "@/types/pet";

import { CreateClientModal } from "@/components/clients/CreateClientModal";
import { useUiText } from "@/hooks/use-ui-text";

interface FacilityHeaderProps {
  facilityId?: number;
}

// Maps a `/services/<slug>` path segment to the BookingModal service key.
// Limited to modules the wizard knows how to render details for — others
// fall through to the unfiltered Service step.
const SERVICE_SECTION_SLUGS: Record<string, string> = {
  grooming: "grooming",
  daycare: "daycare",
  boarding: "boarding",
};

export function FacilityHeader({ facilityId = 11 }: FacilityHeaderProps) {
  const { openBookingModal } = useBookingModal();
  const { currentLocationId } = useLocationContext();
  const { t } = useUiText();
  const pathname = usePathname();

  // When staff hit "+ New Booking" from inside a service section, pre-select
  // that service and skip the Service step so they don't have to re-pick the
  // module they're already working in.
  const sectionService = useMemo(() => {
    const match = pathname?.match(/^\/facility\/dashboard\/services\/([^/]+)/);
    const slug = match?.[1];
    return slug ? SERVICE_SECTION_SLUGS[slug] : undefined;
  }, [pathname]);

  // Modal states
  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false);

  // ── THE + NEW MENU USED TO CREATE NOTHING ────────────────────────────────
  //
  // `handleCreateClient` showed "Client {name} created" and returned. Its own
  // comment said "In a real app, this would save to the database".
  // `handleCreateBooking` pushed onto a useState array seeded from the bookings
  // fixture, toasted "Booking #N created" with an Undo, and lost it on the next
  // navigation. Both are the most prominent control in the facility portal.
  //
  // The client list feeding the booking wizard came from the fixtures too,
  // filtered by facility NAME — so it offered staff a list of people who do not
  // exist and omitted every client they actually have.
  const { profile } = useFacilityProfile();
  const { data: clients = [] } = useQuery(clientQueries.all());
  const createClient = useCreateClient();
  const queryClient = useQueryClient();

  // Each quick-action is gated by the permission its underlying flow requires.
  // The facility admin (and the no-provider fallback) resolve every key to
  // granted, so this menu is unchanged there; in the /employee portal the RBAC
  // viewer is the signed-in staff member, so ungranted actions drop out — and
  // the whole "+ New" button hides when the viewer can create nothing.
  const canNewClient = usePermission("create_clients");
  const canNewBooking = usePermission("create_bookings");
  const canRetailSale = usePermission("retail_process_sale");
  const canNewEstimate = usePermission("create_bookings");
  const canDaycareCheckin = usePermission("daycare_check_in_out");
  const anyQuickAction =
    canNewClient ||
    canNewBooking ||
    canRetailSale ||
    canNewEstimate ||
    canDaycareCheckin;

  // Only the permission decides now. This used to also require a matching row
  // in the facilities FIXTURE (`if (!facility || !anyQuickAction)`).
  //
  // That never actually fired — both callers pass `facilityId={11}` and 11 is
  // in the mock array — so this is not a bug being fixed. It is a loaded gun
  // being unloaded: the most prominent control in the portal was one prop
  // change away from disappearing for a real facility, and the failure would
  // have looked like a permissions problem.
  if (!anyQuickAction) {
    return null;
  }

  // Handlers for creating new entities
  const handleCreateClient = (newClient: {
    name: string;
    email: string;
    phone?: string;
    preferredLanguage?: string;
    status: string;
    facility: string;
    address: {
      street: string;
      city: string;
      state: string;
      country: string;
      zip: string;
    };
    additionalContacts: AdditionalContact[];
    pets: Omit<Pet, "id" | "imageUrl">[];
  }) => {
    createClient.mutate(newClient, {
      onSuccess: ({ client, failedPets }) => {
        setIsCreateClientModalOpen(false);
        // The saved row's name, not the one that was typed — the two differ if
        // the database trimmed or normalised anything, and the row is the fact.
        if (failedPets.length > 0) {
          // A pet that failed does NOT roll the client back (see useCreateClient),
          // so saying only "created" would hide animals that are not there.
          toast.warning(`${client.name} was created without every pet`, {
            description: `${failedPets.join(", ")} could not be saved. Add them from the client's file.`,
          });
        } else {
          toast.success(`Client ${client.name} created`, {
            description: t("New client has been added successfully."),
          });
        }
      },
      // The modal stays OPEN on failure, holding what was typed. Closing it and
      // reporting an error would throw the form away along with the record.
      onError: (error) =>
        toast.error("Could not create that client", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        }),
    });
  };

  const handleCreateBooking = async (bookingData: NewBooking) => {
    try {
      // The id comes back from the database. It used to be
      // `max(existing ids) + 1` over the fixture array, so the number in the
      // toast belonged to nothing and collided with a real booking the moment
      // one existed.
      const created = await bookingMutations.create(
        bookingData,
        currentLocationId,
      );
      await queryClient.invalidateQueries({ queryKey: ["bookings"] });

      // The Undo that used to be here spliced the booking out of local state.
      // Against the database there is no undo to offer: bookings have no DELETE
      // policy on purpose — a booking is cancelled, not erased — so the button
      // is gone rather than made to look like it worked.
      toast.success(`Booking #${created.id} created`, {
        description: `${bookingData.service} booking has been created successfully.`,
      });
    } catch (error) {
      toast.error("Could not create that booking", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handleQuickDaycareCheckIn = () => {
    toast.info("Quick daycare check-in feature coming soon", {
      description: t("This feature is not yet implemented."),
    });
  };

  return (
    <>
      <TooltipProvider delayDuration={150}>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  id="facility-create-new-trigger"
                  className="h-10 gap-1.5 rounded-xl bg-indigo-600 px-3 text-white hover:bg-indigo-700"
                  aria-label={t("Create")}
                >
                  <Plus className="size-4" />
                  <span className="text-sm font-medium">{t("New")}</span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              {t("Create")}
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-56">
            {canNewClient && (
              <DropdownMenuItem
                onClick={() => setIsCreateClientModalOpen(true)}
              >
                <User className="mr-2 size-4" />
                {t("New Client")}
              </DropdownMenuItem>
            )}
            {canNewBooking && (
              <DropdownMenuItem
                onClick={() =>
                  openBookingModal({
                    // Unfiltered: clientQueries.all() is already RLS-scoped to
                    // the caller's facility. The old `c.facility === name`
                    // filter compared a fixture STRING, so a real client whose
                    // stored facility label differed by a character vanished
                    // from the picker with no way to tell.
                    clients,
                    facilityId: facilityId,
                    facilityName: profile.businessName || "your facility",
                    onCreateBooking: handleCreateBooking,
                    preSelectedService: sectionService,
                    lockService: !!sectionService,
                  })
                }
              >
                <Calendar className="mr-2 size-4" />
                {t("New Booking")}
              </DropdownMenuItem>
            )}
            {canRetailSale && (
              <DropdownMenuItem
                onClick={() => {
                  window.location.href =
                    "/facility/dashboard/services/retail?mode=new-sale";
                }}
              >
                <ShoppingBag className="mr-2 size-4" />
                {t("Retail Sale")}
              </DropdownMenuItem>
            )}
            {canNewEstimate && (
              <DropdownMenuItem
                onClick={() => {
                  openBookingModal({
                    // Unfiltered: clientQueries.all() is already RLS-scoped to
                    // the caller's facility. The old `c.facility === name`
                    // filter compared a fixture STRING, so a real client whose
                    // stored facility label differed by a character vanished
                    // from the picker with no way to tell.
                    clients,
                    facilityId: facilityId,
                    facilityName: profile.businessName || "your facility",
                    onCreateBooking: handleCreateBooking,
                    isEstimateMode: true,
                    preSelectedService: sectionService,
                    lockService: !!sectionService,
                  });
                }}
              >
                <FileText className="mr-2 size-4" />
                {t("New Estimate")}
              </DropdownMenuItem>
            )}
            {canDaycareCheckin && (
              <DropdownMenuItem onClick={handleQuickDaycareCheckIn}>
                <Zap className="mr-2 size-4" />
                {t("Quick Daycare Check-in")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipProvider>

      {/* Create Client Modal — only mounted when the viewer can create clients. */}
      {canNewClient && (
        <CreateClientModal
          open={isCreateClientModalOpen}
          onOpenChange={setIsCreateClientModalOpen}
          onSave={handleCreateClient}
          facilityName={profile.businessName || "your facility"}
        />
      )}
    </>
  );
}
