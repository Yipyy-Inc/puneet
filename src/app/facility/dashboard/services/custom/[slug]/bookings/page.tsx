"use client";

import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCustomServices } from "@/hooks/use-custom-services";
import { CalendarDays, Plus } from "lucide-react";

type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

interface MockBooking {
  id: string;
  date: string;
  time: string;
  client: string;
  pet: string;
  duration: string;
  status: BookingStatus;
  amount: number;
}

const MOCK_BOOKINGS: MockBooking[] = [
  {
    id: "b001",
    date: "Mar 19, 2026",
    time: "9:00 AM",
    client: "Sarah Johnson",
    pet: "Bella",
    duration: "60 min",
    status: "confirmed",
    amount: 40,
  },
  {
    id: "b002",
    date: "Mar 19, 2026",
    time: "10:30 AM",
    client: "Tom Williams",
    pet: "Max",
    duration: "30 min",
    status: "pending",
    amount: 25,
  },
  {
    id: "b003",
    date: "Mar 19, 2026",
    time: "1:00 PM",
    client: "Emma Davis",
    pet: "Luna",
    duration: "60 min",
    status: "confirmed",
    amount: 40,
  },
  {
    id: "b004",
    date: "Mar 18, 2026",
    time: "3:00 PM",
    client: "Mike Brown",
    pet: "Charlie",
    duration: "30 min",
    status: "completed",
    amount: 25,
  },
  {
    id: "b005",
    date: "Mar 18, 2026",
    time: "11:00 AM",
    client: "Jessica Lee",
    pet: "Daisy",
    duration: "60 min",
    status: "completed",
    amount: 40,
  },
  {
    id: "b006",
    date: "Mar 17, 2026",
    time: "2:00 PM",
    client: "Robert Garcia",
    pet: "Rocky",
    duration: "60 min",
    status: "cancelled",
    amount: 40,
  },
  {
    id: "b007",
    date: "Mar 17, 2026",
    time: "9:30 AM",
    client: "Amanda Wilson",
    pet: "Coco",
    duration: "30 min",
    status: "confirmed",
    amount: 25,
  },
];

const STATUS_CONFIG: Record<
  BookingStatus,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
  }
> = {
  confirmed: { label: "Confirmed", variant: "default" },
  pending: { label: "Pending", variant: "secondary" },
  completed: { label: "Completed", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export default function CustomServiceBookingsPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const { getModuleBySlug } = useCustomServices();
  const serviceModule = getModuleBySlug(slug ?? "");

  if (!serviceModule) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Bookings</h2>
          <p className="text-muted-foreground text-sm">
            All bookings for {serviceModule.name}
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="size-4" />
          New Booking
        </Button>
      </div>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <CalendarDays className="size-5" />
            All Bookings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                    Date
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                    Client
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                    Pet
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                    Duration
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                    Status
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-right font-medium">
                    Amount
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {MOCK_BOOKINGS.map((booking) => {
                  const statusCfg = STATUS_CONFIG[booking.status];
                  return (
                    <tr
                      key={booking.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{booking.date}</p>
                          <p className="text-muted-foreground text-xs">
                            {booking.time}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {booking.client}
                      </td>
                      <td className="text-muted-foreground px-4 py-3">
                        {booking.pet}
                      </td>
                      <td className="text-muted-foreground px-4 py-3">
                        {booking.duration}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusCfg.variant}>
                          {statusCfg.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        ${booking.amount}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
