import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DetailsModal } from "@/components/modals/DetailsModal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EvaluationModal } from "@/components/modals/EvaluationModal";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/use-settings";
import {
  Calendar,
  DollarSign,
  User,
  Heart,
  Clock,
  CheckCircle,
  MapPin,
  Phone,
  Mail,
  AlertCircle,
  FileText,
  Pill,
  Utensils,
  Scissors,
  Home,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { bookings } from "@/data/bookings";
import { clients } from "@/data/clients";
import { useState } from "react";
import Link from "next/link";
import type { Evaluation } from "@/types/pet";
import { getYipyyGoConfig } from "@/data/yipyygo-config";
import { getYipyyGoDisplayStatus } from "@/data/yipyygo-forms";
import { YipyyGoStatusBadge } from "@/components/yipyygo/YipyyGoStatusBadge";

interface BookingModalProps {
  booking: (typeof bookings)[number];
}

const calculateDuration = (startDate: string, endDate: string): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 0
    ? "Same day"
    : `${diffDays + 1} day${diffDays > 0 ? "s" : ""}`;
};

export function BookingModal({ booking }: BookingModalProps) {
  const client = clients.find((c) => c.id === booking.clientId);
  const pet = client?.pets.find((p) => p.id === booking.petId);
  const duration = calculateDuration(booking.startDate, booking.endDate);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const { daycare, boarding } = useSettings();

  const requiresEvaluationForService =
    (booking.service === "daycare" &&
      daycare.settings.evaluation.enabled &&
      daycare.settings.evaluation.optional === false) ||
    (booking.service === "boarding" &&
      boarding.settings.evaluation.enabled &&
      boarding.settings.evaluation.optional === false);

  const hasPassedEvaluation =
    !!pet &&
    "evaluations" in pet &&
    Array.isArray((pet as { evaluations?: Evaluation[] }).evaluations) &&
    ((pet as { evaluations?: Evaluation[] }).evaluations ?? []).some(
      (evaluation) => evaluation.status === "passed",
    );

  const tasks: Array<{
    id: string;
    type: string;
    title: string;
    time: string | null;
    details: string;
    icon: LucideIcon;
  }> = [];

  // Generate tasks from booking data
  if (booking.feedingSchedule) {
    booking.feedingSchedule.forEach((feed) => {
      tasks.push({
        id: `feed-${feed.id}`,
        type: "feeding",
        title: `Feed ${feed.occasions?.[0]?.label || "Feeding"}`,
        time: feed.occasions?.[0]?.time || "",
        details: feed.prepInstructions?.join(", ") || "",
        icon: Utensils,
      });
    });
  }

  if (booking.medications) {
    booking.medications.forEach((med) => {
      med.times.forEach((time: string) => {
        tasks.push({
          id: `med-${med.id}-${time}`,
          type: "medication",
          title: `Give ${med.name}`,
          time,
          details: med.adminInstructions?.join(", ") || "",
          icon: Pill,
        });
      });
    });
  }

  if (booking.extraServices) {
    booking.extraServices.forEach((service, index) => {
      // Handle both string[] (grooming) and ExtraService[] (daycare/boarding) types
      if (typeof service === "string") {
        // For string type (grooming), use the string as service name
        const petId = Array.isArray(booking.petId)
          ? booking.petId[0]
          : booking.petId;
        tasks.push({
          id: `service-${service}-${petId}-${index}`,
          type: "service",
          title: `Perform ${service}`,
          time: null,
          details: "Extra service",
          icon: Scissors,
        });
      } else {
        // For ExtraService object type (daycare/boarding)
        tasks.push({
          id: `service-${service.serviceId}-${service.petId}`,
          type: "service",
          title: `Perform ${service.serviceId} service`,
          time: null,
          details: `Quantity: ${service.quantity}`,
          icon: Scissors,
        });
      }
    });
  }

  if (booking.service === "boarding" && booking.walkSchedule) {
    tasks.push({
      id: "walk-schedule",
      type: "walking",
      title: "Walk Schedule",
      time: null,
      details: booking.walkSchedule,
      icon: Clock,
    });
  }

  return (
    <DetailsModal
      title={`Booking #${booking.id}`}
      badges={[
        <StatusBadge
          key="status"
          type="status"
          value={booking.status}
          showIcon
        />,
        <StatusBadge
          key="payment"
          type="status"
          value={booking.paymentStatus}
          showIcon
        />,
      ]}
      linkHref={`/facility/dashboard/bookings/${booking.id}`}
      linkText="View Full Details"
    >
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          {requiresEvaluationForService && !hasPassedEvaluation && (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowEvaluationModal(true)}>
                Add Evaluation to This Stay
              </Button>
            </div>
          )}

          {/* Overview Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card className="border-blue-200 bg-linear-to-br from-blue-50 to-blue-100">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-500 p-2">
                    <Calendar className="size-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900">Service</p>
                    <p className="text-lg font-bold text-blue-700 capitalize">
                      {booking.service}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-linear-to-br from-green-50 to-green-100">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-500 p-2">
                    <Clock className="size-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      Duration
                    </p>
                    <p className="text-lg font-bold text-green-700">
                      {duration}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-linear-to-br from-purple-50 to-purple-100">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-500 p-2">
                    <DollarSign className="size-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-900">
                      Total Cost
                    </p>
                    <p className="text-lg font-bold text-purple-700">
                      ${booking.totalCost}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-linear-to-br from-orange-50 to-orange-100">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-orange-500 p-2">
                    <CheckCircle className="size-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-orange-900">
                      Status
                    </p>
                    <Badge
                      variant="outline"
                      className="font-semibold capitalize"
                    >
                      {booking.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Yipyy Express Check-in (when enabled for this service) */}
          {(() => {
            const yipyyGoConfig = getYipyyGoConfig(booking.facilityId);
            const serviceType = booking.service?.toLowerCase() as
              | "daycare"
              | "boarding"
              | "grooming"
              | "training";
            const enabled =
              yipyyGoConfig?.enabled &&
              yipyyGoConfig?.serviceConfigs?.find(
                (s) => s.serviceType === serviceType,
              )?.enabled;
            if (!enabled) return null;
            const yipyyGoStatus = getYipyyGoDisplayStatus(booking.id);
            const canReview =
              yipyyGoStatus === "submitted" || yipyyGoStatus === "needs_review";
            return (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="text-primary size-4" />
                    Yipyy Express Check-in
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2">
                  <YipyyGoStatusBadge status={yipyyGoStatus} showIcon />
                  {canReview && (
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href={`/facility/dashboard/bookings/${booking.id}#yipyygo`}
                      >
                        Review
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {/* Schedule Section */}
          <Card className="overflow-hidden">
            <CardHeader className="from-primary/5 to-primary/10 bg-linear-to-r">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="text-primary size-5" />
                Schedule & Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="rounded-full bg-blue-500 p-2">
                      <Clock className="size-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        Start Date
                      </p>
                      <p className="text-lg font-bold text-blue-700">
                        {booking.startDate}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
                    <div className="rounded-full bg-green-500 p-2">
                      <CheckCircle className="size-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-900">
                        End Date
                      </p>
                      <p className="text-lg font-bold text-green-700">
                        {booking.endDate}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-lg border border-purple-200 bg-purple-50 p-4">
                    <div className="rounded-full bg-purple-500 p-2">
                      <MapPin className="size-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-purple-900">
                        Check-in Time
                      </p>
                      <p className="text-lg font-bold text-purple-700">
                        {booking.checkInTime || "Not specified"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
                    <div className="rounded-full bg-orange-500 p-2">
                      <MapPin className="size-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-orange-900">
                        Check-out Time
                      </p>
                      <p className="text-lg font-bold text-orange-700">
                        {booking.checkOutTime || "Not specified"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client & Pet Information */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader className="bg-linear-to-r from-green-50 to-green-100">
                <CardTitle className="flex items-center gap-2">
                  <User className="size-5 text-green-600" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {client ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex size-12 items-center justify-center rounded-full bg-green-100">
                        <User className="size-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">{client.name}</h3>
                        <p className="text-muted-foreground text-sm">
                          {client.status}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Mail className="text-muted-foreground size-4" />
                        <span className="text-sm">{client.email}</span>
                      </div>
                      {client.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="text-muted-foreground size-4" />
                          <span className="text-sm">{client.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <User className="text-muted-foreground mx-auto mb-2 size-12" />
                    <p className="text-muted-foreground">
                      Client information not found
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="bg-linear-to-r from-pink-50 to-pink-100">
                <CardTitle className="flex items-center gap-2">
                  <Heart className="size-5 text-pink-600" />
                  Pet Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {pet ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex size-12 items-center justify-center rounded-full bg-pink-100">
                        <Heart className="size-6 text-pink-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">{pet.name}</h3>
                        <p className="text-muted-foreground text-sm">
                          {pet.type} • {pet.breed}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-muted-foreground text-xs">Age</p>
                        <p className="font-semibold">
                          {pet.age} {pet.age === 1 ? "year" : "years"}
                        </p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-muted-foreground text-xs">Weight</p>
                        <p className="font-semibold">{pet.weight} lbs</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-muted-foreground text-xs">Color</p>
                        <p className="font-semibold">{pet.color}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-muted-foreground text-xs">
                          Microchip
                        </p>
                        <p className="font-mono text-xs font-semibold">
                          {pet.microchip}
                        </p>
                      </div>
                    </div>
                    {(pet.allergies !== "None" ||
                      pet.specialNeeds !== "None") && (
                      <div className="space-y-2">
                        {pet.allergies !== "None" && (
                          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                            <AlertCircle className="mt-0.5 size-4 text-red-500" />
                            <div>
                              <p className="text-sm font-medium text-red-900">
                                Allergies
                              </p>
                              <p className="text-sm text-red-700">
                                {pet.allergies}
                              </p>
                            </div>
                          </div>
                        )}
                        {pet.specialNeeds !== "None" && (
                          <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                            <FileText className="mt-0.5 size-4 text-yellow-500" />
                            <div>
                              <p className="text-sm font-medium text-yellow-900">
                                Special Needs
                              </p>
                              <p className="text-sm text-yellow-700">
                                {pet.specialNeeds}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <Heart className="text-muted-foreground mx-auto mb-2 size-12" />
                    <p className="text-muted-foreground">
                      Pet information not found
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Service-Specific Details */}
          {(booking.service === "boarding" ||
            booking.service === "daycare") && (
            <Card className="overflow-hidden">
              <CardHeader className="bg-linear-to-r from-indigo-50 to-indigo-100">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="size-5 text-indigo-600" />
                  Service Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {booking.service === "boarding" && (
                  <div className="space-y-6">
                    {booking.kennel && (
                      <div className="flex items-center gap-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                        <div className="rounded-lg bg-blue-500 p-2">
                          <Home className="size-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-900">
                            Assigned Kennel
                          </p>
                          <p className="text-lg font-bold text-blue-700">
                            {booking.kennel}
                          </p>
                        </div>
                      </div>
                    )}
                    {booking.walkSchedule && (
                      <div className="flex items-center gap-4 rounded-lg border border-green-200 bg-green-50 p-4">
                        <div className="rounded-lg bg-green-500 p-2">
                          <Clock className="size-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-green-900">
                            Walk Schedule
                          </p>
                          <p className="text-lg font-bold text-green-700">
                            {booking.walkSchedule}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {booking.service === "daycare" &&
                  booking.daycareSelectedDates && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="mb-3 text-lg font-semibold">
                          Scheduled Dates
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {booking.daycareSelectedDates.map((date) => (
                            <div
                              key={date}
                              className="border-primary/20 bg-primary/10 flex items-center gap-2 rounded-lg border px-3 py-2"
                            >
                              <Calendar className="text-primary size-4" />
                              <span className="font-medium">{date}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          )}

          {/* Special Requests */}
          {booking.specialRequests && (
            <Card className="overflow-hidden">
              <CardHeader className="bg-linear-to-r from-amber-50 to-amber-100">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="size-5 text-amber-600" />
                  Special Requests & Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="leading-relaxed text-amber-900">
                    {booking.specialRequests}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Summary */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-linear-to-r from-emerald-50 to-emerald-100">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="size-5 text-emerald-600" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
                  <p className="text-sm text-emerald-700">Base Price</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    ${booking.basePrice}
                  </p>
                </div>
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-center">
                  <p className="text-sm text-orange-700">Discount</p>
                  <p className="text-2xl font-bold text-orange-600">
                    ${booking.discount}
                  </p>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
                  <p className="text-sm text-blue-700">Total</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${booking.totalCost}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 p-4">
                <span className="font-medium">Payment Status</span>
                <StatusBadge type="status" value={booking.paymentStatus} />
              </div>
              {booking.discountReason && (
                <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Discount Reason:</strong> {booking.discountReason}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <div className="space-y-4">
            {tasks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <CheckCircle className="text-muted-foreground/50 mb-4 h-16 w-16" />
                  <h3 className="mb-2 text-lg font-semibold">No Tasks</h3>
                  <p className="text-muted-foreground text-center">
                    This booking does not have any scheduled tasks.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-muted rounded-lg p-2">
                          <task.icon className="size-4" />
                        </div>
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <h4 className="font-medium">{task.title}</h4>
                            <Badge
                              variant="outline"
                              className="text-xs capitalize"
                            >
                              {task.type.replace("_", " ")}
                            </Badge>
                          </div>
                          {task.time && (
                            <p className="text-muted-foreground mb-1 text-sm">
                              Time: {task.time}
                            </p>
                          )}
                          <p className="text-sm">{task.details}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      <EvaluationModal
        isOpen={showEvaluationModal}
        onClose={() => setShowEvaluationModal(false)}
        bookingId={booking.id}
      />
    </DetailsModal>
  );
}
