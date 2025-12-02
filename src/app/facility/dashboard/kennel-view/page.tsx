"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PawPrint,
  Calendar,
  Plus,
  Minus,
  Wrench,
  CheckCircle,
  Phone,
  User,
  List,
  LayoutGrid,
} from "lucide-react";
import { clients } from "@/data/clients";
import { KennelCalendarView } from "./kennel-calendar";

type KennelStatus = "vacant" | "occupied" | "reserved" | "maintenance";

interface Kennel {
  id: string;
  name: string;
  type: "standard" | "large" | "suite" | "luxury";
  status: KennelStatus;
  bookingId?: number;
  petName?: string;
  clientName?: string;
  clientPhone?: string;
  checkIn?: string;
  checkOut?: string;
  dailyRate: number;
}

const initialKennels: Kennel[] = [
  {
    id: "K1",
    name: "Kennel 1",
    type: "standard",
    status: "occupied",
    bookingId: 13,
    petName: "Buddy",
    clientName: "Alice Johnson",
    clientPhone: "123-456-7890",
    checkIn: "2024-03-12",
    checkOut: "2024-03-15",
    dailyRate: 45,
  },
  {
    id: "K2",
    name: "Kennel 2",
    type: "standard",
    status: "vacant",
    dailyRate: 45,
  },
  {
    id: "K3",
    name: "Kennel 3",
    type: "large",
    status: "reserved",
    bookingId: 18,
    petName: "Rex",
    clientName: "John Doe",
    clientPhone: "123-456-7890",
    checkIn: "2024-03-20",
    checkOut: "2024-03-25",
    dailyRate: 55,
  },
  {
    id: "K4",
    name: "Kennel 4",
    type: "large",
    status: "occupied",
    bookingId: 2,
    petName: "Max",
    clientName: "Bob Smith",
    clientPhone: "098-765-4321",
    checkIn: "2024-03-08",
    checkOut: "2024-03-12",
    dailyRate: 55,
  },
  {
    id: "K5",
    name: "Kennel 5",
    type: "suite",
    status: "maintenance",
    dailyRate: 75,
  },
  {
    id: "K6",
    name: "Kennel 6",
    type: "suite",
    status: "vacant",
    dailyRate: 75,
  },
  {
    id: "K7",
    name: "Kennel 7",
    type: "luxury",
    status: "occupied",
    bookingId: 5,
    petName: "Luna",
    clientName: "Diana Prince",
    clientPhone: "111-222-3333",
    checkIn: "2024-03-10",
    checkOut: "2024-03-14",
    dailyRate: 95,
  },
  {
    id: "K8",
    name: "Kennel 8",
    type: "luxury",
    status: "vacant",
    dailyRate: 95,
  },
  {
    id: "K9",
    name: "Kennel 9",
    type: "standard",
    status: "occupied",
    bookingId: 8,
    petName: "Charlie",
    clientName: "Eve Adams",
    clientPhone: "555-666-7777",
    checkIn: "2024-03-09",
    checkOut: "2024-03-11",
    dailyRate: 45,
  },
  {
    id: "K10",
    name: "Kennel 10",
    type: "standard",
    status: "reserved",
    bookingId: 20,
    petName: "Max",
    clientName: "Bob Smith",
    clientPhone: "098-765-4321",
    checkIn: "2024-03-25",
    checkOut: "2024-03-28",
    dailyRate: 45,
  },
  {
    id: "K11",
    name: "Kennel 11",
    type: "large",
    status: "vacant",
    dailyRate: 55,
  },
  {
    id: "K12",
    name: "Kennel 12",
    type: "suite",
    status: "vacant",
    dailyRate: 75,
  },
];

type ViewMode = "list" | "calendar";

