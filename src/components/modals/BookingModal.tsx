import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DetailsModal } from "@/components/modals/DetailsModal";
import { InfoCard } from "@/components/ui/DateCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
  Edit,
  Trash2,
} from "lucide-react";
import { bookings } from "@/data/bookings";
import { clients } from "@/data/clients";
import { Separator } from "@/components/ui/separator";

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
      <div className="space-y-4">
        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          {booking.status === "pending" && (
            <Button size="sm" className="flex-1">
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirm Booking
            </Button>
          )}
          {booking.status === "confirmed" && (
            <Button size="sm" className="flex-1">
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark as Completed
            </Button>
          )}
          <Button size="sm" variant="outline" className="flex-1">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          {(booking.status === "pending" || booking.status === "confirmed") && (
            <Button size="sm" variant="destructive" className="flex-1">
              <Trash2 className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          )}
        </div>

        {/* Service & Cost Overview */}
        <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
          <InfoCard
            title="Service"
            value={
              booking.service.charAt(0).toUpperCase() + booking.service.slice(1)
            }
            subtitle="Service type"
            icon={Calendar}
            variant="primary"
          />
          <InfoCard
            title="Duration"
            value={duration}
            subtitle="Total length"
            icon={Clock}
            variant="info"
          />
          <InfoCard
            title="Total Cost"
            value={`$${booking.totalCost}`}
            subtitle={`Payment ${booking.paymentStatus}`}
            icon={DollarSign}
            variant="success"
          />
        </div>

        {/* Booking Schedule */}
        <Card className="bg-linear-to-br from-card to-muted/20 border-none shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Calendar className="h-4 w-4" />
              </div>
              Schedule Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 px-5 pb-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background/60 backdrop-blur-sm">
                <div className="p-2 rounded-lg bg-muted">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Start Date</p>
                  <span className="text-sm font-medium">
                    {booking.startDate}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background/60 backdrop-blur-sm">
                <div className="p-2 rounded-lg bg-muted">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">End Date</p>
                  <span className="text-sm font-medium">{booking.endDate}</span>
                </div>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background/60 backdrop-blur-sm">
                <div className="p-2 rounded-lg bg-muted">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Check-in Time</p>
                  <span className="text-sm font-medium">
                    {booking.checkInTime || "Not set"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background/60 backdrop-blur-sm">
                <div className="p-2 rounded-lg bg-muted">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">
                    Check-out Time
                  </p>
                  <span className="text-sm font-medium">
                    {booking.checkOutTime || "Not set"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client Information */}
        <Card className="bg-linear-to-br from-card to-muted/20 border-none shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-success/10 text-success">
                <User className="h-4 w-4" />
              </div>
              Client Information
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {client ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-background/60 backdrop-blur-sm border border-border/50 hover:border-primary/30 hover:bg-accent/50 transition-all duration-200 group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                      <User className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{client.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          {client.email}
                        </p>
                      </div>
                      {client.phone && (
                        <div className="flex items-center gap-2 mt-0.5">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            {client.phone}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {client.status}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground">
                  Client information not found.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pet Information */}
        <Card className="bg-linear-to-br from-card to-muted/20 border-none shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-warning/10 text-warning">
                <Heart className="h-4 w-4" />
              </div>
              Pet Information
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {pet ? (
              <div className="space-y-2.5">
                <div className="p-3.5 rounded-xl bg-background/60 backdrop-blur-sm border border-border/50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Heart className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">{pet.name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <span className="font-medium">{pet.type}</span> •{" "}
                          {pet.breed}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {pet.type}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-muted-foreground">Age</p>
                      <p className="font-medium">
                        {pet.age} {pet.age === 1 ? "year" : "years"}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-muted-foreground">Weight</p>
                      <p className="font-medium">{pet.weight} lbs</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-muted-foreground">Color</p>
                      <p className="font-medium">{pet.color}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-muted-foreground">Microchip</p>
                      <p className="font-medium font-mono text-[10px]">
                        {pet.microchip}
                      </p>
                    </div>
                  </div>
                  {(pet.allergies !== "None" ||
                    pet.specialNeeds !== "None") && (
                    <>
                      <Separator className="my-3" />
                      <div className="space-y-2">
                        {pet.allergies !== "None" && (
                          <div className="flex items-start gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                            <div>
                              <p className="text-xs font-medium">Allergies</p>
                              <p className="text-xs text-muted-foreground">
                                {pet.allergies}
                              </p>
                            </div>
                          </div>
                        )}
                        {pet.specialNeeds !== "None" && (
                          <div className="flex items-start gap-2 p-2 rounded-lg bg-warning/10 border border-warning/20">
                            <FileText className="h-4 w-4 text-warning mt-0.5" />
                            <div>
                              <p className="text-xs font-medium">
                                Special Needs
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {pet.specialNeeds}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground">
                  Pet information not found.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Special Requests */}
        {booking.specialRequests && (
          <Card className="bg-linear-to-br from-card to-muted/20 border-none shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="pb-3 px-5 pt-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-info/10 text-info">
                  <FileText className="h-4 w-4" />
                </div>
                Special Requests & Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="p-3 rounded-lg bg-background/60 backdrop-blur-sm border border-border/50">
                <p className="text-sm leading-relaxed">
                  {booking.specialRequests}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Details */}
        <Card className="bg-linear-to-br from-card to-muted/20 border-none shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-success/10 text-success">
                <DollarSign className="h-4 w-4" />
              </div>
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-background/60">
                <span className="text-sm text-muted-foreground">
                  Booking Cost
                </span>
                <span className="text-sm font-medium">
                  ${booking.totalCost}
                </span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-background/60">
                <span className="text-sm text-muted-foreground">
                  Payment Status
                </span>
                <StatusBadge type="status" value={booking.paymentStatus} />
              </div>
              {booking.paymentStatus === "pending" && (
                <Button size="sm" className="w-full mt-2">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Process Payment
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DetailsModal>
  );
}
