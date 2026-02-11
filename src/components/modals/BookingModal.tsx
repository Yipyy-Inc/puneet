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
import type { Evaluation } from "@/lib/types";

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
        title: `Feed ${feed.name}`,
        time: feed.time,
        details: feed.instructions,
        icon: Utensils,
      });
    });
  }

  if (booking.medications) {
    booking.medications.forEach((med) => {
      med.time.forEach((time) => {
        tasks.push({
          id: `med-${med.id}-${time}`,
          type: "medication",
          title: `Give ${med.name}`,
          time,
          details: med.instructions,
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
        const petId = Array.isArray(booking.petId) ? booking.petId[0] : booking.petId;
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
          <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
            <Card className="bg-linear-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Calendar className="h-5 w-5 text-white" />
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

            <Card className="bg-linear-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <Clock className="h-5 w-5 text-white" />
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

            <Card className="bg-linear-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <DollarSign className="h-5 w-5 text-white" />
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

            <Card className="bg-linear-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-orange-900">
                      Status
                    </p>
                    <Badge
                      variant="outline"
                      className="capitalize font-semibold"
                    >
                      {booking.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Schedule Section */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-linear-to-r from-primary/5 to-primary/10">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Schedule & Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="p-2 bg-blue-500 rounded-full">
                      <Clock className="h-4 w-4 text-white" />
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
                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="p-2 bg-green-500 rounded-full">
                      <CheckCircle className="h-4 w-4 text-white" />
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
                  <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="p-2 bg-purple-500 rounded-full">
                      <MapPin className="h-4 w-4 text-white" />
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
                  <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="p-2 bg-orange-500 rounded-full">
                      <MapPin className="h-4 w-4 text-white" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="overflow-hidden">
              <CardHeader className="bg-linear-to-r from-green-50 to-green-100">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-green-600" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {client ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">{client.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {client.status}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{client.email}</span>
                      </div>
                      {client.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{client.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
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
                  <Heart className="h-5 w-5 text-pink-600" />
                  Pet Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {pet ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                        <Heart className="h-6 w-6 text-pink-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">{pet.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {pet.type} • {pet.breed}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">Age</p>
                        <p className="font-semibold">
                          {pet.age} {pet.age === 1 ? "year" : "years"}
                        </p>
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">Weight</p>
                        <p className="font-semibold">{pet.weight} lbs</p>
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">Color</p>
                        <p className="font-semibold">{pet.color}</p>
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">
                          Microchip
                        </p>
                        <p className="font-semibold font-mono text-xs">
                          {pet.microchip}
                        </p>
                      </div>
                    </div>
                    {(pet.allergies !== "None" ||
                      pet.specialNeeds !== "None") && (
                        <div className="space-y-2">
                          {pet.allergies !== "None" && (
                            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
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
                            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <FileText className="h-4 w-4 text-yellow-500 mt-0.5" />
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
                  <div className="text-center py-8">
                    <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
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
                    <Settings className="h-5 w-5 text-indigo-600" />
                    Service Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {booking.service === "boarding" && (
                    <div className="space-y-6">
                      {booking.kennel && (
                        <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="p-2 bg-blue-500 rounded-lg">
                            <Home className="h-5 w-5 text-white" />
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
                        <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="p-2 bg-green-500 rounded-lg">
                            <Clock className="h-5 w-5 text-white" />
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
                          <h4 className="text-lg font-semibold mb-3">
                            Scheduled Dates
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {booking.daycareSelectedDates.map((date) => (
                              <div
                                key={date}
                                className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg"
                              >
                                <Calendar className="h-4 w-4 text-primary" />
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
                  <FileText className="h-5 w-5 text-amber-600" />
                  Special Requests & Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-amber-900 leading-relaxed">
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
                <DollarSign className="h-5 w-5 text-emerald-600" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-sm text-emerald-700">Base Price</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    ${booking.basePrice}
                  </p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-sm text-orange-700">Discount</p>
                  <p className="text-2xl font-bold text-orange-600">
                    ${booking.discount}
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">Total</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${booking.totalCost}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="font-medium">Payment Status</span>
                <StatusBadge type="status" value={booking.paymentStatus} />
              </div>
              {booking.discountReason && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
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
                  <CheckCircle className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Tasks</h3>
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
                        <div className="p-2 bg-muted rounded-lg">
                          <task.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{task.title}</h4>
                            <Badge
                              variant="outline"
                              className="text-xs capitalize"
                            >
                              {task.type.replace("_", " ")}
                            </Badge>
                          </div>
                          {task.time && (
                            <p className="text-sm text-muted-foreground mb-1">
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
        bookingId={booking.id} />
    </DetailsModal>
  );
}
