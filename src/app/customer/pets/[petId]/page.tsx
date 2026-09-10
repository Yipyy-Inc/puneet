"use client";

import { useState, use, useMemo, useEffect } from "react";
import { useCurrentCustomer } from "@/lib/api/current-customer";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { bookings } from "@/data/bookings";
import { getFormsByFacility } from "@/data/forms";
import { getSubmissionsForPet } from "@/data/form-submissions";
import { petPhotos, vaccinationRecords } from "@/data/pet-data";
import { useQuery } from "@tanstack/react-query";
import { reportCardQueries } from "@/lib/api/report-cards";
import { sectionsOf } from "@/lib/report-cards/sections";
import { usablePhotos } from "@/lib/report-cards/photos";
import { TagList } from "@/components/shared/TagList";
import { NotesList } from "@/components/shared/NotesList";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Plus,
  Loader2,
} from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { toast } from "sonner";
import { AddVaccinationModal } from "@/components/customer/AddVaccinationModal";
import { facilityConfig } from "@/data/facility-config";
import { notifyFacilityStaffVaccinationUploaded } from "@/data/facility-notifications";
import { PhotoAlbums } from "@/components/customer/PhotoAlbums";
import { PetComplianceChecklist } from "@/components/customer/PetComplianceChecklist";
import { careInstructions, type CareInstructions } from "@/data/pet-data";
import { PageHeader } from "@/components/ui/page-header";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import {
  formatDateLong,
  formatDateShort,
  formatMoney,
  formatWeightFromLb,
} from "@/lib/i18n/format";
import { serviceTypeLabel, statusLabel } from "@/lib/i18n/labels";

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
  const { t, fill, locale } = useCustomerText("petProfile");
  const { client: customer } = useCurrentCustomer();
  const customerId = customer?.id;

  const { petId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedFacility } = useCustomerFacility();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState(() =>
    searchParams?.get("tab") === "forms" ? "forms" : "overview",
  );
  useEffect(() => {
    if (searchParams?.get("tab") === "forms") setActiveTab("forms");
  }, [searchParams]);
  const [isSaving, setIsSaving] = useState(false);
  const [vaccinationModalOpen, setVaccinationModalOpen] = useState(false);
  const pet = customer?.pets.find((p) => p.id === parseInt(petId));

  const [editedPet, setEditedPet] = useState<Pet | null>(pet || null);

  // This pet's report cards, from Postgres. Narrowed server-side by the pet's
  // ref — see `reportCardSelect` for why that needs an inner join. Declared
  // here rather than beside its use below, which sits after an early return.
  const { data: petReportCards = [] } = useQuery({
    ...reportCardQueries.byPet(parseInt(petId)),
    enabled: Number.isInteger(parseInt(petId)),
  });

  const facilityId = selectedFacility?.id ?? 11;
  const allFacilityForms = useMemo(
    () =>
      getFormsByFacility(facilityId).filter(
        (f) => !f.internal && f.status !== "archived",
      ),
    [facilityId],
  );
  const petSubmissions = useMemo(
    () => (pet ? getSubmissionsForPet(facilityId, pet.id) : []),
    [facilityId, pet],
  );
  const completedFormIds = useMemo(
    () => new Set(petSubmissions.map((s) => s.formId)),
    [petSubmissions],
  );
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(
    null,
  );

  // Get facility vaccination requirements (must be before early return to avoid conditional hook)
  const facilityRequirements = useMemo(() => {
    return facilityConfig.vaccinationRequirements.requiredVaccinations.filter(
      (v) => v.required,
    );
  }, []);

  // Compute vaccinations before early return so getVaccinationCompliance hook is unconditional
  const vaccinations = useMemo(
    () => (pet ? vaccinationRecords.filter((v) => v.petId === pet.id) : []),
    [pet],
  );

  const getVaccinationStatus = (
    vaccination: (typeof vaccinationRecords)[0],
  ) => {
    const expiryDate = new Date(vaccination.expiryDate);
    const nowDate = new Date();
    const daysUntilExpiry = Math.floor(
      (expiryDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24),
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
        (v) =>
          v.vaccineName.toLowerCase().includes(req.name.toLowerCase()) ||
          req.name.toLowerCase().includes(v.vaccineName.toLowerCase()),
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

  if (!customer || !pet) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">{t("notFound")}</h2>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/customer/pets")}
          >
            <ArrowLeft className="mr-2 size-4" />
            {t("backToPets")}
          </Button>
        </div>
      </div>
    );
  }

  const facilityForms = allFacilityForms.filter((f) => f.type === "pet");
  const optionalForms = allFacilityForms.filter((f) => f.type === "service");
  const requiredForms = facilityForms.filter(
    (f) => !completedFormIds.has(f.id),
  );
  const completedForms = facilityForms.filter((f) =>
    completedFormIds.has(f.id),
  );

  const photos = petPhotos.filter((p) => p.petId === pet.id);
  const petBookings = bookings.filter(
    (b) => b.petId === pet.id && b.facilityId === selectedFacility?.id,
  );
  // Only cards the owner has actually been sent. RLS admits them to a draft
  // the moment it exists, because the card is theirs, so "not yet sent" has to
  // be applied here.
  const reports = petReportCards.filter((r) => r.deliveryStatus === "sent");

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

  const formatDate = (dateString: string) => formatDateLong(dateString, locale);

  // The record's own word for a species ("Dog") and for a mood ("happy") read
  // in the reader's language; one nobody mapped reads as recorded.
  const lookup = (prefix: string, value: string) => {
    const key = `${prefix}_${value.toLowerCase()}`;
    const label = t(key);
    return label === key ? value : label;
  };

  const handleSave = async () => {
    if (!editedPet) return;

    setIsSaving(true);
    try {
      // TODO: Replace with actual API call
      await updatePetProfile(editedPet);
      setIsEditing(false);
      toast.success(t("profileSavedToast"));
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : t("profileSaveFailedToast"),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedPet(pet);
    setIsEditing(false);
  };

  const updatePetProfile = async (petData: Pet) => {
    // TODO: Replace with actual API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success(fill("petProfileSavedToast", { pet: petData.name }));
  };

  const handleAddVaccination = async (
    newVaccinations: Array<Omit<(typeof vaccinationRecords)[0], "id">>,
  ) => {
    // TODO: Replace with actual API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (newVaccinations.length === 0) return;
    notifyFacilityStaffVaccinationUploaded({
      facilityId: facilityId,
      clientId: customerId ?? 0,
      // french-ok: a name field on a staff notification, filled by a person's name
      clientName: customer ? customer.name : "Customer",
      petName: pet.name,
      vaccineCount: newVaccinations.length,
    });
    router.refresh();
  };

  // Care Instructions Component
  function CareInstructionsSection({ petId }: { petId: number }) {
    const [isEditingCI, setIsEditingCI] = useState(false);
    const [isSavingCI, setIsSavingCI] = useState(false);
    const petCareInstructions = careInstructions.find(
      (ci) => ci.petId === petId,
    );
    const [editedInstructions, setEditedInstructions] =
      useState<CareInstructions>(
        petCareInstructions || {
          petId,
          medicationList: [],
        },
      );

    const editableFields =
      facilityConfig.careInstructions.customerEditableFields;

    const handleSaveCI = async () => {
      setIsSavingCI(true);
      try {
        // TODO: Replace with actual API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        toast.success(t("careSavedToast"));
        setIsEditingCI(false);
      } catch (error: unknown) {
        toast.error(
          error instanceof Error ? error.message : t("careSaveFailedToast"),
        );
      } finally {
        setIsSavingCI(false);
      }
    };

    const handleAddMedication = () => {
      setEditedInstructions({
        ...editedInstructions,
        medicationList: [
          ...(editedInstructions.medicationList || []),
          { name: "", dosage: "", frequency: "", notes: "" },
        ],
      });
    };

    const handleRemoveMedication = (index: number) => {
      const newList = [...(editedInstructions.medicationList || [])];
      newList.splice(index, 1);
      setEditedInstructions({ ...editedInstructions, medicationList: newList });
    };

    const handleMedicationChange = (
      index: number,
      field: "name" | "dosage" | "frequency" | "notes",
      value: string,
    ) => {
      const newList = [...(editedInstructions.medicationList || [])];
      newList[index] = { ...newList[index], [field]: value };
      setEditedInstructions({ ...editedInstructions, medicationList: newList });
    };

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">
                {t("careTitle")}
              </CardTitle>
              <CardDescription>{t("careDescription")}</CardDescription>
            </div>
            {!isEditingCI && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingCI(true)}
              >
                <Edit className="mr-2 size-4" />
                {t("editCare")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditingCI ? (
            <>
              {editableFields.feedingSchedule && (
                <div className="space-y-2">
                  <Label htmlFor="feedingSchedule">
                    {t("feedingSchedule")}
                  </Label>
                  <Input
                    id="feedingSchedule"
                    value={editedInstructions.feedingSchedule || ""}
                    onChange={(e) =>
                      setEditedInstructions({
                        ...editedInstructions,
                        feedingSchedule: e.target.value,
                      })
                    }
                    placeholder={t("feedingSchedulePlaceholder")}
                  />
                </div>
              )}

              {editableFields.feedingAmount && (
                <div className="space-y-2">
                  <Label htmlFor="feedingAmount">{t("feedingAmount")}</Label>
                  <Input
                    id="feedingAmount"
                    value={editedInstructions.feedingAmount || ""}
                    onChange={(e) =>
                      setEditedInstructions({
                        ...editedInstructions,
                        feedingAmount: e.target.value,
                      })
                    }
                    placeholder={t("feedingAmountPlaceholder")}
                  />
                </div>
              )}

              {editableFields.medicationList && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{t("medications")}</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddMedication}
                    >
                      <Plus className="mr-2 size-4" />
                      {t("addMedication")}
                    </Button>
                  </div>
                  {editedInstructions.medicationList &&
                  editedInstructions.medicationList.length > 0 ? (
                    <div className="space-y-3">
                      {editedInstructions.medicationList.map((med, index) => (
                        <Card key={index} className="p-3">
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                placeholder={t("medicationName")}
                                value={med.name}
                                onChange={(e) =>
                                  handleMedicationChange(
                                    index,
                                    "name",
                                    e.target.value,
                                  )
                                }
                              />
                              <Input
                                placeholder={t("dosage")}
                                value={med.dosage}
                                onChange={(e) =>
                                  handleMedicationChange(
                                    index,
                                    "dosage",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                            <Input
                              placeholder={t("frequencyPlaceholder")}
                              value={med.frequency}
                              onChange={(e) =>
                                handleMedicationChange(
                                  index,
                                  "frequency",
                                  e.target.value,
                                )
                              }
                            />
                            <div className="flex items-center gap-2">
                              <Textarea
                                placeholder={t("notesOptional")}
                                value={med.notes || ""}
                                onChange={(e) =>
                                  handleMedicationChange(
                                    index,
                                    "notes",
                                    e.target.value,
                                  )
                                }
                                rows={2}
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMedication(index)}
                                aria-label={t("removeMedication")}
                              >
                                <X className="size-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      {t("noMedicationsAdded")}
                    </p>
                  )}
                </div>
              )}

              {editableFields.groomingSensitivities && (
                <div className="space-y-2">
                  <Label htmlFor="groomingSensitivities">
                    {t("groomingSensitivities")}
                  </Label>
                  <Textarea
                    id="groomingSensitivities"
                    value={editedInstructions.groomingSensitivities || ""}
                    onChange={(e) =>
                      setEditedInstructions({
                        ...editedInstructions,
                        groomingSensitivities: e.target.value,
                      })
                    }
                    placeholder={t("groomingSensitivitiesPlaceholder")}
                    rows={3}
                  />
                </div>
              )}

              {editableFields.behaviorNotes && (
                <div className="space-y-2">
                  <Label htmlFor="behaviorNotes">{t("behaviourNotes")}</Label>
                  <Textarea
                    id="behaviorNotes"
                    value={editedInstructions.behaviorNotes || ""}
                    onChange={(e) =>
                      setEditedInstructions({
                        ...editedInstructions,
                        behaviorNotes: e.target.value,
                      })
                    }
                    placeholder={t("behaviourNotesPlaceholder")}
                    rows={4}
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Button onClick={handleSaveCI} disabled={isSavingCI}>
                  {isSavingCI ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      {t("saving")}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 size-4" />
                      {t("saveCare")}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditingCI(false);
                    setEditedInstructions(
                      petCareInstructions || { petId, medicationList: [] },
                    );
                  }}
                  disabled={isSavingCI}
                >
                  {t("cancel")}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {editableFields.feedingSchedule && (
                <div>
                  <p className="text-muted-foreground mb-1 text-sm font-medium">
                    {t("feedingSchedule")}
                  </p>
                  <p className="text-sm">
                    {editedInstructions.feedingSchedule || t("notSpecified")}
                  </p>
                </div>
              )}

              {editableFields.feedingAmount && (
                <div>
                  <p className="text-muted-foreground mb-1 text-sm font-medium">
                    {t("feedingAmount")}
                  </p>
                  <p className="text-sm">
                    {editedInstructions.feedingAmount || t("notSpecified")}
                  </p>
                </div>
              )}

              {editableFields.medicationList && (
                <div>
                  <p className="text-muted-foreground mb-2 text-sm font-medium">
                    {t("medications")}
                  </p>
                  {editedInstructions.medicationList &&
                  editedInstructions.medicationList.length > 0 ? (
                    <div className="space-y-2">
                      {editedInstructions.medicationList.map((med, index) => (
                        <Card key={index} className="p-3">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{med.name}</p>
                            <p className="text-muted-foreground text-xs">
                              {med.dosage} • {med.frequency}
                            </p>
                            {med.notes && (
                              <p className="text-muted-foreground mt-1 text-xs">
                                {med.notes}
                              </p>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      {t("noMedicationsListed")}
                    </p>
                  )}
                </div>
              )}

              {editableFields.groomingSensitivities && (
                <div>
                  <p className="text-muted-foreground mb-1 text-sm font-medium">
                    {t("groomingSensitivities")}
                  </p>
                  <p className="text-sm">
                    {editedInstructions.groomingSensitivities ||
                      t("noneSpecified")}
                  </p>
                </div>
              )}

              {editableFields.behaviorNotes && (
                <div>
                  <p className="text-muted-foreground mb-1 text-sm font-medium">
                    {t("behaviourNotes")}
                  </p>
                  <p className="text-sm">
                    {editedInstructions.behaviorNotes || t("noNotesProvided")}
                  </p>
                </div>
              )}

              {!petCareInstructions && (
                <div className="text-muted-foreground py-8 text-center">
                  <p className="text-sm">{t("noCareYet")}</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setIsEditingCI(true)}
                  >
                    <Plus className="mr-2 size-4" />
                    {t("addCare")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const PetIcon = pet.type === "Cat" ? Cat : Dog;

  // Vaccination columns
  const vaccinationColumns: ColumnDef<(typeof vaccinationRecords)[0]>[] = [
    {
      key: "vaccineName",
      label: t("colVaccine"),
      render: (vaccination) => (
        <div className="font-medium">{vaccination.vaccineName}</div>
      ),
    },
    {
      key: "administeredDate",
      label: t("colAdministered"),
      render: (vaccination) => formatDate(vaccination.administeredDate),
    },
    {
      key: "expiryDate",
      label: t("colExpires"),
      render: (vaccination) => {
        const status = getVaccinationStatus(vaccination);
        return (
          <div className="flex items-center gap-2">
            <span>{formatDate(vaccination.expiryDate)}</span>
            <Badge
              variant={
                status.color as
                  | "destructive"
                  | "secondary"
                  | "default"
                  | "outline"
              }
              className="text-xs"
            >
              {status.status === "expired"
                ? fill(
                    status.days === 1 ? "expiredDaysOne" : "expiredDaysMany",
                    {
                      days: status.days,
                    },
                  )
                : status.status === "expiring-soon"
                  ? fill(
                      status.days === 1
                        ? "expiresInDaysOne"
                        : "expiresInDaysMany",
                      { days: status.days },
                    )
                  : t("valid")}
            </Badge>
          </div>
        );
      },
    },
    {
      key: "veterinarianName",
      label: t("colVeterinarian"),
      render: (vaccination) => vaccination.veterinarianName || "—",
    },
    {
      key: "status",
      label: t("colStatus"),
      render: (vaccination) => {
        if (vaccination.status === "approved") {
          return (
            <Badge className="bg-emerald-600 hover:bg-emerald-700">
              {t("vaccineApproved")}
            </Badge>
          );
        }
        if (!vaccination.status || vaccination.status === "pending_review") {
          return <Badge variant="secondary">{t("vaccinePending")}</Badge>;
        }
        if (vaccination.status === "rejected") {
          return (
            <div className="space-y-0.5">
              <Badge variant="destructive">{t("vaccineRejected")}</Badge>
              {vaccination.rejectionReason && (
                <p className="text-muted-foreground text-[11px]">
                  {vaccination.rejectionReason}
                </p>
              )}
            </div>
          );
        }
        if (vaccination.status === "exception") {
          return (
            <div className="space-y-0.5">
              <Badge className="border-amber-400 bg-amber-100 text-amber-800 hover:bg-amber-200">
                {t("vaccineException")}
              </Badge>
              {vaccination.exceptionReason && (
                <p className="text-muted-foreground text-[11px]">
                  {vaccination.exceptionReason}
                </p>
              )}
            </div>
          );
        }
        return <Badge variant="outline">{t("vaccineUnknown")}</Badge>;
      },
    },
    {
      key: "documentUrl",
      label: t("colDocument"),
      render: (vaccination) =>
        vaccination.documentUrl ? (
          <Button variant="ghost" size="sm" asChild>
            <a
              href={vaccination.documentUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileText className="mr-1 size-4" />
              {t("viewDocument")}
            </a>
          </Button>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  // Booking history columns
  const bookingColumns: ColumnDef<(typeof bookings)[0]>[] = [
    {
      key: "service",
      label: t("colService"),
      render: (booking) => (
        <Badge variant="outline">
          {serviceTypeLabel(locale, booking.service)}
        </Badge>
      ),
    },
    {
      key: "date",
      label: t("colDate"),
      render: (booking) => formatDate(booking.startDate),
    },
    {
      key: "status",
      label: t("colStatus"),
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
          {statusLabel(locale, booking.status)}
        </Badge>
      ),
    },
    {
      key: "totalCost",
      label: t("colTotal"),
      render: (booking) => formatMoney(booking.totalCost, locale),
    },
  ];

  return (
    <div className="from-background via-muted/20 to-background min-h-screen bg-linear-to-br p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/customer/pets")}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              {/* The file the codemod broke: its description mixes text with
                  three expressions, which is why it refused it and why this
                  one is written by hand. §5r keeps the pet's name and the
                  breed as the owner typed it out of the locale layer. */}
              <PageHeader
                title={pet.name}
                description={`${pet.breed} · ${fill(pet.age === 1 ? "ageOldOne" : "ageOldMany", { count: pet.age })}`}
              />
              <div className="mt-1">
                <TagList
                  entityType="pet"
                  entityId={pet.id}
                  compact
                  maxVisible={4}
                  isCustomerView
                />
              </div>
            </div>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 size-4" />
              {t("editProfile")}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                {t("cancel")}
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Save className="mr-2 size-4 animate-spin" />
                    {t("saving")}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 size-4" />
                    {t("saveProfile")}
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
              <div className="bg-muted flex size-32 items-center justify-center overflow-hidden rounded-lg">
                {pet.imageUrl ? (
                  <Image
                    src={pet.imageUrl}
                    alt={pet.name}
                    width={128}
                    height={128}
                    className="size-full object-cover"
                  />
                ) : (
                  <PetIcon className="text-muted-foreground h-16 w-16" />
                )}
              </div>
              <div className="grid flex-1 grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <p className="text-muted-foreground text-sm">
                    {t("species")}
                  </p>
                  <p className="font-medium">{lookup("species", pet.type)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">{t("breed")}</p>
                  <p className="font-medium">{pet.breed}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">{t("age")}</p>
                  <p className="font-medium">
                    {fill(pet.age === 1 ? "ageOne" : "ageMany", {
                      count: pet.age,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">{t("weight")}</p>
                  {/* Metric leads (§5q). pets.weight is POUNDS — see formatWeightFromLb for how that was established. */}
                  <p className="font-medium">
                    {formatWeightFromLb(pet.weight, locale)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="w-full max-w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview">{t("tabOverview")}</TabsTrigger>
            <TabsTrigger value="vaccinations">
              {t("tabVaccinations")}
              {expiredVaccinations.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {expiredVaccinations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="bookings">{t("tabBookings")}</TabsTrigger>
            <TabsTrigger value="reports">{t("tabReports")}</TabsTrigger>
            <TabsTrigger value="forms">
              {t("tabForms")}
              {requiredForms.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {requiredForms.length}
                </Badge>
              )}
            </TabsTrigger>
            {facilityConfig.careInstructions.enabled && (
              <TabsTrigger value="care-instructions">
                {t("careTitle")}
              </TabsTrigger>
            )}
            <TabsTrigger value="photos">{t("tabPhotos")}</TabsTrigger>
            <TabsTrigger value="staff-notes">{t("tabStaffNotes")}</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">
                    {t("basicInformation")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditing && editedPet ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="name">{t("name")}</Label>
                        <Input
                          id="name"
                          value={editedPet.name}
                          onChange={(e) =>
                            setEditedPet({ ...editedPet, name: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="breed">{t("breed")}</Label>
                        <Input
                          id="breed"
                          value={editedPet.breed}
                          onChange={(e) =>
                            setEditedPet({
                              ...editedPet,
                              breed: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="age">{t("ageYears")}</Label>
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
                          <Label htmlFor="weight">{t("weightLb")}</Label>
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
                        <Label htmlFor="color">{t("colour")}</Label>
                        <Input
                          id="color"
                          value={editedPet.color}
                          onChange={(e) =>
                            setEditedPet({
                              ...editedPet,
                              color: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="microchip">
                          {t("microchipNumber")}
                        </Label>
                        <Input
                          id="microchip"
                          value={editedPet.microchip}
                          onChange={(e) =>
                            setEditedPet({
                              ...editedPet,
                              microchip: e.target.value,
                            })
                          }
                          className="font-mono"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-muted-foreground text-sm">
                          {t("name")}
                        </p>
                        <p className="font-medium">{pet.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm">
                          {t("breed")}
                        </p>
                        <p className="font-medium">{pet.breed}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-muted-foreground text-sm">
                            {t("age")}
                          </p>
                          <p className="font-medium">
                            {fill(pet.age === 1 ? "ageOne" : "ageMany", {
                              count: pet.age,
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">
                            {t("weight")}
                          </p>
                          <p className="font-medium">
                            {formatWeightFromLb(pet.weight, locale)}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm">
                          {t("colour")}
                        </p>
                        <p className="font-medium">{pet.color}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm">
                          {t("microchip")}
                        </p>
                        <p className="font-mono text-sm font-medium">
                          {pet.microchip}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">
                    {t("medicalInformation")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditing && editedPet ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="allergies">{t("allergies")}</Label>
                        <Textarea
                          id="allergies"
                          value={editedPet.allergies}
                          onChange={(e) =>
                            setEditedPet({
                              ...editedPet,
                              allergies: e.target.value,
                            })
                          }
                          placeholder={t("allergiesPlaceholder")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="specialNeeds">
                          {t("specialNeeds")}
                        </Label>
                        <Textarea
                          id="specialNeeds"
                          value={editedPet.specialNeeds}
                          onChange={(e) =>
                            setEditedPet({
                              ...editedPet,
                              specialNeeds: e.target.value,
                            })
                          }
                          placeholder={t("specialNeedsPlaceholder")}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-muted-foreground mb-1 text-sm">
                          {t("allergies")}
                        </p>
                        <Badge
                          variant={
                            pet.allergies !== "None"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {pet.allergies}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1 text-sm">
                          {t("specialNeeds")}
                        </p>
                        <p className="text-sm">
                          {pet.specialNeeds || t("none")}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Compliance Checklist */}
            {selectedFacility && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">
                    {t("eligibilityTitle")}
                  </CardTitle>
                  <CardDescription>
                    {t("eligibilityDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PetComplianceChecklist
                    pet={pet}
                    clientId={customerId ?? 0}
                    facilityId={selectedFacility.id}
                    compact={false}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Forms Tab */}
          <TabsContent value="forms" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <FileText className="size-5" />
                  {fill("formsFor", { pet: pet.name })}
                </CardTitle>
                <CardDescription>{t("formsDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Required (incomplete) */}
                {requiredForms.length > 0 && (
                  <div>
                    <h4 className="text-destructive mb-2 flex items-center gap-1 text-sm font-medium">
                      <AlertTriangle className="size-4" />
                      {fill("requiredIncomplete", {
                        count: requiredForms.length,
                      })}
                    </h4>
                    <ul className="space-y-2">
                      {requiredForms.map((form) => (
                        <li key={form.id}>
                          <Link
                            href={`/forms/${form.slug}?petId=${pet.id}&customerId=${customerId}`}
                            className="border-destructive/30 hover:bg-destructive/5 flex items-center justify-between rounded-lg border p-3 transition-colors"
                          >
                            <div>
                              <span className="font-medium">{form.name}</span>
                              <p className="text-muted-foreground mt-0.5 text-xs">
                                {fill(
                                  form.questions.length === 1
                                    ? "questionsOne"
                                    : "questionsMany",
                                  { count: form.questions.length },
                                )}
                                {form.settings?.welcomeMessage &&
                                  ` · ${form.settings.welcomeMessage.slice(0, 60)}...`}
                              </p>
                            </div>
                            <Badge
                              variant="destructive"
                              className="shrink-0 text-xs"
                            >
                              {t("fillNow")}
                            </Badge>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Completed (view-only with expandable answers) */}
                {completedForms.length > 0 && (
                  <div>
                    <h4 className="mb-2 flex items-center gap-1 text-sm font-medium text-green-600">
                      <CheckCircle2 className="size-4" />
                      {fill("completedCount", {
                        count: completedForms.length,
                      })}
                    </h4>
                    <ul className="space-y-2">
                      {completedForms.map((form) => {
                        const sub = petSubmissions.find(
                          (s) => s.formId === form.id,
                        );
                        const isExpanded = expandedSubmission === form.id;
                        return (
                          <li key={form.id}>
                            <button
                              type="button"
                              className="w-full rounded-lg border bg-green-50/50 p-3 text-left transition-colors hover:bg-green-50"
                              onClick={() =>
                                setExpandedSubmission(
                                  isExpanded ? null : form.id,
                                )
                              }
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{form.name}</span>
                                <span className="text-muted-foreground text-xs">
                                  {sub?.createdAt
                                    ? formatDateShort(sub.createdAt, locale)
                                    : ""}
                                </span>
                              </div>
                            </button>
                            {isExpanded && sub && (
                              <div className="bg-muted/30 mt-1 space-y-2 rounded-lg border p-3">
                                {form.questions
                                  .filter(
                                    (q) =>
                                      sub.answers[q.id] !== undefined &&
                                      sub.answers[q.id] !== "",
                                  )
                                  .map((q) => (
                                    <div key={q.id} className="text-sm">
                                      <span className="text-muted-foreground text-xs">
                                        {q.label}
                                      </span>
                                      <p className="font-medium">
                                        {Array.isArray(sub.answers[q.id])
                                          ? (
                                              sub.answers[q.id] as string[]
                                            ).join(", ")
                                          : typeof sub.answers[q.id] ===
                                              "object"
                                            ? JSON.stringify(sub.answers[q.id])
                                            : String(sub.answers[q.id])}
                                      </p>
                                    </div>
                                  ))}
                                {form.questions.filter(
                                  (q) =>
                                    sub.answers[q.id] !== undefined &&
                                    sub.answers[q.id] !== "",
                                ).length === 0 && (
                                  <p className="text-muted-foreground text-xs">
                                    {t("noAnswers")}
                                  </p>
                                )}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Optional forms (service / owner forms) */}
                {optionalForms.length > 0 && (
                  <div>
                    <h4 className="text-muted-foreground mb-2 text-sm font-medium">
                      {t("optionalForms")}
                    </h4>
                    <ul className="space-y-2">
                      {optionalForms.map((form) => {
                        const isDone = completedFormIds.has(form.id);
                        return (
                          <li key={form.id}>
                            {isDone ? (
                              <div className="bg-muted/20 flex items-center justify-between rounded-lg border p-3">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="size-4 text-green-500" />
                                  <span className="text-sm">{form.name}</span>
                                </div>
                                <span className="text-muted-foreground text-xs">
                                  {t("done")}
                                </span>
                              </div>
                            ) : (
                              <Link
                                href={`/forms/${form.slug}?petId=${pet.id}&customerId=${customerId}`}
                                className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3 transition-colors"
                              >
                                <span className="text-sm">{form.name}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {t("optional")}
                                </Badge>
                              </Link>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {facilityForms.length === 0 && optionalForms.length === 0 && (
                  <p className="text-muted-foreground py-4 text-sm">
                    {t("noForms")}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vaccinations Tab */}
          <TabsContent value="vaccinations" className="space-y-4">
            {/* Facility Requirements Status */}
            {facilityRequirements.length > 0 && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Syringe className="size-5" />
                    {t("requirementsTitle")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {getVaccinationCompliance.required.map((vaccine) => {
                    const isMissing =
                      getVaccinationCompliance.missing.includes(vaccine);
                    const isExpired =
                      getVaccinationCompliance.expired.includes(vaccine);
                    const isExpiringSoon =
                      getVaccinationCompliance.expiringSoon.includes(vaccine);
                    const isUpToDate =
                      getVaccinationCompliance.upToDate.includes(vaccine);

                    return (
                      <div
                        key={vaccine}
                        className="bg-background flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          {isUpToDate ? (
                            <CheckCircle2 className="size-5 text-green-600" />
                          ) : isExpiringSoon ? (
                            <AlertTriangle className="text-warning size-5" />
                          ) : (
                            <XCircle className="text-destructive size-5" />
                          )}
                          <div>
                            <p className="font-medium">{vaccine}</p>
                            <p className="text-muted-foreground text-xs">
                              {isMissing
                                ? t("reqMissingHelp")
                                : isExpired
                                  ? t("reqExpiredHelp")
                                  : isExpiringSoon
                                    ? t("reqExpiringHelp")
                                    : t("reqUpToDateHelp")}
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
                            ? t("reqCurrent")
                            : isExpiringSoon
                              ? t("reqExpiringSoon")
                              : isExpired
                                ? t("reqExpired")
                                : t("reqMissing")}
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
                  <CardTitle className="text-sm font-semibold">
                    {t("recordsTitle")}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVaccinationModalOpen(true)}
                  >
                    <Upload className="mr-2 size-4" />
                    {t("uploadRecord")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {vaccinations.length === 0 ? (
                  <div className="text-muted-foreground py-8 text-center">
                    <Syringe className="mx-auto mb-4 size-12 opacity-50" />
                    <p>{t("noRecords")}</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      size="sm"
                      onClick={() => setVaccinationModalOpen(true)}
                    >
                      <Upload className="mr-2 size-4" />
                      {t("uploadFirstRecord")}
                    </Button>
                  </div>
                ) : (
                  <>
                    {expiredVaccinations.length > 0 && (
                      <div className="border-destructive/20 bg-destructive/10 mb-4 rounded-lg border p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <AlertTriangle className="text-destructive size-5" />
                          <p className="text-destructive font-semibold">
                            {fill(
                              expiredVaccinations.length === 1
                                ? "expiredVaccinesOne"
                                : "expiredVaccinesMany",
                              { count: expiredVaccinations.length },
                            )}
                          </p>
                        </div>
                        <p className="text-muted-foreground text-sm">
                          {t("expiredVaccinesHelp")}
                        </p>
                      </div>
                    )}
                    {upcomingVaccinations.length > 0 && (
                      <div className="border-warning/20 bg-warning/10 mb-4 rounded-lg border p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <AlertTriangle className="text-warning size-5" />
                          <p className="text-warning font-semibold">
                            {fill(
                              upcomingVaccinations.length === 1
                                ? "expiringVaccinesOne"
                                : "expiringVaccinesMany",
                              { count: upcomingVaccinations.length },
                            )}
                          </p>
                        </div>
                        <p className="text-muted-foreground text-sm">
                          {t("expiringVaccinesHelp")}
                        </p>
                      </div>
                    )}
                    <DataTable
                      data={vaccinations}
                      columns={vaccinationColumns}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Booking History Tab */}
          <TabsContent value="bookings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  {t("tabBookings")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {petBookings.length === 0 ? (
                  <div className="text-muted-foreground py-8 text-center">
                    <Calendar className="mx-auto mb-4 size-12 opacity-50" />
                    <p>{t("noBookings")}</p>
                    <Button variant="outline" className="mt-4" asChild>
                      <Link href="/customer/bookings">{t("bookService")}</Link>
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
                <CardTitle className="text-sm font-semibold">
                  {t("tabReports")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reports.length === 0 ? (
                  <div className="text-muted-foreground py-8 text-center">
                    <FileText className="mx-auto mb-4 size-12 opacity-50" />
                    <p>{t("noReports")}</p>
                    <p className="mt-2 text-sm">{t("noReportsHelp")}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reports.map((report) => {
                      // The facility's own words, not an `activities` array —
                      // nothing has ever collected one.
                      const sections = sectionsOf(report);
                      const mood =
                        typeof report.input.mood === "string"
                          ? report.input.mood
                          : "";
                      const photos = usablePhotos(report.photos);

                      return (
                        <Card key={report.id}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-base">
                                  {fill("reportCardFor", {
                                    service: serviceTypeLabel(
                                      locale,
                                      report.serviceType,
                                    ),
                                  })}
                                </CardTitle>
                                <CardDescription>
                                  {formatDate(report.visitDate)}
                                </CardDescription>
                              </div>
                              {mood && (
                                <Badge variant="outline">
                                  {lookup("mood", mood)}
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {photos.length > 0 && (
                              <div>
                                <p className="mb-2 text-sm font-medium">
                                  {t("tabPhotos")}
                                </p>
                                <div className="grid grid-cols-4 gap-2">
                                  {photos.map((photo) => (
                                    <div
                                      key={photo.id}
                                      className="bg-muted relative aspect-square overflow-hidden rounded-lg"
                                    >
                                      {/* Signed private-bucket URL, which
                                          next/image is configured to refuse. */}
                                      {/* eslint-disable-next-line @next/next/no-img-element -- signed private URL */}
                                      <img
                                        src={photo.url}
                                        alt={
                                          photo.caption ?? t("reportPhotoAlt")
                                        }
                                        className="absolute inset-0 size-full object-cover"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {sections.map((section) => (
                              <div key={section.id}>
                                <p className="mb-1 text-sm font-medium">
                                  {section.label}
                                </p>
                                <p className="text-muted-foreground text-sm whitespace-pre-line">
                                  {section.body}
                                </p>
                              </div>
                            ))}

                            {/* Staff notes stay out of the customer view — they
                                are not part of `generated`, so there is nothing
                                here that was not written to be read. */}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Care Instructions Tab */}
          {facilityConfig.careInstructions.enabled && (
            <TabsContent value="care-instructions" className="space-y-4">
              <CareInstructionsSection petId={pet.id} />
            </TabsContent>
          )}

          {/* Photos Tab */}
          <TabsContent value="photos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  {t("galleryTitle")}
                </CardTitle>
                <CardDescription>{t("galleryDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                {photos.length === 0 ? (
                  <div className="text-muted-foreground py-8 text-center">
                    <ImageIcon className="mx-auto mb-4 size-12 opacity-50" />
                    <p>{t("noPhotos")}</p>
                    <p className="mt-2 text-sm">{t("noPhotosHelp")}</p>
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

          {/* Staff Notes Tab (customer-visible only) */}
          <TabsContent value="staff-notes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("tabStaffNotes")}</CardTitle>
                <CardDescription>{t("staffNotesDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <NotesList
                  category="pet"
                  entityId={pet.id}
                  readOnly
                  audience="customer"
                />
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
          petSpecies={pet.type}
          onSave={handleAddVaccination}
        />
      </div>
    </div>
  );
}
