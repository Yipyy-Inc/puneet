"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Heart,
  Calendar,
  FileText,
  Image as ImageIcon,
  Syringe,
  History,
  Award,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  Clock,
  MapPin,
  Activity,
  Utensils,
  Smile,
  Camera,
} from "lucide-react";
import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import { petPhotos, vaccinationRecords, reportCards } from "@/data/pet-data";

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
  owner: string;
  ownerId: number;
  ownerEmail: string;
  ownerPhone?: string;
}

interface PetModalProps {
  pet: Pet;
}

export function PetModal({ pet }: PetModalProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Get pet-specific data
  const photos = petPhotos.filter((p) => p.petId === pet.id);
  const vaccinations = vaccinationRecords.filter((v) => v.petId === pet.id);
  const petBookings = bookings.filter((b) => b.petId === pet.id);
  const reports = reportCards.filter((r) => r.petId === pet.id);

  // Calculate stats
  const totalStays = petBookings.filter((b) => b.status === "completed").length;
  const upcomingVaccinations = vaccinations.filter(
    (v) => new Date(v.expiryDate) <= new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
  );
  const expiredVaccinations = vaccinations.filter((v) => new Date(v.expiryDate) < new Date());

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

  const getVaccinationStatus = (vaccination: (typeof vaccinations)[0]) => {
    const expiryDate = new Date(vaccination.expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.floor(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilExpiry < 0) {
      return { status: "expired", color: "destructive", days: Math.abs(daysUntilExpiry) };
    } else if (daysUntilExpiry <= 30) {
      return { status: "expiring-soon", color: "warning", days: daysUntilExpiry };
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

  const primaryPhoto = photos.find((p) => p.isPrimary) || photos[0];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {primaryPhoto ? (
            <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
              <Heart className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold">{pet.name}</h2>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">
                {pet.type} • {pet.breed}
              </Badge>
              <Badge variant="secondary">
                {pet.age} {pet.age === 1 ? "year" : "years"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Owner: {pet.owner} • {pet.ownerEmail}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-1" />
            Book
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-1" />
            Report
          </Button>
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
                {expiredVaccinations.length} vaccination{expiredVaccinations.length > 1 ? "s" : ""}{" "}
                expired - Update required
              </span>
            </div>
          )}
          {upcomingVaccinations.length > 0 && expiredVaccinations.length === 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                {upcomingVaccinations.length} vaccination{upcomingVaccinations.length > 1 ? "s" : ""}{" "}
                expiring within 60 days
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="vaccinations">Vaccinations</TabsTrigger>
          <TabsTrigger value="history">Stay History</TabsTrigger>
          <TabsTrigger value="reports">Report Cards</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Basic Information</CardTitle>
            </CardHeader>
            <CardContent>
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
                  <p className="font-medium font-mono text-sm">{pet.microchip}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Medical & Diet Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Allergies</p>
                <Badge variant={pet.allergies !== "None" ? "destructive" : "secondary"}>
                  {pet.allergies}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Special Needs</p>
                <p className="text-sm">{pet.specialNeeds}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Photos Tab */}
        <TabsContent value="photos" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Photo Gallery</CardTitle>
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
                      onClick={() => setSelectedPhoto(photo.url)}
                    >
                      <div className="aspect-square rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                      </div>
                      {photo.isPrimary && (
                        <Badge className="absolute top-2 right-2 text-xs">Primary</Badge>
                      )}
                      <div className="mt-2">
                        {photo.caption && (
                          <p className="text-xs text-muted-foreground truncate">{photo.caption}</p>
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
              <CardTitle className="text-sm font-semibold">Vaccination Records</CardTitle>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-1" />
                Add Record
              </Button>
            </CardHeader>
            <CardContent>
              {vaccinations.length > 0 ? (
                <div className="space-y-3">
                  {vaccinations
                    .sort((a, b) => new Date(b.administeredDate).getTime() - new Date(a.administeredDate).getTime())
                    .map((vacc) => {
                      const status = getVaccinationStatus(vacc);
                      return (
                        <div
                          key={vacc.id}
                          className="p-4 rounded-lg border bg-card space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <Syringe className="h-4 w-4 mt-1 text-muted-foreground" />
                              <div className="flex-1">
                                <h4 className="font-semibold text-sm">{vacc.vaccineName}</h4>
                                {vacc.veterinarianName && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Dr. {vacc.veterinarianName}
                                    {vacc.veterinaryClinic && ` • ${vacc.veterinaryClinic}`}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge
                              variant={
                                status.status === "expired"
                                  ? "destructive"
                                  : status.status === "expiring-soon"
                                    ? "default"
                                    : "secondary"
                              }
                              className="text-xs"
                            >
                              {status.status === "expired"
                                ? "Expired"
                                : status.status === "expiring-soon"
                                  ? `${status.days}d left`
                                  : "Valid"}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="text-muted-foreground">Administered</p>
                              <p className="font-medium">{formatDate(vacc.administeredDate)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Expires</p>
                              <p className="font-medium">{formatDate(vacc.expiryDate)}</p>
                            </div>
                          </div>
                          {vacc.notes && (
                            <p className="text-xs text-muted-foreground pt-2 border-t">
                              {vacc.notes}
                            </p>
                          )}
                          {vacc.documentUrl && (
                            <Button variant="ghost" size="sm" className="w-full mt-2">
                              <Download className="h-3 w-3 mr-1" />
                              Download Certificate
                            </Button>
                          )}
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Syringe className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No vaccination records</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stay History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Stay History</CardTitle>
            </CardHeader>
            <CardContent>
              {petBookings.length > 0 ? (
                <div className="space-y-3">
                  {petBookings
                    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                    .map((booking) => (
                      <div
                        key={booking.id}
                        className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-sm capitalize flex items-center gap-2">
                              {booking.service}
                              {booking.status === "completed" && (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              )}
                              {booking.status === "pending" && (
                                <Clock className="h-3 w-3 text-yellow-500" />
                              )}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(booking.startDate)}
                              {booking.startDate !== booking.endDate &&
                                ` - ${formatDate(booking.endDate)}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-sm">${booking.totalCost}</p>
                            <Badge variant="outline" className="text-xs mt-1">
                              {booking.paymentStatus}
                            </Badge>
                          </div>
                        </div>
                        {booking.specialRequests && (
                          <p className="text-xs text-muted-foreground italic pt-2 border-t">
                            {booking.specialRequests}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No stay history</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report Cards Tab */}
        <TabsContent value="reports" className="space-y-4">
          {reports.length > 0 ? (
            reports
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((report) => (
                <Card key={report.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base capitalize">
                          {report.serviceType} Report
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDate(report.date)} • By {report.createdBy}
                        </p>
                      </div>
                      <Badge className={getMoodColor(report.mood)}>{report.mood}</Badge>
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
                            <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
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
                                <p className="text-xs text-muted-foreground">{meal.amount}</p>
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
                            <Badge key={idx} variant="secondary" className="text-xs">
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
                        <h4 className="text-sm font-semibold mb-1">Staff Notes</h4>
                        <p className="text-sm text-muted-foreground">{report.staffNotes}</p>
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
                <p className="text-sm text-muted-foreground">No report cards yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

