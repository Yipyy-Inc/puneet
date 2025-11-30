"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import {
  LogIn,
  LogOut,
  Clock,
  PawPrint,
  Phone,
  User,
  Play,
  Square,
  Timer,
} from "lucide-react";
import { daycareCheckIns, DaycareCheckIn, daycareRates } from "@/data/daycare";

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function TimerDisplay({ checkInTime }: { checkInTime: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(checkInTime).getTime();
    const interval = setInterval(() => {
      setElapsed(Date.now() - start);
    }, 1000);
    return () => clearInterval(interval);
  }, [checkInTime]);

  return (
    <span className="font-mono text-lg font-bold text-primary">
      {formatDuration(elapsed)}
    </span>
  );
}

export default function DaycareCheckInPage() {
  const [checkIns, setCheckIns] = useState<DaycareCheckIn[]>(daycareCheckIns);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
  const [selectedPet, setSelectedPet] = useState<DaycareCheckIn | null>(null);

  const [newCheckIn, setNewCheckIn] = useState({
    petName: "",
    petBreed: "",
    petSize: "medium" as "small" | "medium" | "large" | "giant",
    ownerName: "",
    ownerPhone: "",
    rateType: "full-day" as "hourly" | "half-day" | "full-day",
    notes: "",
    playGroup: "",
  });

  const checkedInPets = checkIns.filter((c) => c.status === "checked-in");
  const checkedOutPets = checkIns.filter((c) => c.status === "checked-out");

  const handleCheckIn = () => {
    const now = new Date();
    const scheduledCheckOut = new Date(now);
    if (newCheckIn.rateType === "full-day") {
      scheduledCheckOut.setHours(17, 0, 0, 0);
    } else if (newCheckIn.rateType === "half-day") {
      scheduledCheckOut.setHours(now.getHours() + 5, 0, 0, 0);
    } else {
      scheduledCheckOut.setHours(now.getHours() + 2, 0, 0, 0);
    }

    const newEntry: DaycareCheckIn = {
      id: `dc-${Date.now()}`,
      petId: Math.floor(Math.random() * 1000),
      petName: newCheckIn.petName,
      petBreed: newCheckIn.petBreed,
      petSize: newCheckIn.petSize,
      ownerId: Math.floor(Math.random() * 100),
      ownerName: newCheckIn.ownerName,
      ownerPhone: newCheckIn.ownerPhone,
      checkInTime: now.toISOString(),
      checkOutTime: null,
      scheduledCheckOut: scheduledCheckOut.toISOString(),
      rateType: newCheckIn.rateType,
      status: "checked-in",
      notes: newCheckIn.notes,
      playGroup: newCheckIn.playGroup || null,
    };

    setCheckIns([newEntry, ...checkIns]);
    setIsCheckInModalOpen(false);
    setNewCheckIn({
      petName: "",
      petBreed: "",
      petSize: "medium",
      ownerName: "",
      ownerPhone: "",
      rateType: "full-day",
      notes: "",
      playGroup: "",
    });
  };

  const handleCheckOut = () => {
    if (!selectedPet) return;

    setCheckIns(
      checkIns.map((c) =>
        c.id === selectedPet.id
          ? {
              ...c,
              status: "checked-out",
              checkOutTime: new Date().toISOString(),
            }
          : c,
      ),
    );
    setIsCheckOutModalOpen(false);
    setSelectedPet(null);
  };

  const openCheckOutModal = (pet: DaycareCheckIn) => {
    setSelectedPet(pet);
    setIsCheckOutModalOpen(true);
  };

  const columns: ColumnDef<DaycareCheckIn>[] = [
    {
      key: "petName",
      label: "Pet",
      icon: PawPrint,
      defaultVisible: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <PawPrint className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">{item.petName}</p>
            <p className="text-xs text-muted-foreground">{item.petBreed}</p>
          </div>
        </div>
      ),
    },
    {
      key: "ownerName",
      label: "Owner",
      icon: User,
      defaultVisible: true,
      render: (item) => (
        <div>
          <p>{item.ownerName}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {item.ownerPhone}
          </p>
        </div>
      ),
    },
    {
      key: "checkInTime",
      label: "Check-In Time",
      icon: Clock,
      defaultVisible: true,
      render: (item) => (
        <span>
          {new Date(item.checkInTime).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })}
        </span>
      ),
    },
    {
      key: "rateType",
      label: "Rate",
      defaultVisible: true,
      render: (item) => (
        <Badge
          variant={
            item.rateType === "full-day"
              ? "default"
              : item.rateType === "half-day"
                ? "secondary"
                : "outline"
          }
        >
          {item.rateType.replace("-", " ")}
        </Badge>
      ),
    },
    {
      key: "petSize",
      label: "Size",
      defaultVisible: true,
      render: (item) => (
        <Badge variant="outline" className="capitalize">
          {item.petSize}
        </Badge>
      ),
    },
    {
      key: "timer",
      label: "Timer",
      icon: Timer,
      defaultVisible: true,
      sortable: false,
      render: (item) =>
        item.status === "checked-in" ? (
          <TimerDisplay checkInTime={item.checkInTime} />
        ) : (
          <span className="text-muted-foreground">--:--:--</span>
        ),
    },
    {
      key: "status",
      label: "Status",
      defaultVisible: true,
      render: (item) => (
        <Badge variant={item.status === "checked-in" ? "success" : "secondary"}>
          {item.status === "checked-in" ? "Checked In" : "Checked Out"}
        </Badge>
      ),
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "rateType",
      label: "Rate Type",
      options: [
        { value: "all", label: "All Rates" },
        { value: "hourly", label: "Hourly" },
        { value: "half-day", label: "Half-Day" },
        { value: "full-day", label: "Full-Day" },
      ],
    },
    {
      key: "petSize",
      label: "Size",
      options: [
        { value: "all", label: "All Sizes" },
        { value: "small", label: "Small" },
        { value: "medium", label: "Medium" },
        { value: "large", label: "Large" },
        { value: "giant", label: "Giant" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <LogIn className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{checkedInPets.length}</p>
                <p className="text-sm text-muted-foreground">Currently In</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <LogOut className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{checkedOutPets.length}</p>
                <p className="text-sm text-muted-foreground">
                  Checked Out Today
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {checkedInPets.length + checkedOutPets.length}
                </p>
                <p className="text-sm text-muted-foreground">Total Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Check-In Management</h2>
        <Button onClick={() => setIsCheckInModalOpen(true)}>
          <LogIn className="h-4 w-4 mr-2" />
          New Check-In
        </Button>
      </div>

      {/* Currently Checked In */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Play className="h-4 w-4 text-success" />
            Currently Checked In
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={checkedInPets}
            columns={columns}
            filters={filters}
            searchKey="petName"
            searchPlaceholder="Search pets..."
            actions={(item) => (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openCheckOutModal(item)}
              >
                <Square className="h-4 w-4 mr-1" />
                Check Out
              </Button>
            )}
          />
        </CardContent>
      </Card>

      {/* Checked Out Today */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Square className="h-4 w-4 text-muted-foreground" />
            Checked Out Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={checkedOutPets}
            columns={columns.filter((c) => c.key !== "timer")}
            searchKey="petName"
            searchPlaceholder="Search pets..."
          />
        </CardContent>
      </Card>

      {/* Check-In Modal */}
      <Dialog open={isCheckInModalOpen} onOpenChange={setIsCheckInModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Check-In</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pet Name</Label>
                <Input
                  value={newCheckIn.petName}
                  onChange={(e) =>
                    setNewCheckIn({ ...newCheckIn, petName: e.target.value })
                  }
                  placeholder="Enter pet name"
                />
              </div>
              <div className="space-y-2">
                <Label>Breed</Label>
                <Input
                  value={newCheckIn.petBreed}
                  onChange={(e) =>
                    setNewCheckIn({ ...newCheckIn, petBreed: e.target.value })
                  }
                  placeholder="Enter breed"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pet Size</Label>
                <Select
                  value={newCheckIn.petSize}
                  onValueChange={(
                    value: "small" | "medium" | "large" | "giant",
                  ) => setNewCheckIn({ ...newCheckIn, petSize: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                    <SelectItem value="giant">Giant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rate Type</Label>
                <Select
                  value={newCheckIn.rateType}
                  onValueChange={(value: "hourly" | "half-day" | "full-day") =>
                    setNewCheckIn({ ...newCheckIn, rateType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {daycareRates.map((rate) => (
                      <SelectItem key={rate.id} value={rate.type}>
                        {rate.name} - ${rate.basePrice}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Owner Name</Label>
                <Input
                  value={newCheckIn.ownerName}
                  onChange={(e) =>
                    setNewCheckIn({ ...newCheckIn, ownerName: e.target.value })
                  }
                  placeholder="Enter owner name"
                />
              </div>
              <div className="space-y-2">
                <Label>Owner Phone</Label>
                <Input
                  value={newCheckIn.ownerPhone}
                  onChange={(e) =>
                    setNewCheckIn({ ...newCheckIn, ownerPhone: e.target.value })
                  }
                  placeholder="(555) 555-5555"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Play Group (Optional)</Label>
              <Select
                value={newCheckIn.playGroup}
                onValueChange={(value) =>
                  setNewCheckIn({ ...newCheckIn, playGroup: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select play group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Small Dogs">Small Dogs</SelectItem>
                  <SelectItem value="Medium Dogs">Medium Dogs</SelectItem>
                  <SelectItem value="Large Dogs">Large Dogs</SelectItem>
                  <SelectItem value="Puppy Play">Puppy Play</SelectItem>
                  <SelectItem value="Senior Dogs">Senior Dogs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={newCheckIn.notes}
                onChange={(e) =>
                  setNewCheckIn({ ...newCheckIn, notes: e.target.value })
                }
                placeholder="Any special instructions or notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCheckInModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCheckIn}
              disabled={
                !newCheckIn.petName ||
                !newCheckIn.ownerName ||
                !newCheckIn.ownerPhone
              }
            >
              <LogIn className="h-4 w-4 mr-2" />
              Check In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-Out Modal */}
      <Dialog open={isCheckOutModalOpen} onOpenChange={setIsCheckOutModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Check-Out</DialogTitle>
          </DialogHeader>
          {selectedPet && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <PawPrint className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">
                      {selectedPet.petName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedPet.petBreed} • Owner: {selectedPet.ownerName}
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Check-In Time</p>
                  <p className="font-medium">
                    {new Date(selectedPet.checkInTime).toLocaleTimeString(
                      "en-US",
                      {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      },
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <TimerDisplay checkInTime={selectedPet.checkInTime} />
                </div>
                <div>
                  <p className="text-muted-foreground">Rate Type</p>
                  <Badge className="mt-1">
                    {selectedPet.rateType.replace("-", " ")}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Play Group</p>
                  <p className="font-medium">
                    {selectedPet.playGroup || "Not assigned"}
                  </p>
                </div>
              </div>
              {selectedPet.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedPet.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCheckOutModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCheckOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Confirm Check-Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
