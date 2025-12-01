"use client";

import { useState } from "react";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Bell, Camera } from "lucide-react";
import { clients } from "@/data/clients";

interface PetUpdateModalProps {
  onClose: () => void;
}

export function PetUpdateModal({ onClose }: PetUpdateModalProps) {
  const [formData, setFormData] = useState({
    clientId: "",
    petId: "",
    updateType: "",
    message: "",
  });

  const [photoAttached, setPhotoAttached] = useState(false);

  // One-tap update types
  const quickUpdates = [
    { type: "eating", emoji: "🍽️", label: "Eating Now", defaultMessage: "{{pet_name}} is enjoying their meal!" },
    { type: "potty", emoji: "🚽", label: "Potty Break", defaultMessage: "{{pet_name}} just had a potty break - all good!" },
    { type: "playtime", emoji: "🎾", label: "Play Time", defaultMessage: "{{pet_name}} is having fun playing!" },
    { type: "naptime", emoji: "😴", label: "Nap Time", defaultMessage: "{{pet_name}} is taking a nice nap." },
    { type: "medication", emoji: "💊", label: "Medication", defaultMessage: "{{pet_name}} received their medication." },
    { type: "grooming", emoji: "✂️", label: "Grooming", defaultMessage: "{{pet_name}} is getting groomed." },
  ];

  const handleQuickUpdate = (type: string, defaultMessage: string) => {
    const selectedClient = clients.find((c) => c.id.toString() === formData.clientId);
    const selectedPet = selectedClient?.pets.find((p) => p.id.toString() === formData.petId);
    
    const message = selectedPet 
      ? defaultMessage.replace("{{pet_name}}", selectedPet.name)
      : defaultMessage;

    setFormData({
      ...formData,
      updateType: type,
      message,
    });
  };

  const handlePhotoAttach = () => {
    // In a real app, would open camera/file picker
    setPhotoAttached(!photoAttached);
  };

  const handleSend = () => {
    console.log("Sending pet update:", formData, "Photo attached:", photoAttached);
    onClose();
  };

  const selectedClient = clients.find((c) => c.id.toString() === formData.clientId);
  const pets = selectedClient?.pets || [];

  return (
    <>
      <DialogHeader>
        <DialogTitle>Send Pet Update</DialogTitle>
        <DialogDescription>
          Quick updates with one-tap buttons - notifies owner via push notification
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Client Selection */}
        <div className="space-y-2">
          <Label htmlFor="client">Select Client *</Label>
          <Select
            value={formData.clientId}
            onValueChange={(value) => setFormData({ ...formData, clientId: value, petId: "" })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id.toString()}>
                  {client.name} - {client.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Pet Selection */}
        {formData.clientId && (
          <div className="space-y-2">
            <Label htmlFor="pet">Select Pet *</Label>
            <Select
              value={formData.petId}
              onValueChange={(value) => setFormData({ ...formData, petId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a pet" />
              </SelectTrigger>
              <SelectContent>
                {pets.map((pet) => (
                  <SelectItem key={pet.id} value={pet.id.toString()}>
                    {pet.name} ({pet.type} - {pet.breed})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* One-Tap Quick Update Buttons */}
        {formData.petId && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Label className="text-base">Quick Update Buttons</Label>
              <p className="text-sm text-muted-foreground">
                Tap a button for instant update with pre-filled message
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {quickUpdates.map((update) => (
                  <Button
                    key={update.type}
                    variant={formData.updateType === update.type ? "default" : "outline"}
                    className="h-20 flex-col gap-2"
                    onClick={() => handleQuickUpdate(update.type, update.defaultMessage)}
                  >
                    <span className="text-2xl">{update.emoji}</span>
                    <span className="text-sm">{update.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Custom Message */}
        {formData.updateType && (
          <>
            <div className="space-y-2">
              <Label htmlFor="message">Update Message *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Enter update message..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                You can edit the pre-filled message or write your own
              </p>
            </div>

            {/* Photo Attachment */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Attach Photo (Optional)</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add a photo to make the update more personal
                    </p>
                  </div>
                  <Button
                    variant={photoAttached ? "default" : "outline"}
                    onClick={handlePhotoAttach}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {photoAttached ? "Photo Added" : "Add Photo"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Notification Preview */}
            <Card>
              <CardContent className="pt-6">
                <Label className="text-base mb-3 block">Push Notification Preview</Label>
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    <span className="font-semibold">PawCare Facility</span>
                  </div>
                  <div className="text-sm">
                    <strong>{pets.find((p) => p.id.toString() === formData.petId)?.name} Update:</strong>{" "}
                    {formData.message}
                  </div>
                  <div className="text-xs text-muted-foreground">Just now</div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSend}
          disabled={!formData.clientId || !formData.petId || !formData.message}
        >
          <Bell className="h-4 w-4 mr-2" />
          Send Update & Notify Owner
        </Button>
      </DialogFooter>
    </>
  );
}

