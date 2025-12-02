"use client";

import { useState } from "react";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Camera, X, UserPlus } from "lucide-react";
import { clients } from "@/data/clients";

interface CreateIncidentModalProps {
  onClose: () => void;
}

export function CreateIncidentModal({ onClose }: CreateIncidentModalProps) {
  const [formData, setFormData] = useState({
    type: "" as
      | "injury"
      | "illness"
      | "behavioral"
      | "accident"
      | "escape"
      | "fight"
      | "other"
      | "",
    severity: "" as "low" | "medium" | "high" | "critical" | "",
    title: "",
    description: "",
    internalNotes: "",
    clientFacingNotes: "",
    incidentDate: new Date().toISOString().slice(0, 16),
    selectedPets: [] as { id: number; name: string; clientName: string }[],
    staffInvolved: [] as string[],
    reportedBy: "",
    notifyManager: true,
    notifyClient: false,
  });

  const [photos, setPhotos] = useState<
    { id: string; url: string; caption: string; isClientVisible: boolean }[]
  >([]);
  const [newStaffMember, setNewStaffMember] = useState("");

  // All pets from all clients
  const allPets = clients.flatMap((client) =>
    client.pets.map((pet) => ({
      id: pet.id,
      name: pet.name,
      type: pet.type,
      breed: pet.breed,
      clientName: client.name,
    })),
  );

  const staffMembers = [
    "Sarah Johnson",
    "Mike Davis",
    "Emily Brown",
    "Emma Wilson",
    "John Smith",
  ];

  const incidentTypes = [
    { value: "injury", label: "Injury", emoji: "🩹" },
    { value: "illness", label: "Illness", emoji: "🤒" },
    { value: "behavioral", label: "Behavioral", emoji: "🐕" },
    { value: "accident", label: "Accident", emoji: "💧" },
    { value: "escape", label: "Escape Attempt", emoji: "🚪" },
    { value: "fight", label: "Fight/Altercation", emoji: "⚠️" },
    { value: "other", label: "Other", emoji: "📝" },
  ];

  const severityLevels = [
    {
      value: "low",
      label: "Low",
      desc: "Minor issue, no immediate action required",
      color: "text-green-600",
    },
    {
      value: "medium",
      label: "Medium",
      desc: "Requires attention and monitoring",
      color: "text-yellow-600",
    },
    {
      value: "high",
      label: "High",
      desc: "Serious issue, immediate action needed",
      color: "text-orange-600",
    },
    {
      value: "critical",
      label: "Critical",
      desc: "Emergency situation, urgent response required",
      color: "text-red-600",
    },
  ];

  const handleAddPet = (petId: string) => {
    const pet = allPets.find((p) => p.id.toString() === petId);
    if (pet && !formData.selectedPets.find((p) => p.id === pet.id)) {
      setFormData({
        ...formData,
        selectedPets: [...formData.selectedPets, pet],
      });
    }
  };

  const handleRemovePet = (petId: number) => {
    setFormData({
      ...formData,
      selectedPets: formData.selectedPets.filter((p) => p.id !== petId),
    });
  };

  const handleAddStaff = (staff: string) => {
    if (!formData.staffInvolved.includes(staff)) {
      setFormData({
        ...formData,
        staffInvolved: [...formData.staffInvolved, staff],
      });
    }
  };

  const handleRemoveStaff = (staff: string) => {
    setFormData({
      ...formData,
      staffInvolved: formData.staffInvolved.filter((s) => s !== staff),
    });
  };

  const handleAddCustomStaff = () => {
    if (newStaffMember && !formData.staffInvolved.includes(newStaffMember)) {
      setFormData({
        ...formData,
        staffInvolved: [...formData.staffInvolved, newStaffMember],
      });
      setNewStaffMember("");
    }
  };

  const handleAddPhoto = () => {
    // In a real app, would open camera/file picker
    const newPhoto = {
      id: `photo-${Date.now()}`,
      url: `/images/incidents/photo-${photos.length + 1}.jpg`,
      caption: "",
      isClientVisible: false,
    };
    setPhotos([...photos, newPhoto]);
  };

  const handleRemovePhoto = (photoId: string) => {
    setPhotos(photos.filter((p) => p.id !== photoId));
  };

  const handlePhotoVisibilityToggle = (photoId: string) => {
    setPhotos(
      photos.map((p) =>
        p.id === photoId ? { ...p, isClientVisible: !p.isClientVisible } : p,
      ),
    );
  };

  const handleSubmit = () => {
    console.log("Creating incident:", formData, "Photos:", photos);
    onClose();
  };

  const selectedSeverity = severityLevels.find(
    (s) => s.value === formData.severity,
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Report New Incident
        </DialogTitle>
        <DialogDescription>
          Document incidents with full details, photos, and automatic
          notifications
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Incident Type & Severity */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">Incident Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(
                value:
                  | "injury"
                  | "illness"
                  | "behavioral"
                  | "accident"
                  | "escape"
                  | "fight"
                  | "other",
              ) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {incidentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <span className="mr-2">{type.emoji}</span>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="severity">Severity Level *</Label>
            <Select
              value={formData.severity}
              onValueChange={(value: "low" | "medium" | "high" | "critical") =>
                setFormData({ ...formData, severity: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                {severityLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    <div>
                      <div className={`font-semibold ${level.color}`}>
                        {level.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {level.desc}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSeverity && (
              <p className={`text-xs ${selectedSeverity.color}`}>
                {selectedSeverity.desc}
              </p>
            )}
          </div>
        </div>

        {/* Incident Date/Time */}
        <div className="space-y-2">
          <Label htmlFor="incidentDate">Incident Date & Time *</Label>
          <Input
            id="incidentDate"
            type="datetime-local"
            value={formData.incidentDate}
            onChange={(e) =>
              setFormData({ ...formData, incidentDate: e.target.value })
            }
          />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Incident Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            placeholder="Brief description of the incident"
          />
        </div>

        {/* Pets Involved */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Pets Involved *</Label>
              <Select onValueChange={handleAddPet}>
                <SelectTrigger>
                  <SelectValue placeholder="Add a pet" />
                </SelectTrigger>
                <SelectContent>
                  {allPets.map((pet) => (
                    <SelectItem key={pet.id} value={pet.id.toString()}>
                      {pet.name} ({pet.type} - {pet.breed}) - Owner:{" "}
                      {pet.clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.selectedPets.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.selectedPets.map((pet) => (
                  <Badge
                    key={pet.id}
                    variant="default"
                    className="text-sm py-1 px-3"
                  >
                    {pet.name} ({pet.clientName})
                    <button
                      className="ml-2"
                      onClick={() => handleRemovePet(pet.id)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Staff Involved */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Staff Involved</Label>
              <div className="flex gap-2">
                <Select onValueChange={handleAddStaff}>
                  <SelectTrigger>
                    <SelectValue placeholder="Add staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffMembers.map((staff) => (
                      <SelectItem key={staff} value={staff}>
                        {staff}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2 flex-1">
                  <Input
                    placeholder="Or type name"
                    value={newStaffMember}
                    onChange={(e) => setNewStaffMember(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddCustomStaff}
                    disabled={!newStaffMember}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {formData.staffInvolved.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.staffInvolved.map((staff) => (
                  <Badge
                    key={staff}
                    variant="secondary"
                    className="text-sm py-1 px-3"
                  >
                    {staff}
                    <button
                      className="ml-2"
                      onClick={() => handleRemoveStaff(staff)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reported By */}
        <div className="space-y-2">
          <Label htmlFor="reportedBy">Reported By *</Label>
          <Select
            value={formData.reportedBy}
            onValueChange={(value) =>
              setFormData({ ...formData, reportedBy: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select reporter" />
            </SelectTrigger>
            <SelectContent>
              {staffMembers.map((staff) => (
                <SelectItem key={staff} value={staff}>
                  {staff}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Incident Description *</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Detailed description of what happened..."
            rows={4}
          />
        </div>

        {/* Internal Notes */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="internalNotes" className="text-base">
                  Internal Notes
                </Label>
                <Badge variant="secondary">Staff Only</Badge>
              </div>
              <Textarea
                id="internalNotes"
                value={formData.internalNotes}
                onChange={(e) =>
                  setFormData({ ...formData, internalNotes: e.target.value })
                }
                placeholder="Internal details, actions taken, observations (not visible to clients)..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                These notes are for internal use only and won&apos;t be shared
                with clients
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Client-Facing Notes */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="clientFacingNotes" className="text-base">
                  Client-Facing Notes
                </Label>
                <Badge variant="default">Visible to Clients</Badge>
              </div>
              <Textarea
                id="clientFacingNotes"
                value={formData.clientFacingNotes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    clientFacingNotes: e.target.value,
                  })
                }
                placeholder="What to communicate to the pet owner..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This version will be shared with clients if you choose to notify
                them
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Photos */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Incident Photos</Label>
              <Button variant="outline" size="sm" onClick={handleAddPhoto}>
                <Camera className="h-4 w-4 mr-2" />
                Add Photo
              </Button>
            </div>

            {photos.length > 0 && (
              <div className="space-y-3">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="p-3 border rounded-lg space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="text-sm font-medium">{photo.url}</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePhoto(photo.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Photo caption"
                      value={photo.caption}
                      onChange={(e) =>
                        setPhotos(
                          photos.map((p) =>
                            p.id === photo.id
                              ? { ...p, caption: e.target.value }
                              : p,
                          ),
                        )
                      }
                    />
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`visible-${photo.id}`}
                        checked={photo.isClientVisible}
                        onCheckedChange={() =>
                          handlePhotoVisibilityToggle(photo.id)
                        }
                      />
                      <label
                        htmlFor={`visible-${photo.id}`}
                        className="text-sm cursor-pointer"
                      >
                        Make visible to client
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Label className="text-base">Notifications</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notifyManager"
                  checked={formData.notifyManager}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      notifyManager: checked as boolean,
                    })
                  }
                />
                <label
                  htmlFor="notifyManager"
                  className="text-sm cursor-pointer"
                >
                  Notify Manager immediately
                  {formData.severity === "critical" ||
                  formData.severity === "high" ? (
                    <Badge variant="destructive" className="ml-2">
                      Required for {formData.severity} severity
                    </Badge>
                  ) : null}
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notifyClient"
                  checked={formData.notifyClient}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      notifyClient: checked as boolean,
                    })
                  }
                />
                <label
                  htmlFor="notifyClient"
                  className="text-sm cursor-pointer"
                >
                  Notify pet owner(s) now
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={
            !formData.type ||
            !formData.severity ||
            !formData.title ||
            !formData.description ||
            formData.selectedPets.length === 0 ||
            !formData.reportedBy
          }
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Create Incident Report
        </Button>
      </DialogFooter>
    </>
  );
}
