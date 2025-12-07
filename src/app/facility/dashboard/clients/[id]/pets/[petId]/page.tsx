"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import {
  petPhotos,
  vaccinationRecords,
  reportCards,
  petRelationships,
} from "@/data/pet-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Dog,
  Cat,
  Calendar,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
  Activity,
  Utensils,
  Camera,
  Upload,
  Award,
  Syringe,
  Edit,
  Save,
  X,
  Heart,
  UserPlus,
  AlertTriangle,
  Users,
} from "lucide-react";

interface Pet {
  id: number;
  name: string;
  type: string;
  breed: string;
  age: number;
  weight: number;
  color: string;
  microchip: string;
  allergies: string;
  specialNeeds: string;
}

export default function PetDetailPage({
  params,
}: {
  params: Promise<{ id: string; petId: string }>;
}) {
  const { id, petId } = use(params);
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const client = clients.find((c) => c.id === parseInt(id));
  const pet = client?.pets.find((p) => p.id === parseInt(petId));

  const [editedPet, setEditedPet] = useState<Pet | null>(pet || null);

  if (!client || !pet) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Pet not found</h2>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push(`/facility/dashboard/clients/${id}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Client
          </Button>
        </div>
      </div>
    );
  }

  const photos = petPhotos.filter((p) => p.petId === pet.id);
  const vaccinations = vaccinationRecords.filter((v) => v.petId === pet.id);
  const petBookings = bookings.filter((b) => b.petId === pet.id);
  const reports = reportCards.filter((r) => r.petId === pet.id);
  const relationships = petRelationships.filter((r) => r.petId === pet.id);
  const friends = relationships.filter((r) => r.relationshipType === "friend");
  const enemies = relationships.filter((r) => r.relationshipType === "enemy");
  const totalStays = petBookings.filter((b) => b.status === "completed").length;
  const expiredVaccinations = vaccinations.filter(
    (v) => new Date(v.expiryDate) < new Date(),
  );
  const now = new Date();
  const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const upcomingVaccinations = vaccinations.filter(
    (v) =>
      new Date(v.expiryDate) <= sixtyDaysFromNow &&
      new Date(v.expiryDate) > now,
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getVaccinationStatus = (
    vaccination: (typeof vaccinationRecords)[0],
  ) => {
    const expiryDate = new Date(vaccination.expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.floor(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilExpiry < 0) {
      return {
        status: "expired",
        color: "destructive",
        days: Math.abs(daysUntilExpiry),
      };
    } else if (daysUntilExpiry <= 30) {
      return {
        status: "expiring-soon",
        color: "warning",
        days: daysUntilExpiry,
      };
    } else {
      return { status: "valid", color: "success", days: daysUntilExpiry };
    }
  };

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case "happy":
        return "bg-green-100 text-green-800";
      case "calm":
        return "bg-blue-100 text-blue-800";
      case "energetic":
        return "bg-orange-100 text-orange-800";
      case "anxious":
        return "bg-yellow-100 text-yellow-800";
      case "tired":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleSave = () => {
    // In a real app, this would save to the backend
    setIsEditing(false);
    // For now we just toggle edit mode off
  };

  const handleCancel = () => {
    setEditedPet(pet);
    setIsEditing(false);
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/facility/dashboard/clients/${id}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
              {pet.type === "Dog" ? (
                <Dog className="h-6 w-6 text-muted-foreground" />
              ) : (
                <Cat className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{pet.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">
                  {pet.type} • {pet.breed}
                </Badge>
                <Badge variant="secondary">
                  {pet.age} {pet.age === 1 ? "year" : "years"}
                </Badge>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Owner: {client.name}
          </p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-1" />
                Report
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalStays}</div>
            <div className="text-xs text-muted-foreground">Total Stays</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{photos.length}</div>
            <div className="text-xs text-muted-foreground">Photos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{vaccinations.length}</div>
            <div className="text-xs text-muted-foreground">Vaccinations</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{reports.length}</div>
            <div className="text-xs text-muted-foreground">Report Cards</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(expiredVaccinations.length > 0 || upcomingVaccinations.length > 0) && (
        <div className="space-y-2">
          {expiredVaccinations.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">
                {expiredVaccinations.length} vaccination
                {expiredVaccinations.length > 1 ? "s" : ""} expired - Update
                required
              </span>
            </div>
          )}
          {upcomingVaccinations.length > 0 &&
            expiredVaccinations.length === 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  {upcomingVaccinations.length} vaccination
                  {upcomingVaccinations.length > 1 ? "s" : ""} expiring within
                  60 days
                </span>
              </div>
            )}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="relationships">
            Relationships
            {enemies.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {enemies.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="vaccinations">Vaccinations</TabsTrigger>
          <TabsTrigger value="history">Stay History</TabsTrigger>
          <TabsTrigger value="reports">Report Cards</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing && editedPet ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={editedPet.name}
                      onChange={(e) =>
                        setEditedPet({ ...editedPet, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={editedPet.type}
                      onValueChange={(value) =>
                        setEditedPet({ ...editedPet, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Dog">Dog</SelectItem>
                        <SelectItem value="Cat">Cat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="breed">Breed</Label>
                    <Input
                      id="breed"
                      value={editedPet.breed}
                      onChange={(e) =>
                        setEditedPet({ ...editedPet, breed: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age">Age (years)</Label>
                    <Input
                      id="age"
                      type="number"
                      value={editedPet.age}
                      onChange={(e) =>
                        setEditedPet({
                          ...editedPet,
                          age: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      value={editedPet.weight}
                      onChange={(e) =>
                        setEditedPet({
                          ...editedPet,
                          weight: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      value={editedPet.color}
                      onChange={(e) =>
                        setEditedPet({ ...editedPet, color: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="microchip">Microchip</Label>
                    <Input
                      id="microchip"
                      value={editedPet.microchip}
                      onChange={(e) =>
                        setEditedPet({
                          ...editedPet,
                          microchip: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">{pet.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Breed</p>
                    <p className="font-medium">{pet.breed}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Age</p>
                    <p className="font-medium">
                      {pet.age} {pet.age === 1 ? "year" : "years"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Weight</p>
                    <p className="font-medium">{pet.weight} kg</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Color</p>
                    <p className="font-medium">{pet.color}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Microchip</p>
                    <p className="font-medium font-mono text-sm">
                      {pet.microchip}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Medical & Diet Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing && editedPet ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="allergies">Allergies</Label>
                    <Textarea
                      id="allergies"
                      value={editedPet.allergies}
                      onChange={(e) =>
                        setEditedPet({
                          ...editedPet,
                          allergies: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialNeeds">Special Needs</Label>
                    <Textarea
                      id="specialNeeds"
                      value={editedPet.specialNeeds}
                      onChange={(e) =>
                        setEditedPet({
                          ...editedPet,
                          specialNeeds: e.target.value,
                        })
                      }
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Allergies
                    </p>
                    <Badge
                      variant={
                        pet.allergies !== "None" ? "destructive" : "secondary"
                      }
                    >
                      {pet.allergies}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Special Needs
                    </p>
                    <p className="text-sm">{pet.specialNeeds}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Relationships Tab */}
        <TabsContent value="relationships" className="space-y-4">
          {/* Friends Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Heart className="h-4 w-4 text-green-600" />
                Friends ({friends.length})
              </CardTitle>
              <Button variant="outline" size="sm">
                <UserPlus className="h-4 w-4 mr-1" />
                Add Friend
              </Button>
            </CardHeader>
            <CardContent>
              {friends.length > 0 ? (
                <div className="space-y-3">
                  {friends.map((rel) => (
                    <div
                      key={rel.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                          {rel.relatedPetType === "Dog" ? (
                            <Dog className="h-5 w-5 text-green-600" />
                          ) : (
                            <Cat className="h-5 w-5 text-green-600" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">
                            {rel.relatedPetName}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {rel.relatedPetBreed}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200"
                        >
                          Friend
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {friends.map((rel) =>
                    rel.notes ? (
                      <div
                        key={`${rel.id}-notes`}
                        className="text-xs text-muted-foreground px-4 -mt-2"
                      >
                        Note: {rel.notes}
                      </div>
                    ) : null,
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No friends added yet
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enemies Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Keep Apart ({enemies.length})
              </CardTitle>
              <Button variant="outline" size="sm">
                <UserPlus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </CardHeader>
            <CardContent>
              {enemies.length > 0 ? (
                <div className="space-y-3">
                  {enemies.map((rel) => (
                    <div
                      key={rel.id}
                      className="p-4 rounded-lg border border-destructive/20 bg-destructive/5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                            {rel.relatedPetType === "Dog" ? (
                              <Dog className="h-5 w-5 text-destructive" />
                            ) : (
                              <Cat className="h-5 w-5 text-destructive" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm">
                              {rel.relatedPetName}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {rel.relatedPetBreed}
                            </p>
                          </div>
                        </div>
                        <Badge variant="destructive">Keep Apart</Badge>
                      </div>
                      {rel.notes && (
                        <div className="mt-3 p-2 rounded bg-destructive/10 text-xs text-destructive">
                          <AlertTriangle className="h-3 w-3 inline mr-1" />
                          {rel.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No pets to keep apart
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Photos Tab */}
        <TabsContent value="photos" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Photo Gallery
              </CardTitle>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-1" />
                Upload Photo
              </Button>
            </CardHeader>
            <CardContent>
              {photos.length > 0 ? (
                <div className="grid grid-cols-3 gap-4">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative group cursor-pointer"
                    >
                      <div className="aspect-square rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                      </div>
                      {photo.isPrimary && (
                        <Badge className="absolute top-2 right-2 text-xs">
                          Primary
                        </Badge>
                      )}
                      <div className="mt-2">
                        {photo.caption && (
                          <p className="text-xs text-muted-foreground truncate">
                            {photo.caption}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDate(photo.uploadedAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No photos yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vaccinations Tab */}
        <TabsContent value="vaccinations" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Vaccination Records
              </CardTitle>
              <Button variant="outline" size="sm">
                <Syringe className="h-4 w-4 mr-1" />
                Add Vaccination
              </Button>
            </CardHeader>
            <CardContent>
              {vaccinations.length > 0 ? (
                <div className="space-y-3">
                  {vaccinations
                    .sort(
                      (a, b) =>
                        new Date(b.administeredDate).getTime() -
                        new Date(a.administeredDate).getTime(),
                    )
                    .map((vax) => {
                      const status = getVaccinationStatus(vax);
                      return (
                        <div
                          key={vax.id}
                          className="flex items-start justify-between p-4 rounded-lg border bg-card"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-2 rounded-lg ${
                                status.status === "expired"
                                  ? "bg-destructive/10"
                                  : status.status === "expiring-soon"
                                    ? "bg-yellow-100"
                                    : "bg-green-100"
                              }`}
                            >
                              <Syringe
                                className={`h-4 w-4 ${
                                  status.status === "expired"
                                    ? "text-destructive"
                                    : status.status === "expiring-soon"
                                      ? "text-yellow-600"
                                      : "text-green-600"
                                }`}
                              />
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm">
                                {vax.vaccineName}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                Administered: {formatDate(vax.administeredDate)}
                              </p>
                              {vax.veterinarianName && (
                                <p className="text-xs text-muted-foreground">
                                  By: {vax.veterinarianName}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant={
                                status.status === "expired"
                                  ? "destructive"
                                  : status.status === "expiring-soon"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {status.status === "expired"
                                ? `Expired ${status.days} days ago`
                                : status.status === "expiring-soon"
                                  ? `Expires in ${status.days} days`
                                  : `Valid for ${status.days} days`}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              Expires: {formatDate(vax.expiryDate)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Syringe className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No vaccination records
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stay History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Stay History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {petBookings.length > 0 ? (
                <div className="space-y-3">
                  {petBookings
                    .sort(
                      (a, b) =>
                        new Date(b.startDate).getTime() -
                        new Date(a.startDate).getTime(),
                    )
                    .map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-muted transition-colors cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm">
                              {booking.service}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(booking.startDate)} -{" "}
                              {formatDate(booking.endDate)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={
                              booking.status === "completed"
                                ? "outline"
                                : booking.status === "confirmed"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {booking.status}
                          </Badge>
                          <p className="text-sm font-medium mt-1">
                            ${booking.totalCost}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No booking history
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report Cards Tab */}
        <TabsContent value="reports" className="space-y-4">
          {reports.length > 0 ? (
            reports
              .sort(
                (a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime(),
              )
              .map((report) => (
                <Card key={report.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm font-semibold">
                          {formatDate(report.date)}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          By: {report.createdBy}
                        </p>
                      </div>
                      <Badge className={getMoodColor(report.mood)}>
                        {report.mood}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Activities */}
                    {report.activities.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          Activities
                        </h4>
                        <ul className="space-y-1">
                          {report.activities.map((activity, idx) => (
                            <li
                              key={idx}
                              className="text-sm text-muted-foreground flex items-start gap-2"
                            >
                              <span className="text-primary mt-1">•</span>
                              {activity}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Meals */}
                    {report.meals.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <Utensils className="h-4 w-4" />
                          Meals
                        </h4>
                        <div className="space-y-2">
                          {report.meals.map((meal, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 rounded bg-muted/50"
                            >
                              <div>
                                <p className="text-sm font-medium">
                                  {meal.time} - {meal.food}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {meal.amount}
                                </p>
                              </div>
                              <Badge variant="outline" className="capitalize">
                                {meal.consumed}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Potty Breaks */}
                    {report.pottyBreaks.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Potty Breaks
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {report.pottyBreaks.map((potty, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-xs"
                            >
                              {potty.time} - {potty.type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Photos */}
                    {report.photos.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <Camera className="h-4 w-4" />
                          Photos ({report.photos.length})
                        </h4>
                        <div className="grid grid-cols-4 gap-2">
                          {report.photos.map((photo, idx) => (
                            <div
                              key={idx}
                              className="aspect-square rounded-lg bg-muted flex items-center justify-center"
                            >
                              <ImageIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Staff Notes */}
                    {report.staffNotes && (
                      <div className="pt-3 border-t">
                        <h4 className="text-sm font-semibold mb-1">
                          Staff Notes
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {report.staffNotes}
                        </p>
                      </div>
                    )}

                    {report.sentToOwner && report.sentAt && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                        <CheckCircle className="h-3 w-3" />
                        Sent to owner on {formatDateTime(report.sentAt)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Award className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No report cards yet
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
