"use client";

import { useState, useMemo } from "react";
import { GroomingBookingFlow } from "@/components/grooming/GroomingBookingFlow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Calendar as CalendarIcon,
  Clock,
  DollarSign,
  Scissors,
  User,
  PawPrint,
  Phone,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { GenericCalendar, CalendarItem } from "@/components/ui/GenericCalendar";
import {
  groomingAppointments,
  groomingPackages,
  getActiveStylists,
  getGroomingStats,
  type GroomingAppointment,
  type GroomingStatus,
  type PetSize,
  type CoatType,
} from "@/data/grooming";

type AppointmentCalendarItem = GroomingAppointment & CalendarItem;

const statusColors: Record<
  GroomingStatus,
  { bg: string; text: string; border: string }
> = {
  scheduled: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-300",
  },
  "in-progress": {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    border: "border-yellow-300",
  },
  completed: {
    bg: "bg-green-100",
    text: "text-green-700",
    border: "border-green-300",
  },
  cancelled: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-300",
  },
  "no-show": {
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-300",
  },
};

const statusIcons: Record<GroomingStatus, React.ReactNode> = {
  scheduled: <Clock className="h-3 w-3" />,
  "in-progress": <Scissors className="h-3 w-3" />,
  completed: <CheckCircle2 className="h-3 w-3" />,
  cancelled: <XCircle className="h-3 w-3" />,
  "no-show": <AlertCircle className="h-3 w-3" />,
};

