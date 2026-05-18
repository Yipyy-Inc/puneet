"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Inbox, PawPrint } from "lucide-react";
import { trainingQueries } from "@/lib/api/training";
import { clients } from "@/data/clients";
import {
  buildPetTrainingDashboard,
  pickEligiblePets,
} from "@/lib/customer-training-dashboard";
import { CustomerPetTrainingDashboard } from "./customer-pet-training-dashboard";

interface Props {
  customerId: number;
}

export function CustomerMyPetsTab({ customerId }: Props) {
  // Pin "now" once at mount so React Compiler doesn't flag Date reads in
  // downstream useMemos. Matches the homework + report-cards pattern.
  const [nowMs] = useState(() => Date.now());
  const todayISO = useMemo(
    () => new Date(nowMs).toISOString().split("T")[0]!,
    [nowMs],
  );

  const { data: enrollments = [] } = useQuery(
    trainingQueries.allSeriesEnrollments(),
  );
  const { data: seriesList = [] } = useQuery(trainingQueries.series());
  const { data: attendances = [] } = useQuery(
    trainingQueries.allAttendances(),
  );
  const { data: homework = [] } = useQuery(trainingQueries.allHomework());
  const { data: packages = [] } = useQuery(
    trainingQueries.clientTrainingPackagesForClient(customerId),
  );

  const customer = useMemo(
    () => clients.find((c) => c.id === customerId),
    [customerId],
  );

  const eligiblePets = useMemo(() => {
    if (!customer) return [];
    return pickEligiblePets(customer.pets, enrollments, customerId);
  }, [customer, enrollments, customerId]);

  const dashboards = useMemo(() => {
    if (!customer) return [];
    return eligiblePets.map((pet) =>
      buildPetTrainingDashboard({
        pet,
        ownerName: customer.name,
        enrollments,
        seriesList,
        attendances,
        homework,
        packages,
        todayISO,
        nowMs,
      }),
    );
  }, [
    eligiblePets,
    customer,
    enrollments,
    seriesList,
    attendances,
    homework,
    packages,
    todayISO,
    nowMs,
  ]);

  if (!customer || customer.pets.length === 0) {
    return (
      <div className="text-muted-foreground rounded-xl border border-dashed py-16 text-center text-sm">
        <Inbox className="text-muted-foreground/30 mx-auto mb-2 size-8" />
        Add a pet to your profile to see their training dashboard here.
      </div>
    );
  }

  if (dashboards.length === 0) {
    return (
      <div className="text-muted-foreground rounded-xl border border-dashed py-16 text-center text-sm">
        <PawPrint className="text-muted-foreground/30 mx-auto mb-2 size-8" />
        <p>
          No training history for {customer.pets.map((p) => p.name).join(" or ")} yet.
        </p>
        <Button asChild size="sm" className="mt-4">
          <Link href="/customer/training?tab=classes">Browse Training Classes</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {dashboards.map((d) => (
        <CustomerPetTrainingDashboard
          key={d.pet.id}
          dashboard={d}
          todayISO={todayISO}
          nowMs={nowMs}
        />
      ))}
    </div>
  );
}
