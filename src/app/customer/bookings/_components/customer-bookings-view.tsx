"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, CircleAlert, Plus, SearchX } from "lucide-react";

import { CustomerUnfinishedBookings } from "@/components/bookings/CustomerUnfinishedBookings";
import {
  BookingNoteDialog,
  type BookingNoteKind,
} from "@/components/customer/BookingNoteDialog";
import { CancelBookingDialog } from "@/components/customer/CancelBookingDialog";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { RouteState } from "@/components/ui/route-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { useCurrentCustomer } from "@/lib/api/current-customer";
import { customerBookingQueries } from "@/lib/api/customer-bookings";
import { unfinishedBookingQueries } from "@/lib/api/unfinished-bookings";
import { bookingTiming } from "@/lib/bookings/booking-timing";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { useHydrated } from "@/hooks/use-hydrated";
import { localToday } from "@/lib/vaccinations";
import type { Booking } from "@/types/booking";
import type { UnfinishedBooking } from "@/types/unfinished-booking";

import { BookingCard, petOf, type BookingCardPet } from "./booking-card";
import { BookingFilters, type ServiceFilter } from "./BookingFilters";

// ============================================================================
// The customer's bookings — theirs, read from Postgres, in their own calendar.
//
// Today's booking is under Upcoming until its last day is over (see
// lib/bookings/booking-timing.ts): it used to move to Past at midnight UTC,
// and take its check-in code with it. A load that fails says so and offers a
// retry; it never shows an empty list that looks like "no bookings".
// ============================================================================

const NO_BOOKINGS: Booking[] = [];
const NO_UNFINISHED: UnfinishedBooking[] = [];