export default function KennelViewPage() {
  const [kennels, setKennels] = useState<Kennel[]>(initialKennels);
  const [selectedKennel, setSelectedKennel] = useState<Kennel | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<KennelStatus | "all">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Booking/edit form state
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [formCheckIn, setFormCheckIn] = useState("");
  const [formCheckOut, setFormCheckOut] = useState("");

  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id.toString() === selectedClientId);
  }, [selectedClientId]);

  const availablePets = useMemo(() => {
    return selectedClient?.pets || [];
  }, [selectedClient]);

  const filteredKennels = useMemo(() => {
    if (filterStatus === "all") return kennels;
    return kennels.filter((k) => k.status === filterStatus);
  }, [kennels, filterStatus]);

  const statusCounts = useMemo(() => {
    return {
      vacant: kennels.filter((k) => k.status === "vacant").length,
      occupied: kennels.filter((k) => k.status === "occupied").length,
      reserved: kennels.filter((k) => k.status === "reserved").length,
      maintenance: kennels.filter((k) => k.status === "maintenance").length,
    };
  }, [kennels]);

  const getStatusBadgeClass = (status: KennelStatus) => {
    switch (status) {
      case "vacant":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "occupied":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "reserved":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "maintenance":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    }
  };

  const getTypeLabel = (type: Kennel["type"]) => {
    switch (type) {
      case "standard":
        return "Standard";
      case "large":
        return "Large";
      case "suite":
        return "Suite";
      case "luxury":
        return "Luxury Suite";
    }
  };

  const calculateStayDuration = (checkIn: string, checkOut: string) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const calculateTotal = () => {
    if (!selectedKennel || !formCheckIn || !formCheckOut) return 0;
    const nights = calculateStayDuration(formCheckIn, formCheckOut);
    return nights * selectedKennel.dailyRate;
  };

  const openKennelDialog = (kennel: Kennel) => {
    setSelectedKennel(kennel);

    if (kennel.status === "occupied" || kennel.status === "reserved") {
      // Pre-fill with existing booking data
      const client = clients.find((c) => c.name === kennel.clientName);
      if (client) {
        setSelectedClientId(client.id.toString());
        const pet = client.pets.find((p) => p.name === kennel.petName);
        if (pet) {
          setSelectedPetId(pet.id.toString());
        }
      }
      setFormCheckIn(kennel.checkIn || "");
      setFormCheckOut(kennel.checkOut || "");
    } else {
      // Reset form for new booking
      setSelectedClientId("");
      setSelectedPetId("");
      setFormCheckIn("");
      setFormCheckOut("");
    }

    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedKennel(null);
    setSelectedClientId("");
    setSelectedPetId("");
    setFormCheckIn("");
    setFormCheckOut("");
  };

  const handleSaveBooking = () => {
    if (
      !selectedKennel ||
      !selectedClientId ||
      !selectedPetId ||
      !formCheckIn ||
      !formCheckOut
    )
      return;

    const client = clients.find((c) => c.id.toString() === selectedClientId);
    const pet = client?.pets.find((p) => p.id.toString() === selectedPetId);

    if (!client || !pet) return;

    setKennels((prev) =>
      prev.map((k) =>
        k.id === selectedKennel.id
          ? {
              ...k,
              status: "reserved" as KennelStatus,
              petName: pet.name,
              clientName: client.name,
              clientPhone: client.phone,
              checkIn: formCheckIn,
              checkOut: formCheckOut,
            }
          : k,
      ),
    );

    closeDialog();
  };

  const handleExtendStay = (days: number) => {
    if (!formCheckOut) return;

    const currentCheckOut = new Date(formCheckOut);
    currentCheckOut.setDate(currentCheckOut.getDate() + days);
    setFormCheckOut(currentCheckOut.toISOString().split("T")[0]);
  };

  const handleShortenStay = () => {
    if (!formCheckOut || !formCheckIn) return;

    const currentCheckOut = new Date(formCheckOut);
    const checkIn = new Date(formCheckIn);
    currentCheckOut.setDate(currentCheckOut.getDate() - 1);

    if (currentCheckOut > checkIn) {
      setFormCheckOut(currentCheckOut.toISOString().split("T")[0]);
    }
  };

  const handleMarkAvailable = () => {
    if (!selectedKennel) return;

    setKennels((prev) =>
      prev.map((k) =>
        k.id === selectedKennel.id
          ? {
              ...k,
              status: "vacant" as KennelStatus,
              petName: undefined,
              clientName: undefined,
              clientPhone: undefined,
              checkIn: undefined,
              checkOut: undefined,
              bookingId: undefined,
            }
          : k,
      ),
    );

    closeDialog();
  };

  const isBookingValid =
    selectedClientId && selectedPetId && formCheckIn && formCheckOut;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Kennel View</h2>
          <p className="text-muted-foreground">
            Manage kennel occupancy and bookings
          </p>
        </div>
        <div className="flex rounded-lg border overflow-hidden">
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            className="rounded-none gap-2"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
            List
          </Button>
          <Button
            variant={viewMode === "calendar" ? "secondary" : "ghost"}
            size="sm"
            className="rounded-none gap-2"
            onClick={() => setViewMode("calendar")}
          >
            <LayoutGrid className="h-4 w-4" />
            Calendar
          </Button>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card
          className="cursor-pointer transition-colors hover:bg-green-50 dark:hover:bg-green-950/20"
          onClick={() =>
            setFilterStatus(filterStatus === "vacant" ? "all" : "vacant")
          }
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Vacant
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {statusCounts.vacant}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-colors hover:bg-blue-50 dark:hover:bg-blue-950/20"
          onClick={() =>
            setFilterStatus(filterStatus === "occupied" ? "all" : "occupied")
          }
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Occupied
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {statusCounts.occupied}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <PawPrint className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-colors hover:bg-yellow-50 dark:hover:bg-yellow-950/20"
          onClick={() =>
            setFilterStatus(filterStatus === "reserved" ? "all" : "reserved")
          }
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Reserved
                </p>
                <p className="text-2xl font-bold text-yellow-600">
                  {statusCounts.reserved}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
          onClick={() =>
            setFilterStatus(
              filterStatus === "maintenance" ? "all" : "maintenance",
            )
          }
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Maintenance
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {statusCounts.maintenance}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <Wrench className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {viewMode === "calendar" ? (
        <Card className="p-4">
          <KennelCalendarView
            kennels={kennels}
            onKennelClick={(kennel) => openKennelDialog(kennel)}
            onAddBooking={(kennelId, date) => {
              const kennel = kennels.find((k) => k.id === kennelId);
              if (kennel && kennel.status !== "maintenance") {
                setSelectedKennel(kennel);
                setSelectedClientId("");
                setSelectedPetId("");
                setFormCheckIn(date);
                setFormCheckOut("");
                setDialogOpen(true);
              }
            }}
            onUpdateBooking={(kennelId, checkIn, checkOut) => {
              setKennels((prev) =>
                prev.map((k) =>
                  k.id === kennelId
                    ? {
                        ...k,
                        checkIn,
                        checkOut,
                      }
                    : k,
                ),
              );
            }}
          />
        </Card>
      ) : (
        <>
          {/* Filter Bar */}
          <div className="flex items-center gap-4">
            <Select
              value={filterStatus}
              onValueChange={(v) => setFilterStatus(v as KennelStatus | "all")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Kennels</SelectItem>
                <SelectItem value="vacant">Vacant</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            {filterStatus !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterStatus("all")}
              >
                Clear filter
              </Button>
            )}
          </div>

          {/* Kennel List */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kennel</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pet</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Check-In</TableHead>
                  <TableHead>Check-Out</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredKennels.map((kennel) => (
                  <TableRow
                    key={kennel.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openKennelDialog(kennel)}
                  >
                    <TableCell className="font-medium">{kennel.name}</TableCell>
                    <TableCell>{getTypeLabel(kennel.type)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeClass(kennel.status)}>
                        {kennel.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {kennel.petName ? (
                        <div className="flex items-center gap-2">
                          <PawPrint className="h-4 w-4 text-muted-foreground" />
                          {kennel.petName}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {kennel.clientName || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {kennel.checkIn || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {kennel.checkOut || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      ${kennel.dailyRate}/night
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          openKennelDialog(kennel);
                        }}
                      >
                        {kennel.status === "vacant" ? "Book" : "Manage"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* Unified Kennel Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="min-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedKennel?.name}
              {selectedKennel && (
                <Badge className={getStatusBadgeClass(selectedKennel.status)}>
                  {selectedKennel.status}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedKennel &&
                `${getTypeLabel(selectedKennel.type)} • $${selectedKennel.dailyRate}/night`}
            </DialogDescription>
          </DialogHeader>

          {selectedKennel && (
            <div className="space-y-4 py-4">
              {selectedKennel.status === "maintenance" ? (
                <div className="text-center py-8">
                  <Wrench className="h-12 w-12 text-red-600 mx-auto mb-4" />
                  <p className="text-lg font-medium">Under Maintenance</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This kennel is temporarily unavailable
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={handleMarkAvailable}
                  >
                    Mark as Available
                  </Button>
                </div>
              ) : (
                <>
                  {/* Client Selection */}
                  <div className="space-y-2">
                    <Label>Client</Label>
                    <Select
                      value={selectedClientId}
                      onValueChange={(v) => {
                        setSelectedClientId(v);
                        setSelectedPetId("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients
                          .filter(
                            (c) => c.status === "active" && c.pets.length > 0,
                          )
                          .map((client) => (
                            <SelectItem
                              key={client.id}
                              value={client.id.toString()}
                            >
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                {client.name}
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Pet Selection */}
                  <div className="space-y-2">
                    <Label>Pet</Label>
                    <Select
                      value={selectedPetId}
                      onValueChange={setSelectedPetId}
                      disabled={!selectedClientId}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            selectedClientId
                              ? "Select a pet"
                              : "Select a client first"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePets.map((pet) => (
                          <SelectItem key={pet.id} value={pet.id.toString()}>
                            <div className="flex items-center gap-2">
                              <PawPrint className="h-4 w-4" />
                              {pet.name} ({pet.breed})
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Selection */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Check-In Date</Label>
                      <Input
                        type="date"
                        value={formCheckIn}
                        onChange={(e) => setFormCheckIn(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Expected Check-Out</Label>
                      <Input
                        type="date"
                        value={formCheckOut}
                        onChange={(e) => setFormCheckOut(e.target.value)}
                        min={formCheckIn}
                      />
                    </div>
                  </div>

                  {/* Extend/Shorten Stay Buttons (only for existing bookings) */}
                  {(selectedKennel.status === "occupied" ||
                    selectedKennel.status === "reserved") &&
                    formCheckIn &&
                    formCheckOut && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1"
                          onClick={handleShortenStay}
                          disabled={
                            calculateStayDuration(formCheckIn, formCheckOut) <=
                            1
                          }
                        >
                          <Minus className="h-4 w-4" />
                          Shorten
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1"
                          onClick={() => handleExtendStay(1)}
                        >
                          <Plus className="h-4 w-4" />
                          +1 Day
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1"
                          onClick={() => handleExtendStay(7)}
                        >
                          <Plus className="h-4 w-4" />
                          +1 Week
                        </Button>
                      </div>
                    )}

                  {/* Contact Info */}
                  {selectedClient?.phone && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedClient.phone}</span>
                    </div>
                  )}

                  {/* Pricing Summary */}
                  {formCheckIn && formCheckOut && (
                    <div className="p-4 rounded-lg bg-muted">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">
                          Duration
                        </span>
                        <span className="font-medium">
                          {calculateStayDuration(formCheckIn, formCheckOut)}{" "}
                          nights
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">
                          Rate
                        </span>
                        <span className="font-medium">
                          ${selectedKennel.dailyRate}/night
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="font-medium">Total</span>
                        <span className="font-bold text-green-600 text-lg">
                          ${calculateTotal()}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedKennel?.status !== "maintenance" && (
              <>
                <Button variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button onClick={handleSaveBooking} disabled={!isBookingValid}>
                  {selectedKennel?.status === "vacant"
                    ? "Confirm Booking"
                    : "Save Changes"}
                </Button>
              </>
            )}
            {selectedKennel?.status === "maintenance" && (
              <Button variant="outline" onClick={closeDialog}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
