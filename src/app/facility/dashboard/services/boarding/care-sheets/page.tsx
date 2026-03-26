"use client";

import { useState, useCallback, useRef } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Utensils,
  Pill,
  Droplets,
  Footprints,
  PlayCircle,
  Plus,
  Clock,
  User,
  Printer,
  PawPrint,
  CheckCircle,
  Camera,
} from "lucide-react";
import {
  dailyCareSheets,
  DailyCareSheet,
  FeedingLog,
  MedicationLog,
  PottyLog,
  WalkLog,
  PlaytimeLog,
  getCurrentGuests,
  AppetiteStatus,
} from "@/data/boarding";

type LogType = "feeding" | "medication" | "potty" | "walk" | "playtime";

export default function CareSheetsPage() {
  const currentGuests = getCurrentGuests();
  const [careSheets, setCareSheets] =
    useState<DailyCareSheet[]>(dailyCareSheets);
  const [selectedGuestId, setSelectedGuestId] = useState<string>(
    currentGuests[0]?.id || "",
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );

  // Modal state
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logType, setLogType] = useState<LogType>("feeding");

  // Counter for generating unique IDs
  const idCounterRef = useRef(0);
  const getNextId = useCallback((prefix: string) => {
    idCounterRef.current += 1;
    return `${prefix}-${idCounterRef.current}`;
  }, []);

  // Form states
  const [feedingForm, setFeedingForm] = useState({
    scheduledTime: "",
    actualTime: "",
    foodType: "",
    amount: "",
    appetiteStatus: "ate-all" as AppetiteStatus,
    fedByInitials: "",
    notes: "",
  });

  const [medicationForm, setMedicationForm] = useState({
    medicationName: "",
    scheduledTime: "",
    givenTime: "",
    dosage: "",
    givenByInitials: "",
    photoProof: false,
    notes: "",
  });

  const [pottyForm, setPottyForm] = useState({
    time: "",
    type: "both" as "pee" | "poop" | "both",
    location: "outdoor" as "outdoor" | "indoor",
    hadAccident: false,
    staffInitials: "",
    notes: "",
  });

  const [walkForm, setWalkForm] = useState({
    startTime: "",
    endTime: "",
    staffInitials: "",
    notes: "",
  });

  const [playtimeForm, setPlaytimeForm] = useState({
    startTime: "",
    endTime: "",
    type: "group" as "group" | "solo",
    staffInitials: "",
    notes: "",
  });

  const selectedGuest = currentGuests.find((g) => g.id === selectedGuestId);
  const currentCareSheet = careSheets.find(
    (cs) => cs.guestId === selectedGuestId && cs.date === selectedDate,
  );

  const openLogModal = (type: LogType) => {
    setLogType(type);
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 5);

    if (type === "feeding") {
      setFeedingForm({
        scheduledTime: timeStr,
        actualTime: timeStr,
        foodType: selectedGuest?.foodBrand || "",
        amount: selectedGuest?.feedingAmount || "",
        appetiteStatus: "ate-all",
        fedByInitials: "",
        notes: "",
      });
    } else if (type === "medication") {
      setMedicationForm({
        medicationName: selectedGuest?.medications[0]?.medicationName || "",
        scheduledTime: timeStr,
        givenTime: timeStr,
        dosage: selectedGuest?.medications[0]?.dosage || "",
        givenByInitials: "",
        photoProof: false,
        notes: "",
      });
    } else if (type === "potty") {
      setPottyForm({
        time: timeStr,
        type: "both",
        location: "outdoor",
        hadAccident: false,
        staffInitials: "",
        notes: "",
      });
    } else if (type === "walk") {
      setWalkForm({
        startTime: timeStr,
        endTime: "",
        staffInitials: "",
        notes: "",
      });
    } else if (type === "playtime") {
      setPlaytimeForm({
        startTime: timeStr,
        endTime: "",
        type: "group",
        staffInitials: "",
        notes: "",
      });
    }

    setIsLogModalOpen(true);
  };

  const handleSaveLog = () => {
    if (!selectedGuestId || !selectedGuest) return;

    let updatedCareSheet: DailyCareSheet;

    if (currentCareSheet) {
      updatedCareSheet = { ...currentCareSheet };
    } else {
      updatedCareSheet = {
        id: getNextId("dcs"),
        guestId: selectedGuestId,
        petName: selectedGuest.petName,
        date: selectedDate,
        feedings: [],
        medications: [],
        pottyBreaks: [],
        walks: [],
        playtime: [],
        kennelCleans: [],
        generalNotes: "",
        staffOnDuty: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    if (logType === "feeding") {
      const newFeeding: FeedingLog = {
        id: getNextId("feed"),
        guestId: selectedGuestId,
        scheduledTime: feedingForm.scheduledTime,
        actualTime: feedingForm.actualTime,
        foodType: feedingForm.foodType,
        amount: feedingForm.amount,
        appetiteStatus: feedingForm.appetiteStatus,
        fedBy: feedingForm.fedByInitials,
        fedByInitials: feedingForm.fedByInitials,
        notes: feedingForm.notes,
      };
      updatedCareSheet.feedings = [...updatedCareSheet.feedings, newFeeding];
    } else if (logType === "medication") {
      const newMedication: MedicationLog = {
        id: getNextId("med"),
        guestId: selectedGuestId,
        medicationId: selectedGuest.medications[0]?.id || "",
        medicationName: medicationForm.medicationName,
        scheduledTime: medicationForm.scheduledTime,
        givenTime: medicationForm.givenTime,
        givenBy: medicationForm.givenByInitials,
        givenByInitials: medicationForm.givenByInitials,
        dosage: medicationForm.dosage,
        photoProofUrl: medicationForm.photoProof ? "/proof.jpg" : undefined,
        notes: medicationForm.notes,
      };
      updatedCareSheet.medications = [
        ...updatedCareSheet.medications,
        newMedication,
      ];
    } else if (logType === "potty") {
      const newPotty: PottyLog = {
        id: getNextId("potty"),
        guestId: selectedGuestId,
        time: pottyForm.time,
        type: pottyForm.type,
        location: pottyForm.location,
        hadAccident: pottyForm.hadAccident,
        notes: pottyForm.notes,
        staffInitials: pottyForm.staffInitials,
      };
      updatedCareSheet.pottyBreaks = [
        ...updatedCareSheet.pottyBreaks,
        newPotty,
      ];
    } else if (logType === "walk") {
      const start = new Date(`2000-01-01T${walkForm.startTime}`);
      const end = new Date(`2000-01-01T${walkForm.endTime}`);
      const duration = Math.round((end.getTime() - start.getTime()) / 60000);

      const newWalk: WalkLog = {
        id: getNextId("walk"),
        guestId: selectedGuestId,
        startTime: walkForm.startTime,
        endTime: walkForm.endTime,
        duration: duration > 0 ? duration : 0,
        staffInitials: walkForm.staffInitials,
        notes: walkForm.notes,
      };
      updatedCareSheet.walks = [...updatedCareSheet.walks, newWalk];
    } else if (logType === "playtime") {
      const newPlaytime: PlaytimeLog = {
        id: getNextId("play"),
        guestId: selectedGuestId,
        startTime: playtimeForm.startTime,
        endTime: playtimeForm.endTime,
        type: playtimeForm.type,
        notes: playtimeForm.notes,
        staffInitials: playtimeForm.staffInitials,
      };
      updatedCareSheet.playtime = [...updatedCareSheet.playtime, newPlaytime];
    }

    updatedCareSheet.updatedAt = new Date().toISOString();

    if (currentCareSheet) {
      setCareSheets(
        careSheets.map((cs) =>
          cs.id === currentCareSheet.id ? updatedCareSheet : cs,
        ),
      );
    } else {
      setCareSheets([...careSheets, updatedCareSheet]);
    }

    setIsLogModalOpen(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const getAppetiteColor = (status: AppetiteStatus) => {
    switch (status) {
      case "ate-all":
        return "success";
      case "left-some":
        return "warning";
      case "refused":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getAppetiteLabel = (status: AppetiteStatus) => {
    switch (status) {
      case "ate-all":
        return "Ate All";
      case "left-some":
        return "Left Some";
      case "refused":
        return "Refused";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[200px] flex-1 space-y-2">
              <Label>Select Pet</Label>
              <Select
                value={selectedGuestId}
                onValueChange={setSelectedGuestId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a pet" />
                </SelectTrigger>
                <SelectContent>
                  {currentGuests.map((guest) => (
                    <SelectItem key={guest.id} value={guest.id}>
                      <div className="flex items-center gap-2">
                        <PawPrint className="size-4" />
                        {guest.petName} - {guest.kennelName}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-[180px]"
              />
            </div>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 size-4" />
              Print Sheet
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Guest Info Card */}
      {selectedGuest && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <PawPrint className="h-5 w-5" />
              {selectedGuest.petName} - Daily Care Sheet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div>
                <p className="text-muted-foreground">Breed</p>
                <p className="font-medium">{selectedGuest.petBreed}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Kennel</p>
                <p className="font-medium">{selectedGuest.kennelName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Feeding</p>
                <p className="font-medium">
                  {selectedGuest.feedingTimes.join(", ")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Food</p>
                <p className="font-medium">
                  {selectedGuest.foodBrand} - {selectedGuest.feedingAmount}
                </p>
              </div>
            </div>
            {selectedGuest.allergies.length > 0 && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 dark:border-red-800 dark:bg-red-900/20">
                <p className="text-sm text-red-700 dark:text-red-400">
                  <strong>Allergies:</strong>{" "}
                  {selectedGuest.allergies.join(", ")}
                </p>
              </div>
            )}
            {selectedGuest.medications.length > 0 && (
              <div className="mt-3 rounded-lg border border-purple-200 bg-purple-50 p-2 dark:border-purple-800 dark:bg-purple-900/20">
                <p className="text-sm text-purple-700 dark:text-purple-400">
                  <strong>Medications:</strong>{" "}
                  {selectedGuest.medications
                    .map((m) => `${m.medicationName} ${m.dosage}`)
                    .join(", ")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Add Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => openLogModal("feeding")}>
          <Utensils className="mr-2 size-4" />
          Log Feeding
        </Button>
        <Button
          onClick={() => openLogModal("medication")}
          variant="secondary"
          disabled={!selectedGuest?.medications.length}
        >
          <Pill className="mr-2 size-4" />
          Log Medication
        </Button>
        <Button onClick={() => openLogModal("potty")} variant="outline">
          <Droplets className="mr-2 size-4" />
          Log Potty
        </Button>
        <Button onClick={() => openLogModal("walk")} variant="outline">
          <Footprints className="mr-2 size-4" />
          Log Walk
        </Button>
        <Button onClick={() => openLogModal("playtime")} variant="outline">
          <PlayCircle className="mr-2 size-4" />
          Log Playtime
        </Button>
      </div>

      {/* Care Logs Tabs */}
      <Tabs defaultValue="feedings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="feedings" className="flex items-center gap-1">
            <Utensils className="size-4" />
            <span className="hidden sm:inline">Feedings</span>
            {currentCareSheet && (
              <Badge variant="secondary" className="ml-1">
                {currentCareSheet.feedings.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="medications" className="flex items-center gap-1">
            <Pill className="size-4" />
            <span className="hidden sm:inline">Meds</span>
            {currentCareSheet && (
              <Badge variant="secondary" className="ml-1">
                {currentCareSheet.medications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="potty" className="flex items-center gap-1">
            <Droplets className="size-4" />
            <span className="hidden sm:inline">Potty</span>
            {currentCareSheet && (
              <Badge variant="secondary" className="ml-1">
                {currentCareSheet.pottyBreaks.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="walks" className="flex items-center gap-1">
            <Footprints className="size-4" />
            <span className="hidden sm:inline">Walks</span>
            {currentCareSheet && (
              <Badge variant="secondary" className="ml-1">
                {currentCareSheet.walks.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="playtime" className="flex items-center gap-1">
            <PlayCircle className="size-4" />
            <span className="hidden sm:inline">Play</span>
            {currentCareSheet && (
              <Badge variant="secondary" className="ml-1">
                {currentCareSheet.playtime.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Feedings Tab */}
        <TabsContent value="feedings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Utensils className="h-5 w-5" />
                Feeding Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!currentCareSheet?.feedings.length ? (
                <div className="text-muted-foreground py-8 text-center">
                  <Utensils className="mx-auto mb-3 h-12 w-12 opacity-50" />
                  <p>No feedings logged yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentCareSheet.feedings.map((feeding) => (
                    <div
                      key={feeding.id}
                      className="bg-card flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                          <Clock className="text-primary h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{feeding.actualTime}</p>
                          <p className="text-muted-foreground text-sm">
                            {feeding.foodType} - {feeding.amount}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            getAppetiteColor(feeding.appetiteStatus) as
                              | "success"
                              | "warning"
                              | "destructive"
                              | "secondary"
                          }
                        >
                          {getAppetiteLabel(feeding.appetiteStatus)}
                        </Badge>
                        <Badge variant="outline">
                          <User className="mr-1 h-3 w-3" />
                          {feeding.fedByInitials}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medications Tab */}
        <TabsContent value="medications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Pill className="h-5 w-5" />
                Medication Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!currentCareSheet?.medications.length ? (
                <div className="text-muted-foreground py-8 text-center">
                  <Pill className="mx-auto mb-3 h-12 w-12 opacity-50" />
                  <p>No medications logged yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentCareSheet.medications.map((med) => (
                    <div
                      key={med.id}
                      className="bg-card flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                          <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="font-medium">{med.medicationName}</p>
                          <p className="text-muted-foreground text-sm">
                            {med.dosage} at {med.givenTime}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {med.photoProofUrl && (
                          <Badge variant="outline">
                            <Camera className="mr-1 h-3 w-3" />
                            Photo
                          </Badge>
                        )}
                        <Badge variant="outline">
                          <User className="mr-1 h-3 w-3" />
                          {med.givenByInitials}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Potty Tab */}
        <TabsContent value="potty">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Droplets className="h-5 w-5" />
                Potty Breaks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!currentCareSheet?.pottyBreaks.length ? (
                <div className="text-muted-foreground py-8 text-center">
                  <Droplets className="mx-auto mb-3 h-12 w-12 opacity-50" />
                  <p>No potty breaks logged yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentCareSheet.pottyBreaks.map((potty) => (
                    <div
                      key={potty.id}
                      className="bg-card flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                          <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium">{potty.time}</p>
                          <p className="text-muted-foreground text-sm capitalize">
                            {potty.type} - {potty.location}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {potty.hadAccident && (
                          <Badge variant="destructive">Accident</Badge>
                        )}
                        <Badge variant="outline">
                          <User className="mr-1 h-3 w-3" />
                          {potty.staffInitials}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Walks Tab */}
        <TabsContent value="walks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Footprints className="h-5 w-5" />
                Walk Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!currentCareSheet?.walks.length ? (
                <div className="text-muted-foreground py-8 text-center">
                  <Footprints className="mx-auto mb-3 h-12 w-12 opacity-50" />
                  <p>No walks logged yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentCareSheet.walks.map((walk) => (
                    <div
                      key={walk.id}
                      className="bg-card flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                          <Footprints className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {walk.startTime} - {walk.endTime}
                          </p>
                          <p className="text-muted-foreground text-sm">
                            {walk.duration} minutes
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">
                          <User className="mr-1 h-3 w-3" />
                          {walk.staffInitials}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Playtime Tab */}
        <TabsContent value="playtime">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <PlayCircle className="h-5 w-5" />
                Playtime Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!currentCareSheet?.playtime.length ? (
                <div className="text-muted-foreground py-8 text-center">
                  <PlayCircle className="mx-auto mb-3 h-12 w-12 opacity-50" />
                  <p>No playtime logged yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentCareSheet.playtime.map((play) => (
                    <div
                      key={play.id}
                      className="bg-card flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                          <PlayCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {play.startTime} - {play.endTime}
                          </p>
                          <p className="text-muted-foreground text-sm capitalize">
                            {play.type} play
                            {play.notes && ` - ${play.notes}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            play.type === "group" ? "default" : "secondary"
                          }
                        >
                          {play.type === "group" ? "Group" : "Solo"}
                        </Badge>
                        <Badge variant="outline">
                          <User className="mr-1 h-3 w-3" />
                          {play.staffInitials}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Log Entry Modal */}
      <Dialog open={isLogModalOpen} onOpenChange={setIsLogModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {logType === "feeding" && <Utensils className="h-5 w-5" />}
              {logType === "medication" && <Pill className="h-5 w-5" />}
              {logType === "potty" && <Droplets className="h-5 w-5" />}
              {logType === "walk" && <Footprints className="h-5 w-5" />}
              {logType === "playtime" && <PlayCircle className="h-5 w-5" />}
              Log {logType.charAt(0).toUpperCase() + logType.slice(1)}
            </DialogTitle>
          </DialogHeader>

          {/* Feeding Form */}
          {logType === "feeding" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Scheduled Time</Label>
                  <Input
                    type="time"
                    value={feedingForm.scheduledTime}
                    onChange={(e) =>
                      setFeedingForm({
                        ...feedingForm,
                        scheduledTime: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Actual Time</Label>
                  <Input
                    type="time"
                    value={feedingForm.actualTime}
                    onChange={(e) =>
                      setFeedingForm({
                        ...feedingForm,
                        actualTime: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Food Type</Label>
                <Input
                  value={feedingForm.foodType}
                  onChange={(e) =>
                    setFeedingForm({ ...feedingForm, foodType: e.target.value })
                  }
                  placeholder="e.g., Blue Buffalo"
                />
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  value={feedingForm.amount}
                  onChange={(e) =>
                    setFeedingForm({ ...feedingForm, amount: e.target.value })
                  }
                  placeholder="e.g., 1.5 cups"
                />
              </div>
              <div className="space-y-2">
                <Label>Appetite</Label>
                <Select
                  value={feedingForm.appetiteStatus}
                  onValueChange={(v) =>
                    setFeedingForm({
                      ...feedingForm,
                      appetiteStatus: v as AppetiteStatus,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ate-all">Ate All</SelectItem>
                    <SelectItem value="left-some">Left Some</SelectItem>
                    <SelectItem value="refused">Refused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Staff Initials</Label>
                <Input
                  value={feedingForm.fedByInitials}
                  onChange={(e) =>
                    setFeedingForm({
                      ...feedingForm,
                      fedByInitials: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="e.g., SJ"
                  maxLength={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={feedingForm.notes}
                  onChange={(e) =>
                    setFeedingForm({ ...feedingForm, notes: e.target.value })
                  }
                  placeholder="Any observations..."
                />
              </div>
            </div>
          )}

          {/* Medication Form */}
          {logType === "medication" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Medication Name</Label>
                <Input
                  value={medicationForm.medicationName}
                  onChange={(e) =>
                    setMedicationForm({
                      ...medicationForm,
                      medicationName: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Scheduled Time</Label>
                  <Input
                    type="time"
                    value={medicationForm.scheduledTime}
                    onChange={(e) =>
                      setMedicationForm({
                        ...medicationForm,
                        scheduledTime: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Given Time</Label>
                  <Input
                    type="time"
                    value={medicationForm.givenTime}
                    onChange={(e) =>
                      setMedicationForm({
                        ...medicationForm,
                        givenTime: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dosage</Label>
                <Input
                  value={medicationForm.dosage}
                  onChange={(e) =>
                    setMedicationForm({
                      ...medicationForm,
                      dosage: e.target.value,
                    })
                  }
                  placeholder="e.g., 16mg"
                />
              </div>
              <div className="space-y-2">
                <Label>Staff Initials</Label>
                <Input
                  value={medicationForm.givenByInitials}
                  onChange={(e) =>
                    setMedicationForm({
                      ...medicationForm,
                      givenByInitials: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="e.g., SJ"
                  maxLength={3}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="photoProof"
                  checked={medicationForm.photoProof}
                  onChange={(e) =>
                    setMedicationForm({
                      ...medicationForm,
                      photoProof: e.target.checked,
                    })
                  }
                  className="rounded-sm"
                />
                <Label htmlFor="photoProof">Photo proof taken</Label>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={medicationForm.notes}
                  onChange={(e) =>
                    setMedicationForm({
                      ...medicationForm,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Any observations..."
                />
              </div>
            </div>
          )}

          {/* Potty Form */}
          {logType === "potty" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={pottyForm.time}
                  onChange={(e) =>
                    setPottyForm({ ...pottyForm, time: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={pottyForm.type}
                  onValueChange={(v) =>
                    setPottyForm({
                      ...pottyForm,
                      type: v as "pee" | "poop" | "both",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pee">Pee</SelectItem>
                    <SelectItem value="poop">Poop</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Select
                  value={pottyForm.location}
                  onValueChange={(v) =>
                    setPottyForm({
                      ...pottyForm,
                      location: v as "outdoor" | "indoor",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outdoor">Outdoor</SelectItem>
                    <SelectItem value="indoor">Indoor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="accident"
                  checked={pottyForm.hadAccident}
                  onChange={(e) =>
                    setPottyForm({
                      ...pottyForm,
                      hadAccident: e.target.checked,
                    })
                  }
                  className="rounded-sm"
                />
                <Label htmlFor="accident">Had accident</Label>
              </div>
              <div className="space-y-2">
                <Label>Staff Initials</Label>
                <Input
                  value={pottyForm.staffInitials}
                  onChange={(e) =>
                    setPottyForm({
                      ...pottyForm,
                      staffInitials: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="e.g., SJ"
                  maxLength={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={pottyForm.notes}
                  onChange={(e) =>
                    setPottyForm({ ...pottyForm, notes: e.target.value })
                  }
                  placeholder="Any observations..."
                />
              </div>
            </div>
          )}

          {/* Walk Form */}
          {logType === "walk" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={walkForm.startTime}
                    onChange={(e) =>
                      setWalkForm({ ...walkForm, startTime: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={walkForm.endTime}
                    onChange={(e) =>
                      setWalkForm({ ...walkForm, endTime: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Staff Initials</Label>
                <Input
                  value={walkForm.staffInitials}
                  onChange={(e) =>
                    setWalkForm({
                      ...walkForm,
                      staffInitials: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="e.g., SJ"
                  maxLength={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={walkForm.notes}
                  onChange={(e) =>
                    setWalkForm({ ...walkForm, notes: e.target.value })
                  }
                  placeholder="How did the walk go..."
                />
              </div>
            </div>
          )}

          {/* Playtime Form */}
          {logType === "playtime" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={playtimeForm.startTime}
                    onChange={(e) =>
                      setPlaytimeForm({
                        ...playtimeForm,
                        startTime: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={playtimeForm.endTime}
                    onChange={(e) =>
                      setPlaytimeForm({
                        ...playtimeForm,
                        endTime: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Play Type</Label>
                <Select
                  value={playtimeForm.type}
                  onValueChange={(v) =>
                    setPlaytimeForm({
                      ...playtimeForm,
                      type: v as "group" | "solo",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group">Group Play</SelectItem>
                    <SelectItem value="solo">Solo Play</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Staff Initials</Label>
                <Input
                  value={playtimeForm.staffInitials}
                  onChange={(e) =>
                    setPlaytimeForm({
                      ...playtimeForm,
                      staffInitials: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="e.g., SJ"
                  maxLength={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={playtimeForm.notes}
                  onChange={(e) =>
                    setPlaytimeForm({ ...playtimeForm, notes: e.target.value })
                  }
                  placeholder="How did playtime go..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLogModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLog}>
              <Plus className="mr-2 size-4" />
              Save Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