export function CustomerBookingsView() {
  const { t, fill } = useCustomerText("bookings");
  const hydrated = useHydrated();
  // The viewer's own day. Before hydration the server's day would be used,
  // which is the wrong calendar for anyone not in UTC; the lists wait.
  const today = hydrated ? localToday() : "";

  const { selectedFacility } = useCustomerFacility();
  const { client: customer } = useCurrentCustomer();
  const customerId = customer?.id;
  const customerPets = customer?.pets;
  const pets: BookingCardPet[] = useMemo(
    () =>
      (customerPets ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        imageUrl: p.imageUrl,
      })),
    [customerPets],
  );

  const current = useQuery({
    ...customerBookingQueries.current(today),
    enabled: today !== "",
  });
  const recent = useQuery({
    ...customerBookingQueries.recent(today),
    enabled: today !== "",
  });
  const { data: myUnfinished } = useQuery(unfinishedBookingQueries.mine());
  const unfinished = useMemo(
    () =>
      customerId == null
        ? NO_UNFINISHED
        : (myUnfinished ?? NO_UNFINISHED).filter(
            (ub) => ub.clientId === customerId,
          ),
    [customerId, myUnfinished],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>("all");
  const [toNote, setToNote] = useState<{
    booking: Booking;
    petName: string;
    kind: BookingNoteKind;
  } | null>(null);
  const [toCancel, setToCancel] = useState<{
    booking: Booking;
    petName: string;
  } | null>(null);

  const all = useMemo(() => {
    const byRef = new Map<number, Booking>();
    for (const b of [
      ...(recent.data ?? NO_BOOKINGS),
      ...(current.data ?? NO_BOOKINGS),
    ]) {
      byRef.set(b.id, b);
    }
    return [...byRef.values()];
  }, [current.data, recent.data]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return all.filter((b) => {
      if (serviceFilter !== "all" && b.service.toLowerCase() !== serviceFilter)
        return false;
      if (!q) return true;
      const pet = petOf(b, pets);
      return (
        b.service.toLowerCase().includes(q) ||
        (b.serviceType?.toLowerCase().includes(q) ?? false) ||
        (pet?.name.toLowerCase().includes(q) ?? false) ||
        String(b.id).includes(q)
      );
    });
  }, [all, pets, searchQuery, serviceFilter]);

  const { upcoming, past } = useMemo(() => {
    const up: Booking[] = [];
    const done: Booking[] = [];
    for (const b of filtered) {
      (bookingTiming(b, today) === "past" ? done : up).push(b);
    }
    up.sort((a, b) => a.startDate.localeCompare(b.startDate));
    done.sort((a, b) => b.startDate.localeCompare(a.startDate));
    return { upcoming: up, past: done };
  }, [filtered, today]);

  const loading = today === "" || current.isPending || recent.isPending;
  const failed = current.isError || recent.isError;
  const filtersActive = searchQuery.trim() !== "" || serviceFilter !== "all";

  const list = (items: Booking[], emptyTitle: string, emptyText: string) => {
    if (failed) {
      return (
        <RouteState
          surface="card"
          pose="error"
          icon={CircleAlert}
          inkClassName="text-destructive"
          title={t("loadFailedTitle")}
          description={t("loadFailedText")}
          action={{
            label: t("tryAgain"),
            onClick: () => {
              void current.refetch();
              void recent.refetch();
            },
          }}
        />
      );
    }
    if (loading) {
      return (
        <div className="grid gap-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-2xl" />
          ))}
        </div>
      );
    }
    if (items.length === 0) {
      return filtersActive ? (
        <RouteState
          surface="card"
          pose="searching"
          icon={SearchX}
          inkClassName="text-ink-secondary"
          title={t("noMatchTitle")}
          description={t("clearFilters")}
          action={{
            label: t("clearFiltersAction"),
            onClick: () => {
              setSearchQuery("");
              setServiceFilter("all");
            },
          }}
        />
      ) : (
        <RouteState
          surface="card"
          pose="waiting"
          icon={CalendarCheck}
          inkClassName="text-ink-secondary"
          title={emptyTitle}
          description={emptyText}
        />
      );
    }
    return (
      <div className="grid gap-3">
        {items.map((booking) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            pets={pets}
            facilityName={selectedFacility?.name}
            today={today}
            onCancel={(b, petName) => setToCancel({ booking: b, petName })}
            onNote={(b, petName, kind) =>
              setToNote({ booking: b, petName, kind })
            }
          />
        ))}
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        action={
          <Button size="prominent" asChild>
            <Link href="/customer/bookings/new">
              <Plus className="size-4" aria-hidden />
              {t("bookService")}
            </Link>
          </Button>
        }
      />

      <BookingFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        serviceFilter={serviceFilter}
        onServiceFilterChange={setServiceFilter}
      />

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList>
          <TabsTrigger value="upcoming">
            {loading
              ? t("tabUpcomingPlain")
              : fill("tabUpcoming", { count: upcoming.length })}
          </TabsTrigger>
          <TabsTrigger value="past">
            {loading
              ? t("tabPastPlain")
              : fill("tabPast", { count: past.length })}
          </TabsTrigger>
          {unfinished.length > 0 && (
            <TabsTrigger value="unfinished">
              {fill("tabUnfinishedCount", { count: unfinished.length })}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="upcoming" className="pt-4">
          {list(upcoming, t("noUpcoming"), t("bookFirstService"))}
        </TabsContent>
        <TabsContent value="past" className="pt-4">
          {list(past, t("noPast"), t("pastEmptyHelp"))}
        </TabsContent>
        {unfinished.length > 0 && (
          <TabsContent value="unfinished" className="pt-4">
            <CustomerUnfinishedBookings bookings={unfinished} />
          </TabsContent>
        )}
      </Tabs>

      <BookingNoteDialog
        open={toNote !== null}
        onOpenChange={(open) => {
          if (!open) setToNote(null);
        }}
        kind={toNote?.kind ?? "note"}
        booking={toNote?.booking ?? null}
        petName={toNote?.petName}
      />
      <CancelBookingDialog
        open={toCancel !== null}
        onOpenChange={(open) => {
          if (!open) setToCancel(null);
        }}
        booking={toCancel?.booking ?? null}
        petName={toCancel?.petName}
      />
    </div>
  );
}