export default function GroomingCalendarPage() {
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isGroomingBookingOpen, setIsGroomingBookingOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] =
    useState<GroomingAppointment | null>(null);
  const [selectedAppointment, setSelectedAppointment] =
    useState<GroomingAppointment | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    date: "",
    startTime: "",
    petName: "",
    petBreed: "",
    petSize: "medium" as PetSize,
    petWeight: 0,
    coatType: "medium" as CoatType,
    ownerName: "",
    ownerPhone: "",
    ownerEmail: "",
    stylistId: "",
    packageId: "",
    notes: "",
    specialInstructions: "",
  });

  const stats = getGroomingStats();
  const activeStylists = getActiveStylists();

  // Convert appointments to calendar items
  const calendarItems: AppointmentCalendarItem[] = useMemo(() => {
    return groomingAppointments.map((apt) => ({
      ...apt,
      id: apt.id,
      date: apt.date,
      startTime: apt.startTime,
      endTime: apt.endTime,
    }));
  }, []);

  const handleAddNew = (date?: string) => {
    setEditingAppointment(null);
    setFormData({
      date: date || new Date().toISOString().split("T")[0],
      startTime: "09:00",
      petName: "",
      petBreed: "",
      petSize: "medium",
      petWeight: 0,
      coatType: "medium",
      ownerName: "",
      ownerPhone: "",
      ownerEmail: "",
      stylistId: "",
      packageId: "",
      notes: "",
      specialInstructions: "",
    });
    setIsAddEditModalOpen(true);
  };

  const handleItemClick = (item: AppointmentCalendarItem) => {
    setSelectedAppointment(item);
    setIsDetailModalOpen(true);
  };

  const handleEdit = (appointment: GroomingAppointment) => {
    setEditingAppointment(appointment);
    setFormData({
      date: appointment.date,
      startTime: appointment.startTime,
      petName: appointment.petName,
      petBreed: appointment.petBreed,
      petSize: appointment.petSize,
      petWeight: appointment.petWeight,
      coatType: appointment.coatType,
      ownerName: appointment.ownerName,
      ownerPhone: appointment.ownerPhone,
      ownerEmail: appointment.ownerEmail,
      stylistId: appointment.stylistId,
      packageId: appointment.packageId,
      notes: appointment.notes,
      specialInstructions: appointment.specialInstructions,
    });
    setIsDetailModalOpen(false);
    setIsAddEditModalOpen(true);
  };

  const handleSave = () => {
    // In a real app, this would save to the backend
    setIsAddEditModalOpen(false);
  };

  const getSelectedPackage = () => {
    return groomingPackages.find((pkg) => pkg.id === formData.packageId);
  };

  const calculatePrice = () => {
    const pkg = getSelectedPackage();
    if (!pkg) return 0;
    return pkg.sizePricing[formData.petSize] || pkg.basePrice;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today&apos;s Appointments
            </CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayTotal}</div>
            <p className="text-xs text-muted-foreground">
              {stats.todayCompleted} completed, {stats.todayScheduled} remaining
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Scissors className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayInProgress}</div>
            <p className="text-xs text-muted-foreground">
              Currently being groomed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today&apos;s Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.todayRevenue}</div>
            <p className="text-xs text-muted-foreground">
              From completed appointments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Stylists
            </CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeStylists}</div>
            <p className="text-xs text-muted-foreground">Available today</p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Grooming Calendar</CardTitle>
          <div className="flex gap-2">
            <Button onClick={() => setIsGroomingBookingOpen(true)} variant="default">
              <Plus className="mr-2 h-4 w-4" />
              Book Grooming (Customer Flow)
            </Button>
            <Button onClick={() => handleAddNew()} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              New Appointment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <GenericCalendar
            items={calendarItems}
            config={{
              title: "Appointments",
              showAddButton: true,
              onItemClick: handleItemClick,
              onAddClick: (date) => handleAddNew(date),
              getItemColor: (item) =>
                statusColors[item.status as GroomingStatus]?.bg ||
                "bg-gray-100",
              getItemBorderColor: (item) =>
                statusColors[item.status as GroomingStatus]?.border ||
                "border-gray-300",
              legendItems: [
                { color: "bg-blue-100 border-blue-300", label: "Scheduled" },
                {
                  color: "bg-yellow-100 border-yellow-300",
                  label: "In Progress",
                },
                { color: "bg-green-100 border-green-300", label: "Completed" },
                { color: "bg-red-100 border-red-300", label: "No Show" },
              ],
              renderMonthItem: ({ item }) => (
                <div className="text-xs truncate">
                  <span className="font-medium">{item.startTime}</span> -{" "}
                  {item.petName}
                </div>
              ),
              listColumns: [
                {
                  key: "startTime",
                  label: "Time",
                  render: (item) => `${item.startTime} - ${item.endTime}`,
                },
                {
                  key: "petName",
                  label: "Pet",
                  render: (item) => `${item.petName} (${item.petBreed})`,
                },
                { key: "ownerName", label: "Owner" },
                { key: "stylistName", label: "Stylist" },
                { key: "packageName", label: "Package" },
                {
                  key: "status",
                  label: "Status",
                  render: (item) => (
                    <Badge
                      className={`${statusColors[item.status as GroomingStatus]?.bg} ${statusColors[item.status as GroomingStatus]?.text}`}
                    >
                      {item.status}
                    </Badge>
                  ),
                },
                {
                  key: "totalPrice",
                  label: "Price",
                  render: (item) => `$${item.totalPrice}`,
                },
              ],
            }}
            view="week"
          />
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5" />
              Appointment Details
            </DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="grid gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-100">
                    <PawPrint className="h-6 w-6 text-pink-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {selectedAppointment.petName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedAppointment.petBreed} •{" "}
                      {selectedAppointment.petSize} •{" "}
                      {selectedAppointment.petWeight} lbs
                    </p>
                  </div>
                </div>
                <Badge
                  className={`${statusColors[selectedAppointment.status]?.bg} ${statusColors[selectedAppointment.status]?.text} gap-1`}
                >
                  {statusIcons[selectedAppointment.status]}
                  {selectedAppointment.status}
                </Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {new Date(selectedAppointment.date).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        },
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {selectedAppointment.startTime} -{" "}
                      {selectedAppointment.endTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Stylist: {selectedAppointment.stylistName}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Owner: {selectedAppointment.ownerName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedAppointment.ownerPhone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">
                      ${selectedAppointment.totalPrice}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">
                  Package: {selectedAppointment.packageName}
                </h4>
                {selectedAppointment.addOns.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedAppointment.addOns.map((addon, idx) => (
                      <Badge key={idx} variant="secondary">
                        {addon}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {selectedAppointment.specialInstructions && (
                <div className="space-y-1">
                  <h4 className="font-medium text-sm">Special Instructions</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedAppointment.specialInstructions}
                  </p>
                </div>
              )}

              {selectedAppointment.allergies &&
                selectedAppointment.allergies.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="font-medium text-sm text-red-600">
                      Allergies
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedAppointment.allergies.map((allergy, idx) => (
                        <Badge key={idx} variant="destructive">
                          {allergy}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

              {selectedAppointment.notes && (
                <div className="space-y-1">
                  <h4 className="font-medium text-sm">Notes</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedAppointment.notes}
                  </p>
                </div>
              )}

              {selectedAppointment.onlineBooking && (
                <Badge variant="outline" className="w-fit">
                  <CalendarIcon className="mr-1 h-3 w-3" />
                  Booked Online
                </Badge>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDetailModalOpen(false)}
            >
              Close
            </Button>
            <Button
              onClick={() =>
                selectedAppointment && handleEdit(selectedAppointment)
              }
            >
              Edit Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Modal */}
      <Dialog open={isAddEditModalOpen} onOpenChange={setIsAddEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAppointment
                ? "Edit Appointment"
                : "New Grooming Appointment"}
            </DialogTitle>
            <DialogDescription>
              {editingAppointment
                ? "Update the appointment details below."
                : "Schedule a new grooming appointment. Online booking is enabled."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">Time</Label>
                <Select
                  value={formData.startTime}
                  onValueChange={(value) =>
                    setFormData({ ...formData, startTime: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "08:00",
                      "09:00",
                      "10:00",
                      "11:00",
                      "12:00",
                      "13:00",
                      "14:00",
                      "15:00",
                      "16:00",
                    ].map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stylistId">Stylist</Label>
              <Select
                value={formData.stylistId}
                onValueChange={(value) =>
                  setFormData({ ...formData, stylistId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a stylist" />
                </SelectTrigger>
                <SelectContent>
                  {activeStylists.map((stylist) => (
                    <SelectItem key={stylist.id} value={stylist.id}>
                      {stylist.name} -{" "}
                      {stylist.specializations.slice(0, 2).join(", ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Pet Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="petName">Pet Name</Label>
                  <Input
                    id="petName"
                    value={formData.petName}
                    onChange={(e) =>
                      setFormData({ ...formData, petName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="petBreed">Breed</Label>
                  <Input
                    id="petBreed"
                    value={formData.petBreed}
                    onChange={(e) =>
                      setFormData({ ...formData, petBreed: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="petSize">Size</Label>
                  <Select
                    value={formData.petSize}
                    onValueChange={(value) =>
                      setFormData({ ...formData, petSize: value as PetSize })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">
                        Small (under 20 lbs)
                      </SelectItem>
                      <SelectItem value="medium">Medium (20-50 lbs)</SelectItem>
                      <SelectItem value="large">Large (50-100 lbs)</SelectItem>
                      <SelectItem value="giant">Giant (100+ lbs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coatType">Coat Type</Label>
                  <Select
                    value={formData.coatType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, coatType: value as CoatType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="long">Long</SelectItem>
                      <SelectItem value="wire">Wire</SelectItem>
                      <SelectItem value="curly">Curly</SelectItem>
                      <SelectItem value="double">Double Coat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Owner Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ownerName">Owner Name</Label>
                  <Input
                    id="ownerName"
                    value={formData.ownerName}
                    onChange={(e) =>
                      setFormData({ ...formData, ownerName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerPhone">Phone</Label>
                  <Input
                    id="ownerPhone"
                    value={formData.ownerPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, ownerPhone: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="ownerEmail">Email</Label>
                  <Input
                    id="ownerEmail"
                    type="email"
                    value={formData.ownerEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, ownerEmail: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Service</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="packageId">Grooming Package</Label>
                  <Select
                    value={formData.packageId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, packageId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a package" />
                    </SelectTrigger>
                    <SelectContent>
                      {groomingPackages
                        .filter((pkg) => pkg.isActive)
                        .map((pkg) => (
                          <SelectItem key={pkg.id} value={pkg.id}>
                            {pkg.name} - ${pkg.sizePricing[formData.petSize]} (
                            {pkg.duration} min)
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                {getSelectedPackage() && (
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-sm font-medium">
                      {getSelectedPackage()?.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getSelectedPackage()?.description}
                    </p>
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground">Includes:</p>
                      <ul className="text-xs mt-1 space-y-0.5">
                        {getSelectedPackage()?.includes.map((item, idx) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                    <p className="text-sm font-semibold mt-2">
                      Price: ${calculatePrice()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialInstructions">Special Instructions</Label>
              <Textarea
                id="specialInstructions"
                placeholder="Any allergies, sensitivities, or special handling instructions..."
                value={formData.specialInstructions}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    specialInstructions: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about the appointment..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingAppointment ? "Save Changes" : "Create Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grooming Booking Flow */}
      <GroomingBookingFlow
        open={isGroomingBookingOpen}
        onOpenChange={(open) => {
          setIsGroomingBookingOpen(open);
          if (!open) {
            // Refresh appointments when modal closes
            // In production, this would refetch data
          }
        }}
      />
    </div>
  );
}
