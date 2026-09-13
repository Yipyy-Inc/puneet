"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert, CircleHelp, FileText, LoaderCircle } from "lucide-react";

import { RouteState } from "@/components/ui/route-state";
import { useCurrentCustomer } from "@/lib/api/current-customer";
import {
  customerYipyyGoBookingQueries,
  type YipyyGoRequestError,
} from "@/lib/api/customer-yipyy-go";
import { useCustomerText } from "@/lib/customer/use-customer-text";

import { FormClosedPanel } from "./form-closed-panel";
import { FormHeader } from "./form-header";
import { PetForm } from "./pet-form";

// ============================================================================
// The owner's pre-arrival form: one booking, one pet at a time.
//
// It replaces a page that looked the booking up in src/data/bookings, so every
// real booking was "not found"; that faked a sign-in with a verification code
// it wrote to the console; computed the deadline in the browser, and skipped
// it in development; saved to a fixture keyed by booking alone, so a second
// pet overwrote the first; and announced a confirmation email nothing sent.
//
// Now the booking, its pets, the facility's template for the service and
// whether each pet's form can still change all come from
// /api/customer/yipyy-go/bookings/[ref]. Each form saves a draft as the owner
// moves through it and is sent through the submit route, which checks it
// against the same template.
// ============================================================================

const SATISFIED = new Set(["submitted", "approved", "completed_by_staff"]);

export function YipyyGoForm({
  bookingRef,
  petRef,
}: {
  bookingRef: number;
  petRef: number | null;
}) {
  const { t } = useCustomerText("yipyygo");
  const router = useRouter();
  const query = useQuery(customerYipyyGoBookingQueries.booking(bookingRef));
  const { client, resolved } = useCurrentCustomer();
  const bookingHref = `/customer/bookings/${bookingRef}`;

  let body;
  if (query.isPending || !resolved) {
    body = (
      <RouteState
        surface="card"
        pose="loading"
        icon={LoaderCircle}
        inkClassName="text-primary"
        title={t("loadingTitle")}
        description={t("loadingText")}
        spin
      />
    );
  } else if (query.isError) {
    body =
      (query.error as YipyyGoRequestError).status === 404 ? (
        <RouteState
          surface="card"
          pose="confused"
          icon={CircleHelp}
          inkClassName="text-ink-secondary"
          title={t("bookingNotFound")}
          description={t("notFoundText")}
          action={{ label: t("backToBookings"), href: "/customer/bookings" }}
        />
      ) : (
        <RouteState
          surface="card"
          pose="error"
          icon={CircleAlert}
          inkClassName="text-destructive"
          title={t("loadFailedTitle")}
          description={t("loadFailedText")}
          action={{
            label: t("loadAgain"),
            onClick: () => void query.refetch(),
          }}
        />
      );
  } else if (!query.data.requirement || query.data.pets.length === 0) {
    body = (
      <RouteState
        surface="card"
        pose="sleeping"
        icon={FileText}
        inkClassName="text-ink-secondary"
        title={t("notNeededTitle")}
        description={t("notNeededText")}
        action={{ label: t("backToBooking"), href: bookingHref }}
      />
    );
  } else {
    const data = query.data;
    const pet =
      data.pets.find((candidate) => candidate.ref === petRef) ??
      data.pets.find(
        (candidate) =>
          candidate.editable &&
          !SATISFIED.has(candidate.submission?.status ?? ""),
      ) ??
      data.pets[0];
    const selectPet = (ref: number) =>
      router.replace(`${bookingHref}/yipyygo-form?pet=${ref}`, {
        scroll: false,
      });

    body = (
      <>
        <FormHeader data={data} pet={pet} />
        {pet.editable ? (
          <PetForm
            key={pet.ref}
            data={data}
            pet={pet}
            customer={client}
            onSelectPet={selectPet}
          />
        ) : (
          <FormClosedPanel
            key={pet.ref}
            data={data}
            pet={pet}
            fetchedAt={query.dataUpdatedAt}
            onSelectPet={selectPet}
          />
        )}
      </>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">{body}</div>
  );
}
