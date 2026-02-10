"use client";

import { useState, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import {
  petPhotos,
  vaccinationRecords,
  reportCards,
} from "@/data/pet-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Syringe,
  Edit,
  Save,
  X,
  Upload,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
} from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { AddVaccinationModal } from "@/components/customer/AddVaccinationModal";
import { vaccinationRules } from "@/data/settings";
import { facilityConfig } from "@/data/facility-config";
import { PhotoAlbums } from "@/components/customer/PhotoAlbums";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

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
  imageUrl?: string;
}

export default function CustomerPetDetailPage({
  params,
}: {
  params: Promise<{ petId: string }>;
}) {
  const { petId } = use(params);
  const router = useRouter();
  const { selectedFacility } = useCustomerFacility();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [isSaving, setIsSaving] = useState(false);
  const [vaccinationModalOpen, setVaccinationModalOpen] = useState(false);

  const customer = useMemo(
    () => clients.find((c) => c.id === MOCK_CUSTOMER_ID),
    []
  );
  const pet = customer?.pets.find((p) => p.id === parseInt(petId));

  const [editedPet, setEditedPet] = useState<Pet | null>(pet || null);

  if (!customer || !pet) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Pet not found</h2>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/customer/pets")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Pets
          </Button>
        </div>
      </div>
    );
  }

  const photos = petPhotos.filter((p) => p.petId === pet.id);
  const vaccinations = vaccinationRecords.filter((v) => v.petId === pet.id);
  const petBookings = bookings.filter(
    (b) => b.petId === pet.id && b.facilityId === selectedFacility?.id
  );
  const reports = reportCards.filter((r) => r.petId === pet.id);

  const expiredVaccinations = vaccinations.filter(
    (v) => new Date(v.expiryDate) < new Date()
  );
  const now = new Date();
  const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const upcomingVaccinations = vaccinations.filter(
    (v) =>
      new Date(v.expiryDate) <= sixtyDaysFromNow &&
      new Date(v.expiryDate) > now
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getVaccinationStatus = (vaccination: typeof vaccinationRecords[0]) => {
    const expiryDate = new Date(vaccination.expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.floor(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
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
      return {
        status: "valid",
        color: "success",
        days: daysUntilExpiry,
      };
    }
  };

  const handleSave = async () => {
    if (!editedPet) return;

    setIsSaving(true);
    try {
      // TODO: Replace with actual API call
      await updatePetProfile(editedPet);
      setIsEditing(false);
      toast.success("Pet profile updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update pet profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedPet(pet);
    setIsEditing(false);
  };

  // Placeholder function - replace with actual API call
  const updatePetProfile = async (petData: Pet) => {
    // TODO: API call to update pet profile
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  // Get facility vaccination requirements
  const facilityRequirements = useMemo(() => {
    return facilityConfig.vaccinationRequirements.requiredVaccinations.filter(
      (v) => v.required
    );
  }, []);

  // Check vaccination status against facility requirements
  const getVaccinationCompliance = useMemo(() => {
    const compliance: {
      required: string[];
      missing: string[];
      expired: string[];
      expiringSoon: string[];
      upToDate: string[];
    } = {
      required: [],
      missing: [],
      expired: [],
      expiringSoon: [],
      upToDate: [],
    };

    facilityRequirements.forEach((req) => {
      compliance.required.push(req.name);
      const petVaccination = vaccinations.find(
        (v) => v.vaccineName.toLowerCase().includes(req.name.toLowerCase()) ||
              req.name.toLowerCase().includes(v.vaccineName.toLowerCase())
      );

      if (!petVaccination) {
        compliance.missing.push(req.name);
      } else {
        const status = getVaccinationStatus(petVaccination);
        if (status.status === "expired") {
          compliance.expired.push(req.name);
        } else if (status.status === "expiring-soon") {
          compliance.expiringSoon.push(req.name);
        } else {
          compliance.upToDate.push(req.name);
        }
      }
    });

    return compliance;
  }, [facilityRequirements, vaccinations]);

  const handleAddVaccination = async (vaccination: Omit<typeof vaccinationRecords[0], "id">) => {
    // TODO: Replace with actual API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success("Vaccination record added successfully!");
    // Refresh vaccinations list
    router.refresh();
  };

  const PetIcon = pet.type === "Cat" ? Cat : Dog;

  // Vaccination columns
  const vaccinationColumns: ColumnDef<typeof vaccinationRecords[0]>[] = [
    {
      key: "vaccineName",
      label: "Vaccine",
      render: (vaccination) => (
        <div className="font-medium">{vaccination.vaccineName}</div>
      ),
    },
    {
      key: "administeredDate",
      label: "Administered",
      render: (vaccination) => formatDate(vaccination.administeredDate),
    },
    {
      key: "expiryDate",
      label: "Expires",
      render: (vaccination) => {
        const status = getVaccinationStatus(vaccination);
        return (
          <div className="flex items-center gap-2">
            <span>{formatDate(vaccination.expiryDate)}</span>
            <Badge variant={status.color as any} className="text-xs">
              {status.status === "expired"
                ? `Expired ${status.days}d ago`
                : status.status === "expiring-soon"
                  ? `Expires in ${status.days}d`
                  : `Valid`}
            </Badge>
          </div>
        );
      },
    },
    {
      key: "veterinarianName",
      label: "Veterinarian",
      render: (vaccination) => vaccination.veterinarianName || "—",
    },
    {
      key: "documentUrl",
      label: "Document",
      render: (vaccination) =>
        vaccination.documentUrl ? (
          <Button variant="ghost" size="sm" asChild>
            <a href={vaccination.documentUrl} target="_blank" rel="noopener noreferrer">
              <FileText className="h-4 w-4 mr-1" />
              View
            </a>
          </Button>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  // Booking history columns
  const bookingColumns: ColumnDef<typeof bookings[0]>[] = [
    {
      key: "service",
      label: "Service",
      render: (booking) => (
        <Badge variant="outline" className="capitalize">
          {booking.service}
        </Badge>
      ),
    },
    {
      key: "date",
      label: "Date",
      render: (booking) => formatDate(booking.startDate),
    },
    {
      key: "status",
      label: "Status",
      render: (booking) => (
        <Badge
          variant={
            booking.status === "completed"
              ? "default"
              : booking.status === "confirmed"
                ? "default"
                : booking.status === "cancelled"
                  ? "destructive"
                  : "secondary"
          }
        >
          {booking.status}
        </Badge>
      ),
    },
    {
      key: "totalCost",
      label: "Total",
      render: (booking) => `$${booking.totalCost.toFixed(2)}`,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/customer/pets")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{pet.name}</h1>
              <p className="text-muted-foreground">
                {pet.breed} • {pet.age} {pet.age === 1 ? "year" : "years"} old
              </p>
            </div>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Save className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Pet Photo and Basic Info */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <div className="w-32 h-32 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                {pet.imageUrl ? (
                  <img
                    src={pet.imageUrl}
                    alt={pet.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <PetIcon className="h-16 w-16 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium capitalize">{pet.type}</p>
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
                  <p className="font-medium">{pet.weight} lbs</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="vaccinations">
              Vaccinations
              {expiredVaccinations.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {expiredVaccinations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="bookings">Booking History</TabsTrigger>
            <TabsTrigger value="reports">Report Cards</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditing && editedPet ? (
                    <>
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
                        <Label htmlFor="breed">Breed</Label>
                        <Input
                          id="breed"
                          value={editedPet.breed}
                          onChange={(e) =>
                            setEditedPet({ ...editedPet, breed: e.target.value })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="age">Age</Label>
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
                          <Label htmlFor="weight">Weight (lbs)</Label>
                          <Input
                            id="weight"
                            type="number"
                            value={editedPet.weight}
                            onChange={(e) =>
                              setEditedPet({
                                ...editedPet,
                                weight: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
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
                      <div className="space-y-2">
                        <Label htmlFor="microchip">Microchip Number</Label>
                        <Input
                          id="microchip"
                          value={editedPet.microchip}
                          onChange={(e) =>
                            setEditedPet({ ...editedPet, microchip: e.target.value })
                          }
                          className="font-mono"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">{pet.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Breed</p>
                        <p className="font-medium">{pet.breed}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Age</p>
                          <p className="font-medium">
                            {pet.age} {pet.age === 1 ? "year" : "years"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Weight</p>
                          <p className="font-medium">{pet.weight} lbs</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Color</p>
                        <p className="font-medium">{pet.color}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Microchip</p>
                        <p className="font-medium font-mono text-sm">{pet.microchip}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">
                    Medical & Health Information
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
                            setEditedPet({ ...editedPet, allergies: e.target.value })
                          }
                          placeholder="List any allergies or leave as 'None'"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="specialNeeds">Special Needs</Label>
                        <Textarea
                          id="specialNeeds"
                          value={editedPet.specialNeeds}
                          onChange={(e) =>
                            setEditedPet({ ...editedPet, specialNeeds: e.target.value })
                          }
                          placeholder="Any special medical or care needs"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Allergies</p>
                        <Badge
                          variant={pet.allergies !== "None" ? "destructive" : "secondary"}
                        >
                          {pet.allergies}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Special Needs</p>
                        <p className="text-sm">{pet.specialNeeds || "None"}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Vaccinations Tab */}
          <TabsContent value="vaccinations" className="space-y-4">
            {/* Facility Requirements Status */}
            {facilityRequirements.length > 0 && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Syringe className="h-5 w-5" />
                    Facility Vaccination Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {getVaccinationCompliance.required.map((vaccine) => {
                    const isMissing = getVaccinationCompliance.missing.includes(vaccine);
                    const isExpired = getVaccinationCompliance.expired.includes(vaccine);
                    const isExpiringSoon = getVaccinationCompliance.expiringSoon.includes(vaccine);
                    const isUpToDate = getVaccinationCompliance.upToDate.includes(vaccine);

                    return (
                      <div
                        key={vaccine}
                        className="flex items-center justify-between p-3 rounded-lg border bg-background"
                      >
                        <div className="flex items-center gap-3">
                          {isUpToDate ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : isExpiringSoon ? (
                            <AlertTriangle className="h-5 w-5 text-warning" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive" />
                          )}
                          <div>
                            <p className="font-medium">{vaccine}</p>
                            <p className="text-xs text-muted-foreground">
                              {isMissing
                                ? "Missing - Required for booking"
                                : isExpired
                                  ? "Expired - Update required"
                                  : isExpiringSoon
                                    ? "Expiring soon - Update recommended"
                                    : "Up to date"}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            isUpToDate
                              ? "default"
                              : isExpiringSoon
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {isUpToDate
                            ? "Current"
                            : isExpiringSoon
                              ? "Expiring Soon"
                              : isExpired
                                ? "Expired"
                                : "Missing"}
                        </Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Vaccination Records</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVaccinationModalOpen(true)}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Record
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {vaccinations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Syringe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No vaccination records yet</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      size="sm"
                      onClick={() => setVaccinationModalOpen(true)}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload First Record
                    </Button>
                  </div>
                ) : (
                  <>
                    {expiredVaccinations.length > 0 && (
                      <div className="mb-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                          <p className="font-semibold text-destructive">
                            {expiredVaccinations.length} Expired Vaccination
                            {expiredVaccinations.length > 1 ? "s" : ""}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Please update expired vaccinations to continue booking services.
                        </p>
                      </div>
                    )}
                    {upcomingVaccinations.length > 0 && (
                      <div className="mb-4 p-4 rounded-lg bg-warning/10 border border-warning/20">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-5 w-5 text-warning" />
                          <p className="font-semibold text-warning">
                            {upcomingVaccinations.length} Vaccination
                            {upcomingVaccinations.length > 1 ? "s" : ""} Expiring Soon
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Update these vaccinations within the next 60 days.
                        </p>
                      </div>
                    )}
                    <DataTable data={vaccinations} columns={vaccinationColumns} />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Booking History Tab */}
          <TabsContent value="bookings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Booking History</CardTitle>
              </CardHeader>
              <CardContent>
                {petBookings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No bookings yet</p>
                    <Button variant="outline" className="mt-4" asChild>
                      <a href="/customer/bookings">Book a Service</a>
                    </Button>
                  </div>
                ) : (
                  <DataTable data={petBookings} columns={bookingColumns} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Report Cards Tab */}
          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Report Cards</CardTitle>
              </CardHeader>
              <CardContent>
                {reports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No report cards yet</p>
                    <p className="text-sm mt-2">
                      Report cards will appear here after your pet's visits
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reports.map((report) => (
                      <Card key={report.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-base">
                                {report.serviceType} Report Card
                              </CardTitle>
                              <CardDescription>{formatDate(report.date)}</CardDescription>
                            </div>
                            <Badge variant="outline" className="capitalize">
                              {report.mood}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {report.photos.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">Photos</p>
                              <div className="grid grid-cols-4 gap-2">
                                {report.photos.map((photo, idx) => (
                                  <div
                                    key={idx}
                                    className="aspect-square rounded-lg bg-muted overflow-hidden"
                                  >
                                    <img
                                      src={photo}
                                      alt={`Photo ${idx + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {report.activities.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">Activities</p>
                              <div className="flex flex-wrap gap-2">
                                {report.activities.map((activity, idx) => (
                                  <Badge key={idx} variant="secondary">
                                    {activity}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Do not display internal staff notes in the customer view */}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Photo Gallery</CardTitle>
                <CardDescription>
                  Photos from your pet's stays, organized by date
                </CardDescription>
              </CardHeader>
              <CardContent>
                {photos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No photos yet</p>
                    <p className="text-sm mt-2">
                      Photos from your pet's stays will appear here
                    </p>
                  </div>
                ) : (
                  <PhotoAlbums
                    photos={photos}
                    bookings={petBookings}
                    reportCards={reports}
                    formatDate={formatDate}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Vaccination Modal */}
        <AddVaccinationModal
          open={vaccinationModalOpen}
          onOpenChange={setVaccinationModalOpen}
          petId={pet.id}
          petName={pet.name}
          onSave={handleAddVaccination}
        />
      </div>
    </div>
  );
}
