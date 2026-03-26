"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCustomServices } from "@/hooks/use-custom-services";
import { LogIn, LogOut, Clock, PawPrint } from "lucide-react";

type CheckInStatus = "scheduled" | "checked-in" | "checked-out";

interface CheckInEntry {
  id: string;
  petName: string;
  petBreed: string;
  clientName: string;
  scheduledTime: string;
  status: CheckInStatus;
}

const MOCK_ENTRIES: CheckInEntry[] = [
  {
    id: "ci1",
    petName: "Bella",
    petBreed: "Golden Retriever",
    clientName: "Sarah Johnson",
    scheduledTime: "9:00 AM",
    status: "checked-in",
  },
  {
    id: "ci2",
    petName: "Max",
    petBreed: "Labrador Mix",
    clientName: "Tom Williams",
    scheduledTime: "10:30 AM",
    status: "scheduled",
  },
  {
    id: "ci3",
    petName: "Luna",
    petBreed: "Poodle",
    clientName: "Emma Davis",
    scheduledTime: "1:00 PM",
    status: "scheduled",
  },
  {
    id: "ci4",
    petName: "Daisy",
    petBreed: "Beagle",
    clientName: "Jessica Lee",
    scheduledTime: "3:30 PM",
    status: "checked-out",
  },
];

const STATUS_CONFIG: Record<
  CheckInStatus,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  scheduled: { label: "Scheduled", variant: "secondary" },
  "checked-in": { label: "Checked In", variant: "default" },
  "checked-out": { label: "Checked Out", variant: "outline" },
};

export default function CustomServiceCheckInPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const { getModuleBySlug } = useCustomServices();
  const serviceModule = getModuleBySlug(slug ?? "");

  const [entries, setEntries] = useState<CheckInEntry[]>(MOCK_ENTRIES);

  const { checkedIn, scheduled, checkedOut } = useMemo(() => {
    let ci = 0,
      sc = 0,
      co = 0;
    for (const e of entries) {
      if (e.status === "checked-in") ci++;
      else if (e.status === "scheduled") sc++;
      else if (e.status === "checked-out") co++;
    }
    return { checkedIn: ci, scheduled: sc, checkedOut: co };
  }, [entries]);

  if (!serviceModule) return null;

  const handleCheckIn = (id: string) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id && e.status === "scheduled"
          ? { ...e, status: "checked-in" }
          : e,
      ),
    );
  };

  const handleCheckOut = (id: string) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id && e.status === "checked-in"
          ? { ...e, status: "checked-out" }
          : e,
      ),
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Check-In / Check-Out</h2>
        <p className="text-muted-foreground text-sm">
          Manage arrivals and departures for {serviceModule.name} today
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Currently In</p>
                <p className="text-2xl font-bold">{checkedIn}</p>
              </div>
              <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
                <LogIn className="text-primary h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Upcoming</p>
                <p className="text-2xl font-bold">{scheduled}</p>
              </div>
              <div className="bg-secondary/50 flex h-12 w-12 items-center justify-center rounded-full">
                <Clock className="text-muted-foreground h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Completed</p>
                <p className="text-2xl font-bold">{checkedOut}</p>
              </div>
              <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
                <LogOut className="text-muted-foreground h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Booking List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Clock className="h-5 w-5" />
            Today&apos;s Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {entries.map((entry) => {
              const statusCfg = STATUS_CONFIG[entry.status];
              return (
                <div
                  key={entry.id}
                  className="bg-card hover:bg-muted/30 flex items-center justify-between rounded-lg border p-4 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Pet photo placeholder */}
                    <div className="bg-primary/10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
                      <PawPrint className="text-primary h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold">{entry.petName}</p>
                      <p className="text-muted-foreground text-sm">
                        {entry.petBreed}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {entry.clientName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {entry.scheduledTime}
                      </p>
                      <Badge variant={statusCfg.variant} className="mt-1">
                        {statusCfg.label}
                      </Badge>
                    </div>

                    <div className="flex gap-2">
                      {entry.status === "scheduled" && (
                        <Button
                          size="sm"
                          onClick={() => handleCheckIn(entry.id)}
                          className="gap-1"
                        >
                          <LogIn className="h-3.5 w-3.5" />
                          Check In
                        </Button>
                      )}
                      {entry.status === "checked-in" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCheckOut(entry.id)}
                          className="gap-1"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Check Out
                        </Button>
                      )}
                      {entry.status === "checked-out" && (
                        <Button size="sm" variant="ghost" disabled>
                          Done
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
