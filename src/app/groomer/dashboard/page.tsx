"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Clock,
  CheckCircle2,
  PlayCircle,
  Camera,
  FileText,
  Calendar,
  User,
  Phone,
  PawPrint,
  AlertCircle,
  Upload,
  X,
} from "lucide-react";
import {
  groomingAppointments,
  stylists,
  type GroomingAppointment,
  type GroomingStatus,
  type GroomingPhoto,
} from "@/data/grooming";
import { getCurrentUserId } from "@/lib/role-utils";
import { sendPickupNotifications } from "@/lib/grooming-pickup-notifications";

const statusColors: Record<
  GroomingStatus,
  { bg: string; text: string; border: string }
> = {
  scheduled: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  "checked-in": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  "in-progress": { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  "ready-for-pickup": { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  completed: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  "no-show": { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
};

export default function GroomerDashboardPage() {
  const router = useRouter();
  const [selectedAppointment, setSelectedAppointment] =
    useState<GroomingAppointment | null>(null);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Local state for appointments to allow updates
  const [appointmentsData, setAppointmentsData] = useState<GroomingAppointment[]>(
    groomingAppointments,
  );

  useEffect(() => {
    // Get user ID on mount
    const currentUserId = getCurrentUserId();
    // If no user ID, use first stylist as default for demo
    setUserId(currentUserId || stylists[0]?.id || null);
  }, []);

  // Find the stylist for the current user
  const currentStylist = useMemo(() => {
    if (!userId) return null;
    return stylists.find((s) => s.id === userId || s.email === userId) || null;
  }, [userId]);

  // Use first stylist as default if no user is set
  const displayStylist = useMemo(() => {
    return currentStylist || stylists[0] || null;
  }, [currentStylist]);

  // Get today's appointments for this groomer
  const todayAppointments = useMemo(() => {
    if (!displayStylist) return [];
    const today = new Date().toISOString().split("T")[0];
    return appointmentsData.filter(
      (apt) => apt.date === today && apt.stylistId === displayStylist.id,
    );
  }, [displayStylist, appointmentsData]);

  // Sort appointments by start time
  const sortedAppointments = useMemo(() => {
    return [...todayAppointments].sort((a, b) => {
      const timeA = a.startTime.split(":").map(Number);
      const timeB = b.startTime.split(":").map(Number);
      const minutesA = timeA[0] * 60 + timeA[1];
      const minutesB = timeB[0] * 60 + timeB[1];
      return minutesA - minutesB;
    });
  }, [todayAppointments]);

  const handleStartGroom = (appointment: GroomingAppointment) => {
    // Check if check-in is required
    if (appointment.status !== "checked-in" && !appointment.checkInTime) {
      toast.error("Check-in required", {
        description: "Appointment must be checked in before groom can start.",
      });
      return;
    }

    // Update appointment status to in-progress
    setAppointmentsData((prev) =>
      prev.map((apt) =>
        apt.id === appointment.id
          ? {
              ...apt,
              status: "in-progress" as GroomingStatus,
            }
          : apt,
      ),
    );

    toast.success("Groom started", {
      description: `Started grooming ${appointment.petName}`,
    });
  };

  const handleMarkReady = async (appointment: GroomingAppointment) => {
    if (appointment.status !== "in-progress") {
      toast.error("Invalid status", {
        description: "Only in-progress appointments can be marked as ready.",
      });
      return;
    }

    // Update appointment status to ready-for-pickup
    const updatedAppointment = {
      ...appointment,
      status: "ready-for-pickup" as GroomingStatus,
    };

    setAppointmentsData((prev) =>
      prev.map((apt) =>
        apt.id === appointment.id ? updatedAppointment : apt,
      ),
    );

    // Send pickup notifications (SMS and/or Email) if enabled
    // In a real app, get settings from API or context
    const settings = {
      autoReadyForPickupSMS: true, // TODO: Get from settings
      autoReadyForPickupEmail: true, // TODO: Get from settings
    };

    try {
      const results = await sendPickupNotifications(updatedAppointment, settings);
      
      const notificationMessages: string[] = [];
      if (results.smsSent) notificationMessages.push("SMS sent");
      if (results.emailSent) notificationMessages.push("Email sent");
      
      if (notificationMessages.length > 0) {
        toast.success("Marked as ready", {
          description: `${appointment.petName} is ready for pickup! ${notificationMessages.join(" and ")}.`,
        });
      } else {
        toast.success("Marked as ready", {
          description: `${appointment.petName} is ready for pickup!`,
        });
      }
    } catch (error) {
      // Still show success even if notifications fail
      toast.success("Marked as ready", {
        description: `${appointment.petName} is ready for pickup!`,
      });
      console.error("Failed to send pickup notifications:", error);
    }
  };

  const handleOpenNotes = (appointment: GroomingAppointment) => {
    setSelectedAppointment(appointment);
    setNotes(appointment.notes || "");
    setIsNotesModalOpen(true);
  };

  const handleSaveNotes = () => {
    if (!selectedAppointment) return;

    // Update appointment with notes
    setAppointmentsData((prev) =>
      prev.map((apt) =>
        apt.id === selectedAppointment.id
          ? {
              ...apt,
              notes: notes,
            }
          : apt,
      ),
    );

    toast.success("Notes saved", {
      description: `Notes updated for ${selectedAppointment.petName}`,
    });

    setIsNotesModalOpen(false);
    setSelectedAppointment(null);
    setNotes("");
  };

  const handleOpenPhotoUpload = (appointment: GroomingAppointment) => {
    setSelectedAppointment(appointment);
    setAfterPhotos(appointment.afterPhotos?.map((p) => p.url) || []);
    setIsPhotoModalOpen(true);
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      // In a real app, this would upload to a server and return a URL
      const url = URL.createObjectURL(file);
      setAfterPhotos([...afterPhotos, url]);
    });

    toast.success("Photo(s) uploaded", {
      description: `${files.length} photo(s) added`,
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = [...afterPhotos];
    const removedUrl = newPhotos[index];
    URL.revokeObjectURL(removedUrl);
    newPhotos.splice(index, 1);
    setAfterPhotos(newPhotos);
  };

  const handleSavePhotos = () => {
    if (!selectedAppointment || !displayStylist) return;

    // Get existing photos that are already GroomingPhoto objects (from appointment)
    const existingPhotos = selectedAppointment.afterPhotos || [];
    
    // Find which photos are new (URLs that don't exist in existing photos)
    const existingUrls = new Set(existingPhotos.map((p) => p.url));
    const newPhotoUrls = afterPhotos.filter((url) => !existingUrls.has(url));
    
    // Create GroomingPhoto objects only for new photos
    const newPhotos: GroomingPhoto[] = newPhotoUrls.map((url, idx) => ({
      id: `photo-${selectedAppointment.id}-${idx}-${Date.now()}`,
      url: url,
      type: "after",
      takenAt: new Date().toISOString(),
      takenBy: displayStylist.name,
    }));

    // Update appointment with all photos (existing + new)
    setAppointmentsData((prev) =>
      prev.map((apt) =>
        apt.id === selectedAppointment.id
          ? {
              ...apt,
              afterPhotos: [...existingPhotos, ...newPhotos],
            }
          : apt,
      ),
    );

    toast.success("Photos saved", {
      description: `${newPhotos.length} photo(s) saved for ${selectedAppointment.petName}`,
    });

    setIsPhotoModalOpen(false);
    setSelectedAppointment(null);
    setAfterPhotos([]);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getStatusBadge = (status: GroomingStatus) => {
    const colors = statusColors[status];
    return (
      <Badge
        className={`${colors.bg} ${colors.text} ${colors.border} border`}
      >
        {status.replace("-", " ")}
      </Badge>
    );
  };


  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Today&apos;s Dogs</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {displayStylist?.name || "Groomer"}
        </p>
      </div>

      {/* Timeline View */}
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedAppointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No appointments scheduled</p>
              <p className="text-sm text-muted-foreground mt-1">
                You have no appointments for today.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedAppointments.map((appointment) => (
                <Card
                  key={appointment.id}
                  className={`${
                    statusColors[appointment.status].border
                  } border-2`}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Time */}
                        <div className="flex flex-col items-center min-w-[80px]">
                          <Clock className="h-5 w-5 text-muted-foreground mb-1" />
                          <span className="text-sm font-medium">
                            {formatTime(appointment.startTime)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(appointment.endTime)}
                          </span>
                        </div>

                        {/* Pet Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <PawPrint className="h-4 w-4 text-muted-foreground" />
                            <h3 className="text-lg font-semibold">
                              {appointment.petName}
                            </h3>
                            {getStatusBadge(appointment.status)}
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p>
                              <span className="font-medium">Breed:</span>{" "}
                              {appointment.petBreed}
                            </p>
                            <p>
                              <span className="font-medium">Package:</span>{" "}
                              {appointment.packageName}
                            </p>
                            <div className="flex items-center gap-4 mt-2">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>{appointment.ownerName}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                <span>{appointment.ownerPhone}</span>
                              </div>
                            </div>
                            {appointment.notes && (
                              <p className="mt-2 text-xs italic">
                                {appointment.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 ml-4">
                        {appointment.status === "checked-in" && (
                          <Button
                            onClick={() => handleStartGroom(appointment)}
                            className="w-full"
                            size="sm"
                          >
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Start Groom
                          </Button>
                        )}
                        {appointment.status === "in-progress" && (
                          <>
                            <Button
                              onClick={() => handleMarkReady(appointment)}
                              className="w-full"
                              size="sm"
                              variant="default"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Mark Ready
                            </Button>
                            <Button
                              onClick={() => handleOpenNotes(appointment)}
                              className="w-full"
                              size="sm"
                              variant="outline"
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Add Notes
                            </Button>
                            <Button
                              onClick={() => handleOpenPhotoUpload(appointment)}
                              className="w-full"
                              size="sm"
                              variant="outline"
                            >
                              <Camera className="h-4 w-4 mr-2" />
                              Upload After Photo
                            </Button>
                          </>
                        )}
                        {appointment.status === "ready-for-pickup" && (
                          <>
                            <Button
                              onClick={() => handleOpenNotes(appointment)}
                              className="w-full"
                              size="sm"
                              variant="outline"
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Add Notes
                            </Button>
                            <Button
                              onClick={() => handleOpenPhotoUpload(appointment)}
                              className="w-full"
                              size="sm"
                              variant="outline"
                            >
                              <Camera className="h-4 w-4 mr-2" />
                              Upload After Photo
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes Modal */}
      <Dialog open={isNotesModalOpen} onOpenChange={setIsNotesModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Notes</DialogTitle>
            <DialogDescription>
              Add notes for {selectedAppointment?.petName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about the grooming session..."
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNotesModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNotes}>Save Notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Upload Modal */}
      <Dialog open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload After Photos</DialogTitle>
            <DialogDescription>
              Upload photos for {selectedAppointment?.petName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Existing Photos */}
            {afterPhotos.length > 0 && (
              <div className="space-y-2">
                <Label>Uploaded Photos</Label>
                <div className="grid grid-cols-3 gap-2">
                  {afterPhotos.map((photo, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-lg overflow-hidden border group"
                    >
                      <img
                        src={photo}
                        alt={`After photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload New Photos */}
            <div className="space-y-2">
              <Label>Add Photos</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-upload"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Photos
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPhotoModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSavePhotos}>Save Photos</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
