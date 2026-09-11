"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { unfinishedBookings } from "@/data/unfinished-bookings";
import { useBookingModal } from "@/hooks/use-booking-modal";
import { useLocationContext } from "@/hooks/use-location-context";
import { buildResumePreselection } from "@/lib/resume-booking";
import { clientCommunications, clientCallHistory } from "@/data/communications";
import {
  playdateAlertLogs,
  getAlertStatusVariant,
  formatAlertChannel,
} from "@/data/marketing";
import { petPhotos } from "@/data/pet-data";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { useClientVaccinations } from "@/lib/api/vaccinations";
import { expiryState, localToday } from "@/lib/vaccinations";
import { reportCardQueries } from "@/lib/api/report-cards";
import { useTagsByEntity } from "@/hooks/use-tags-notes";
import { TagList } from "@/components/shared/TagList";
import { NotesList } from "@/components/shared/NotesList";
import { NotesButton } from "@/components/shared/NotesButton";
import { TagsButton } from "@/components/shared/TagsButton";
import { PageAuditTrail } from "@/components/shared/PageAuditTrail";
import { BookingCard } from "@/components/clients/BookingCard";
import { AddPetDialog } from "@/components/clients/AddPetDialog";
import { ClientDocumentsPanel } from "@/components/clients/documents/ClientDocumentsPanel";
import { useClientDocuments } from "@/lib/api/client-documents";
import { AdditionalContactsManager } from "@/components/clients/AdditionalContactsManager";
import { ClientServicePreferences } from "@/components/clients/ClientServicePreferences";
import { NewAppointmentDialog } from "@/components/facility/grooming/new-appointment-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useClientStoreCredit } from "@/lib/api/store-credit";
import { giftCardQueries } from "@/lib/api/gift-cards";
import { formatDateLong, formatMoney } from "@/lib/i18n/format";
import { getClientRetailPurchases } from "@/data/retail";
import { incidentQueries } from "@/lib/api/incidents";
import { IncidentDetailsModal } from "@/components/incidents/IncidentDetailsModal";
import { useFieldMask } from "@/lib/staff/mask";
import { usePermission } from "@/hooks/use-facility-rbac";
import { useAssignedScope } from "@/lib/facility-permissions";
import {
  useAssignedClientRefs,
  useClientRecord,
  useUpdateClient,
} from "@/lib/api/client";
import { bookingMutations, bookingQueries } from "@/lib/api/booking";
import { paymentQueries } from "@/lib/api/payments";
import { useFacilityProfile } from "@/lib/api/facility-profile";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { NewBooking } from "@/types/booking";
import { AccessRestricted } from "@/components/employee/AccessRestricted";
import type { Evaluation } from "@/types/pet";
import type { Incident } from "@/types/incidents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Link from "next/link";
import {
  ArrowLeft,
  Building,
  Mail,
  Phone,
  Heart,
  FileText,
  MessageSquare,
  PhoneCall,
  Loader2,
  MessageCircle,
  ExternalLink,
  AlertCircle,
  Play,
  User,
  Dog,
  Cat,
  Camera,
  Award,
  History,
  DollarSign,
  CreditCard,
  Wallet,
  Gift,
  MapPin,
  AlertTriangle,
  Edit,
  Save,
  X,
  Plus,
  ShoppingBag,
  Receipt,
  Bell,
  Scissors,
  Siren,
  Settings as SettingsIcon,
  CalendarDays,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

// Compact badge styling for the Overview → Incidents section.
const INCIDENT_SEVERITY_STYLES: Record<string, string> = {
  critical:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400",
  high: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-900/20 dark:text-orange-400",
  medium:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-400",
  low: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-900/20 dark:text-green-400",
};

const INCIDENT_STATUS_STYLES: Record<string, string> = {
  open: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400",
  investigating:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-400",
  resolved:
    "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-900/20 dark:text-green-400",
  closed:
    "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400",
};

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
  evaluations?: Evaluation[];
  petStatus?: "active" | "inactive" | "deceased";
}

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openBookingModal } = useBookingModal();
  const { currentLocationId } = useLocationContext();
  // Field masking (spec Table 21): hide contact info, LTV, and financial amounts
  // from staff without the required permission. TODO: also strip server-side.
  const { maskContact, maskAmount, canSee } = useFieldMask();
  // Section 3B / Table 4 — message-client controls (communicate_clients).
  const canMessageClient = usePermission("communicate_clients");
  // Section 3C / Table 5 — OMIT (not grey) the Billing tab without
  // view_client_financial, and the Address section without view_client_address.
  const canSeeClientFinancial = canSee("client_financial");
  const canSeeClientAddress = canSee("client_address");
  // Section 8B: viewer's fs-* id when view_clients is assigned_only, else
  // undefined. Used below to 403 on a client outside the viewer's assigned set.
  const assignedClientScope = useAssignedScope("view_clients");
  // Declared with the other hooks, above every early return — this component
  // returns in several places before the check below, and a hook after one of
  // them would change the order between renders.
  const { refs: assignedRefs, pending: assignedPending } =
    useAssignedClientRefs(assignedClientScope);
  const resumedBookingRef = useRef<string | null>(null);
  const {
    t: profileT,
    fill: profileFill,
    locale: profileLocale,
  } = useStaffText("clientProfile");
  const updateClient = useUpdateClient();
  const [isEditing, setIsEditing] = useState(false);
  // "Add pet" and "Add first pet" had no handler.
  const [addingPet, setAddingPet] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  // Grooming-appointment dialog state. Opened from the "Book Grooming" entry
  // point in the Bookings card with the client (and optionally a specific
  // pet from their roster) pre-filled.
  const [groomingDialogOpen, setGroomingDialogOpen] = useState(false);
  const [groomingDialogPetId, setGroomingDialogPetId] = useState<number | null>(
    null,
  );
  // Overview → Incidents: row click opens the shared IncidentDetailsModal.
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null,
  );

  // The client, from Postgres. This was `clients.find(...)` over
  // `src/data/clients.ts`, so every client created since the migration was
  // told they did not exist on their own file.
  const { client, pending: clientPending } = useClientRecord(id);
  const { tagsFor } = useTagsByEntity();
  // ── THE TWO "NEW BOOKING" BUTTONS ON THIS PAGE DID NOTHING ───────────────
  //
  // This was `facilities.find((f) => f.name === client.facility)` — the
  // client's facility STRING matched against the facilities FIXTURE. The API
  // labels a client with the real facility name ("Yipyy Demo Facility"), which
  // appears nowhere in `src/data/facilities.ts`, so `facility` was undefined
  // for every real client. Both booking buttons are wrapped in
  // `if (client && facility)`, so they did not crash — they silently did
  // nothing, with no error and no toast. The resume-unfinished-booking effect
  // gave up on the same check.
  //
  // The name comes from the session now. The numeric id stays a mock-era LABEL
  // (see project_facility_id_11_client_side): nothing sends it over the wire —
  // /api/bookings takes the facility from the caller's membership.
  const { profile } = useFacilityProfile();
  const facilityRef = 11;

  // Real bookings and payments for this client, replacing `bookings.filter()`
  // and `payments.filter()` over the fixtures. Declared HERE, above the early
  // returns further down, because a hook cannot be called conditionally;
  // `enabled` holds them until the client resolves.
  // The facility's incidents, from Postgres. These read the fixture by
  // numeric id, so real pet 1 and client 15 wore invented incidents.
  const { data: allIncidents = [] } = useQuery(incidentQueries.all());
  const { data: clientBookings = [] } = useQuery({
    ...bookingQueries.byClient(client?.id ?? 0),
    enabled: Boolean(client),
  });
  const { data: clientPayments = [] } = useQuery({
    ...paymentQueries.byClient(client?.id ?? 0),
    enabled: Boolean(client),
  });

  // Every report card across this client's pets, narrowed server-side. Fetched
  // once for the whole file rather than per pet: `getPetData` below is a plain
  // function called inside a render, and a hook cannot go there.
  // Every vaccination record across this client's pets, from Postgres. The
  // pet cards counted `vaccinationRecords` from the fixture by numeric id.
  const { vaccinations: clientVaccinations } = useClientVaccinations(
    client?.id ?? 0,
  );
  const [today] = useState(localToday);
  // The files on this client's record, for the Documents tile. The tab itself
  // reads them through ClientDocumentsPanel; same query, fetched once.
  const { documents: clientDocs } = useClientDocuments(client?.id ?? 0);
  // The client's store credit and the gift cards they bought, from the two
  // ledgers the till spends. These read `customerCredits` and `giftCards`
  // from `@/data/payments` by numeric id, so a real client wore invented
  // balances and the credit the till had just issued them was nowhere.
  const { data: storeCredit } = useClientStoreCredit(client?.id ?? 0);
  const { data: facilityGiftCards } = useQuery({
    ...giftCardQueries.all(),
    enabled: Boolean(client),
  });

  const { data: clientReportCards = [] } = useQuery({
    ...reportCardQueries.byClient(client?.id ?? 0),
    enabled: Boolean(client),
  });

  const queryClient = useQueryClient();

  /**
   * Actually create the booking.
   *
   * All three wizard callbacks on this page used to call
   * `generateInvoiceForBooking(booking)` and toast "Booking created — Invoice
   * INV-xxx: $yy". Nothing was written: that helper is a pure calculator, and
   * it resolves the customer with `clients.find()` over the FIXTURE, so for a
   * real client it costed the booking against nobody. The invoice id it printed
   * referred to no document — there is no invoices table.
   */
  const persistBooking = async (booking: NewBooking) => {
    try {
      const created = await bookingMutations.create(booking, currentLocationId);
      await queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success(`Booking #${created.id} created`);
    } catch (error) {
      toast.error("Could not create that booking", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  // Resume-from-unfinished-booking: when staff clicks Schedule on an
  // unfinished booking, the URL gets `?resumeBooking=<ub-id>`. We look it up,
  // open the wizard pre-filled, then strip the param so a reload doesn't
  // re-open it.
  useEffect(() => {
    const resumeId = searchParams?.get("resumeBooking");
    if (!resumeId || !client) return;
    if (resumedBookingRef.current === resumeId) return;

    const ub = unfinishedBookings.find((r) => r.id === resumeId);
    if (!ub || ub.clientId !== client.id) return;

    resumedBookingRef.current = resumeId;
    const preselection = buildResumePreselection(ub);

    const stepHint = ub.abandonmentStep.replace(/_/g, " ");
    toast.success(
      `Resumed ${ub.clientName}'s booking — last active at "${stepHint}".`,
      { description: "All customer-entered details are pre-filled." },
    );

    openBookingModal({
      clients: [client],
      facilityId: facilityRef,
      facilityName: profile.businessName,
      ...preselection,
      onCreateBooking: (booking) => {
        void persistBooking(booking);
      },
    });

    // Strip the query param so refresh or back nav doesn't relaunch the modal.
    const params = new URLSearchParams(searchParams.toString());
    params.delete("resumeBooking");
    const qs = params.toString();
    router.replace(
      `/facility/dashboard/clients/${client.id}${qs ? `?${qs}` : ""}`,
      { scroll: false },
    );
  }, [searchParams, client, profile.businessName, openBookingModal, router]);

  const [editedClient, setEditedClient] = useState({
    name: client?.name || "",
    email: client?.email || "",
    phone: client?.phone || "",
    status: client?.status || "active",
    address: client?.address || {
      street: "",
      city: "",
      state: "",
      zip: "",
      country: "",
    },
    additionalContacts: client?.additionalContacts ?? [],
  });

  // Pending is not absent. These pages answered instantly from a fixture
  // and never had to tell the two apart; against the database, saying the
  // client does not exist while the request is open is a claim nobody has
  // established.
  if (clientPending) return null;

  if (!client) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Client not found</h2>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/facility/dashboard/clients")}
          >
            <ArrowLeft className="mr-2 size-4" />
            Back to Clients
          </Button>
        </div>
      </div>
    );
  }

  // Section 8B / Part 0.3: a scoped viewer opening a client outside their
  // assigned set is a 403 — render the branded access screen, never the record.
  // (Admin / full-access viewers have assignedClientScope === undefined.)
  // Nothing is decided while the set is unknown: denying mid-fetch flashes the
  // refusal at somebody who has access, and admitting mid-fetch shows a record
  // before the check. `assignedPending` is false for a full-access viewer,
  // whose scope is undefined and whose query never runs.
  if (assignedPending) return null;
  if (assignedClientScope && !assignedRefs?.has(client.id)) {
    return <AccessRestricted />;
  }

  // Get client-specific data
  // Incidents for this customer: linked by clientId (0.1) unioned with any
  // incident involving one of their pets, deduped and newest-first.
  const clientIncidents = Array.from(
    new Map(
      [
        ...allIncidents.filter((i) => i.clientId === client.id),
        ...allIncidents.filter((i) =>
          i.petIds.some((id) => client.pets.some((p) => p.id === id)),
        ),
      ].map((i) => [i.id, i]),
    ).values(),
  ).sort(
    (a, b) =>
      new Date(b.incidentDate).getTime() - new Date(a.incidentDate).getTime(),
  );
  const clientComms = clientCommunications.filter(
    (c) => c.clientId === client.id,
  );
  const clientCalls = clientCallHistory.filter((c) => c.clientId === client.id);
  const clientPlaydateAlerts = playdateAlertLogs.filter(
    (a) => a.recipientCustomerId === client.id,
  );

  // Client billing data. There is no standalone invoice table: an invoice
  // here is a booking's, and what is owed is the database's own figure.
  const creditEntries = (storeCredit?.entries ?? []).filter(
    (e) => e.clientRef === client.id,
  );
  const clientGiftCards = (facilityGiftCards ?? []).filter(
    (gc) => gc.purchasedByClientRef === client.id,
  );
  const openBookingInvoices = clientBookings.filter(
    (b) => b.invoice && b.invoice.remainingDue > 0,
  );

  // Retail purchase history (linked to client file)
  const clientRetailPurchases = getClientRetailPurchases(client.id);
  const totalRetailSpent = clientRetailPurchases.reduce(
    (sum, t) => sum + t.total,
    0,
  );

  // Calculate billing stats
  // Every row in `payments` is money that MOVED — there is no pending state to
  // filter out, and a refund is a separate row with a NEGATIVE amount. So this
  // is a plain sum, and it goes DOWN when money is given back, which is what
  // "total revenue from this client" has to mean. Filtering on a status that
  // does not exist would have silently summed to zero.
  const totalRevenue = clientPayments.reduce((sum, p) => sum + p.amount, 0);
  // `clients.outstanding_balance` is derived from the bookings ledger
  // (20260806780000): what delivered bookings have not settled.
  const totalOutstanding = client.outstandingBalance ?? 0;
  // A store-credit balance is a SUM of its entries, never a column.
  const totalCredits = creditEntries.reduce((sum, e) => sum + e.amount, 0);

  // Calculate stats
  const totalBookings = clientBookings.length;
  const totalSpent = clientBookings
    .filter((b) => b.paymentStatus === "paid")
    .reduce((sum, b) => sum + b.totalCost, 0);

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

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const getCommunicationIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="size-4" />;
      case "sms":
        return <MessageSquare className="size-4" />;
      case "call":
        return <PhoneCall className="size-4" />;
      case "in-app":
        return <MessageCircle className="size-4" />;
      case "note":
        return <FileText className="size-4" />;
      default:
        return <MessageSquare className="size-4" />;
    }
  };

  // Pet modal helpers
  const getPetData = (pet: Pet) => {
    const photos = petPhotos.filter((p) => p.petId === pet.id);
    const vaccinations = clientVaccinations.filter((v) => v.petId === pet.id);
    const petBookingsList = clientBookings.filter((b) => b.petId === pet.id);
    const reports = clientReportCards.filter((r) => r.petRef === pet.id);
    const totalStays = petBookingsList.filter(
      (b) => b.status === "completed",
    ).length;
    // A rejected certificate did not lapse; it never counted.
    const live = vaccinations.filter((v) => v.status !== "rejected");
    const expiredVaccinations = live.filter(
      (v) => expiryState(v.expiryDate, today) === "expired",
    );
    const upcomingVaccinations = live.filter(
      (v) => expiryState(v.expiryDate, today) === "expiring",
    );

    // `pet.id` here is the pet's numeric ref; `tagsFor` matches it against the
    // assignments /api/tags has already translated from uuids. See
    // src/lib/api/mappers/tag.ts for why the translation lives in the route.
    const tags = tagsFor("pet", pet.id);

    return {
      photos,
      vaccinations,
      petBookings: petBookingsList,
      reports,
      totalStays,
      expiredVaccinations,
      upcomingVaccinations,
      tags,
    };
  };

  const seedFromClient = () =>
    setEditedClient({
      name: client.name,
      email: client.email,
      phone: client.phone || "",
      status: client.status,
      address: client.address || {
        street: "",
        city: "",
        state: "",
        zip: "",
        country: "",
      },
      additionalContacts: client.additionalContacts ?? [],
    });

  const startEditing = () => {
    seedFromClient();
    setIsEditing(true);
  };

  // It closed the editor and saved nothing ("In a real app, this would save
  // to the backend"). PATCH /api/clients/[ref] stores it; the editor closes
  // only once the row has changed, and keeps what was typed if it did not.
  const handleSave = async () => {
    if (!editedClient.name.trim()) {
      toast.error(profileT("nameRequired"));
      return;
    }
    try {
      await updateClient.mutateAsync({
        id: client.id,
        patch: {
          name: editedClient.name.trim(),
          email: editedClient.email.trim(),
          phone: editedClient.phone.trim(),
          status: editedClient.status,
          address: editedClient.address,
          additionalContacts: editedClient.additionalContacts,
        },
      });
      toast.success(profileT("savedToast"));
      setIsEditing(false);
    } catch (error) {
      toast.error(profileT("saveFailed"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleCancel = () => {
    seedFromClient();
    setIsEditing(false);
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/facility/dashboard/clients")}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {/* Client Avatar */}
          <div className="relative">
            <div className="bg-muted flex size-16 items-center justify-center overflow-hidden rounded-full">
              <User className="text-muted-foreground size-8" />
            </div>
            {isEditing && (
              <Button
                variant="secondary"
                size="icon"
                className="absolute -right-1 -bottom-1 size-6 rounded-full"
              >
                <Camera className="size-3" />
              </Button>
            )}
          </div>
          <div className="min-w-0">
            {/* §5r: a client's name never passes through the locale layer,
                and their state belongs beside it rather than out with the
                actions — see the `inline` slot's note. */}
            <PageHeader
              title={client.name}
              inline={
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge type="status" value={client.status} />
                  {client.isBlocked && (
                    <Badge variant="overdue">
                      <AlertTriangle aria-hidden />
                      {profileT("blocked")}
                    </Badge>
                  )}
                </div>
              }
              description={
                <span className="flex items-center gap-2">
                  <Building className="size-4" />
                  {client.facility}
                </span>
              }
            />
            {client.isBlocked && client.blockedReason && (
              <p className="text-destructive mt-2 text-sm">
                {client.blockedReason}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={updateClient.isPending}
              >
                <X className="mr-1 size-4" />
                {profileT("cancel")}
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateClient.isPending}
              >
                {updateClient.isPending ? (
                  <Loader2 className="mr-1 size-4 animate-spin" />
                ) : (
                  <Save className="mr-1 size-4" />
                )}
                {profileT("saveClient")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={startEditing}>
                <Edit className="mr-1 size-4" />
                Edit
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/facility/dashboard/clients/${client.id}/settings`}
                >
                  <SettingsIcon className="mr-1 size-4" />
                  Settings
                </Link>
              </Button>
              {canMessageClient && client.email && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`mailto:${client.email}`}>
                    <Mail className="mr-1 size-4" />
                    {profileT("email")}
                  </a>
                </Button>
              )}
              {canMessageClient && client.phone && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`tel:${client.phone.replace(/[^\d+]/g, "")}`}>
                    <PhoneCall className="mr-1 size-4" />
                    {profileT("call")}
                  </a>
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => {
                  if (client) {
                    openBookingModal({
                      clients: [client],
                      facilityId: facilityRef,
                      facilityName: profile.businessName,
                      preSelectedClientId: client.id,
                      onCreateBooking: (booking) => {
                        void persistBooking(booking);
                      },
                    });
                  }
                }}
              >
                <Plus className="mr-1 size-4" />
                Book
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Customer Tags + Notes */}
      <div className="flex items-center gap-2">
        <TagList
          entityType="customer"
          entityId={client.id}
          editable
          maxVisible={4}
        />
        <div className="ml-auto flex items-center gap-2">
          <TagsButton entityType="customer" entityId={client.id} />
          <NotesButton entityType="customer" entityId={client.id} />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <KpiTile
          label="Total Bookings"
          value={totalBookings}
          icon={CalendarDays}
          tone="indigo"
        />
        <KpiTile
          label="Pets"
          value={client.pets.length}
          icon={Heart}
          tone="rose"
        />
        <KpiTile
          label="Total Spent"
          value={maskAmount(`$${totalSpent}`, "client_financial")}
          icon={DollarSign}
          tone="emerald"
        />
        <KpiTile
          label="Documents"
          value={clientDocs.length}
          icon={FileText}
          tone="slate"
        />
        <KpiTile
          label="Retail Purchases"
          value={maskAmount(
            `$${totalRetailSpent.toFixed(2)}`,
            "client_financial",
          )}
          hint={`${clientRetailPurchases.length} purchases`}
          icon={ShoppingBag}
          tone="amber"
        />
      </div>

      {/* Tabs */}
      <Tabs
        // Guard: without view_client_financial the Billing tab is omitted, so
        // never resolve to it (Radix unmounts inactive content → not in DOM).
        value={
          activeTab === "billing" && !canSeeClientFinancial
            ? "overview"
            : activeTab
        }
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList
          className={cn(
            "grid w-full",
            canSeeClientFinancial ? "grid-cols-6" : "grid-cols-5",
          )}
        >
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pets">Pets ({client.pets.length})</TabsTrigger>
          {/* Billing tab — omitted without view_client_financial (3C/Table 5) */}
          {canSeeClientFinancial && (
            <TabsTrigger value="billing">Billing</TabsTrigger>
          )}
          <TabsTrigger value="purchases">
            Purchases ({clientRetailPurchases.length})
          </TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Contact & Info Section */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <User className="size-4" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isEditing ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={editedClient.name}
                        onChange={(e) =>
                          setEditedClient({
                            ...editedClient,
                            name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={editedClient.email}
                        onChange={(e) =>
                          setEditedClient({
                            ...editedClient,
                            email: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={editedClient.phone}
                        onChange={(e) =>
                          setEditedClient({
                            ...editedClient,
                            phone: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={editedClient.status}
                        onValueChange={(value) =>
                          setEditedClient({ ...editedClient, status: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-2.5">
                      <Mail className="text-muted-foreground size-4" />
                      <span className="text-sm font-medium">
                        {maskContact(client.email)}
                      </span>
                    </div>
                    {client.phone && (
                      <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-2.5">
                        <Phone className="text-muted-foreground size-4" />
                        <span className="text-sm font-medium">
                          {maskContact(client.phone)}
                        </span>
                      </div>
                    )}
                    <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-2.5">
                      <Building className="text-muted-foreground size-4" />
                      <span className="text-sm font-medium">
                        {client.facility}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Address section — omitted without view_client_address (3C/Table 5) */}
            {canSeeClientAddress && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <MapPin className="size-4" />
                    Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isEditing ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="street">Street</Label>
                        <Input
                          id="street"
                          value={editedClient.address.street}
                          onChange={(e) =>
                            setEditedClient({
                              ...editedClient,
                              address: {
                                ...editedClient.address,
                                street: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            value={editedClient.address.city}
                            onChange={(e) =>
                              setEditedClient({
                                ...editedClient,
                                address: {
                                  ...editedClient.address,
                                  city: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State</Label>
                          <Input
                            id="state"
                            value={editedClient.address.state}
                            onChange={(e) =>
                              setEditedClient({
                                ...editedClient,
                                address: {
                                  ...editedClient.address,
                                  state: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label htmlFor="zip">ZIP</Label>
                          <Input
                            id="zip"
                            value={editedClient.address.zip}
                            onChange={(e) =>
                              setEditedClient({
                                ...editedClient,
                                address: {
                                  ...editedClient.address,
                                  zip: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="country">Country</Label>
                          <Input
                            id="country"
                            value={editedClient.address.country}
                            onChange={(e) =>
                              setEditedClient({
                                ...editedClient,
                                address: {
                                  ...editedClient.address,
                                  country: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                      </div>
                    </>
                  ) : client.address && !canSee("client_address") ? (
                    <div className="bg-muted/50 rounded-lg p-2.5">
                      <p className="text-muted-foreground text-sm font-medium">
                        Hidden
                      </p>
                    </div>
                  ) : client.address ? (
                    <div className="bg-muted/50 rounded-lg p-2.5">
                      <p className="text-sm font-medium">
                        {client.address.street}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {client.address.city}, {client.address.state}{" "}
                        {client.address.zip}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {client.address.country}
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground py-4 text-center text-sm">
                      No address on file
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <AlertTriangle className="size-4" />
                  Additional Contacts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AdditionalContactsManager
                  value={
                    isEditing
                      ? editedClient.additionalContacts
                      : (client.additionalContacts ?? [])
                  }
                  onChange={(contacts) =>
                    setEditedClient({
                      ...editedClient,
                      additionalContacts: contacts,
                    })
                  }
                  disabled={!isEditing}
                  heading=""
                  description=""
                />
              </CardContent>
            </Card>
          </div>

          {/* Communication Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Bell className="size-4" />
                Communication Preferences
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="text-sm font-medium">Marketing Emails</div>
                    <div className="text-muted-foreground text-xs">
                      Campaigns, promos, newsletters
                    </div>
                  </div>
                  <Badge variant="default" className="text-xs">
                    Opted In
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="text-sm font-medium">Playdate Alerts</div>
                    <div className="text-muted-foreground text-xs">
                      Friend booking notifications
                    </div>
                  </div>
                  <Badge variant="default" className="text-xs">
                    Opted In
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="text-sm font-medium">
                      Channel Preference
                    </div>
                    <div className="text-muted-foreground text-xs">
                      How to reach this customer
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Email + SMS
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Pet Overview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Heart className="size-4" />
                Pets ({client.pets.length})
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("pets")}
              >
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {client.pets.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {client.pets.slice(0, 3).map((pet) => {
                    return (
                      <div
                        key={pet.id}
                        className="bg-muted/50 hover:bg-muted cursor-pointer rounded-lg p-3 transition-colors"
                        onClick={() =>
                          router.push(
                            `/facility/dashboard/clients/${id}/pets/${pet.id}`,
                          )
                        }
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {pet.type === "Dog" ? (
                              <Dog className="text-muted-foreground size-4" />
                            ) : (
                              <Cat className="text-muted-foreground size-4" />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold">
                                  {pet.name}
                                </h4>
                              </div>
                              <p className="text-muted-foreground text-xs">
                                {pet.breed} • {pet.age}{" "}
                                {pet.age === 1 ? "year" : "years"}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary">{pet.type}</Badge>
                        </div>
                        <div className="mt-2">
                          <TagList
                            entityType="pet"
                            entityId={pet.id}
                            compact
                            maxVisible={3}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  No pets registered
                </p>
              )}
            </CardContent>
          </Card>

          {/* Bookings History — Interactive Cards */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <History className="size-4" />
                Bookings
                {clientBookings.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {clientBookings.length}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => {
                    const firstPet = client.pets[0];
                    setGroomingDialogPetId(firstPet?.id ?? null);
                    setGroomingDialogOpen(true);
                  }}
                  title="Book a grooming appointment for this client"
                >
                  <Scissors className="size-3" />
                  Book Grooming
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => {
                    if (client) {
                      openBookingModal({
                        clients: [client],
                        facilityId: facilityRef,
                        facilityName: profile.businessName,
                        preSelectedClientId: client.id,
                        onCreateBooking: (booking) => {
                          void persistBooking(booking);
                        },
                      });
                    }
                  }}
                >
                  <Plus className="size-3" />
                  New Booking
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {clientBookings.length > 0 ? (
                <div className="space-y-2">
                  {clientBookings
                    .sort(
                      (a, b) =>
                        new Date(b.startDate).getTime() -
                        new Date(a.startDate).getTime(),
                    )
                    .map((booking, idx) => {
                      const pet = client.pets.find(
                        (p) => p.id === booking.petId,
                      );
                      return (
                        <BookingCard
                          key={booking.id}
                          booking={booking}
                          pet={pet}
                          pets={client.pets}
                          bookingIndex={idx}
                          totalBookings={clientBookings.length}
                        />
                      );
                    })}
                </div>
              ) : (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  No bookings yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Incidents — facility-side only (this page never renders in the
              customer's own portal). Booking link is internal. */}
          <Card id="incidents-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Siren className="size-4" />
                Incidents
                {clientIncidents.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {clientIncidents.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clientIncidents.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-b text-left text-xs">
                        <th className="py-2 pr-3 font-medium">Date</th>
                        <th className="py-2 pr-3 font-medium">Pet(s)</th>
                        <th className="py-2 pr-3 font-medium">Type</th>
                        <th className="py-2 pr-3 font-medium">Severity</th>
                        <th className="py-2 pr-3 font-medium">Incident</th>
                        <th className="py-2 pr-3 font-medium">Status</th>
                        <th className="py-2 font-medium">Booking</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientIncidents.map((incident) => {
                        const d = new Date(incident.incidentDate);
                        const dateStr = `${d.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })} ${d.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}`;
                        const bookingHref = incident.bookingId
                          ? `/facility/dashboard/clients/${
                              incident.clientId ?? client.id
                            }/bookings/${incident.bookingId}`
                          : null;
                        return (
                          <tr
                            key={incident.id}
                            onClick={() => setSelectedIncident(incident)}
                            className="hover:bg-muted/40 cursor-pointer border-b transition-colors last:border-0"
                          >
                            <td className="text-muted-foreground py-2.5 pr-3 whitespace-nowrap">
                              {dateStr}
                            </td>
                            <td className="py-2.5 pr-3">
                              {incident.petNames.join(", ") || "—"}
                            </td>
                            <td className="py-2.5 pr-3 capitalize">
                              {incident.type}
                            </td>
                            <td className="py-2.5 pr-3">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] capitalize",
                                  INCIDENT_SEVERITY_STYLES[incident.severity],
                                )}
                              >
                                {incident.severity}
                              </Badge>
                            </td>
                            <td
                              className="max-w-[220px] truncate py-2.5 pr-3 font-medium"
                              title={incident.title}
                            >
                              {incident.title.length > 50
                                ? `${incident.title.slice(0, 50)}…`
                                : incident.title}
                            </td>
                            <td className="py-2.5 pr-3">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] capitalize",
                                  INCIDENT_STATUS_STYLES[incident.status],
                                )}
                              >
                                {incident.status}
                              </Badge>
                            </td>
                            <td className="py-2.5 whitespace-nowrap">
                              {bookingHref ? (
                                <Link
                                  href={bookingHref}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-primary inline-flex items-center gap-1 hover:underline"
                                >
                                  View
                                  <ExternalLink className="size-3" />
                                </Link>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  No incidents on record
                </p>
              )}
            </CardContent>
          </Card>

          {/* Purchase History (Retail) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <ShoppingBag className="size-4" />
                Purchase History
              </CardTitle>
              {clientRetailPurchases.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("purchases")}
                >
                  View All
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {clientRetailPurchases.length > 0 ? (
                <div className="space-y-3">
                  {clientRetailPurchases.slice(0, 5).map((txn) => (
                    <div
                      key={txn.id}
                      className="bg-card hover:bg-muted flex items-start justify-between rounded-lg border p-3 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-amber-100 p-2">
                          <Receipt className="size-4 text-amber-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold">
                            {txn.transactionNumber}
                          </h4>
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            {txn.items.length} item
                            {txn.items.length !== 1 ? "s" : ""} •{" "}
                            {txn.items
                              .map((i) => i.productName)
                              .slice(0, 2)
                              .join(", ")}
                            {txn.items.length > 2 && "..."}
                          </p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            {formatDateTime(txn.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          ${txn.total.toFixed(2)}
                        </p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {txn.paymentMethod}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {clientRetailPurchases.length > 5 && (
                    <p className="text-muted-foreground pt-2 text-center text-xs">
                      Showing 5 of {clientRetailPurchases.length} purchases
                    </p>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <ShoppingBag className="text-muted-foreground mx-auto mb-2 size-10 opacity-50" />
                  <p className="text-muted-foreground text-sm">
                    No retail purchases yet
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Purchases from the store will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Preferences */}
          <ClientServicePreferences clientId={client.id} />

          {/* Customer Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquare className="size-4" />
                Customer Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <NotesList category="customer" entityId={client.id} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pets Tab */}
        <TabsContent value="pets" className="space-y-4">
          {(() => {
            const activePets = client.pets.filter(
              (p) => p.petStatus !== "deceased",
            );
            const deceasedPets = client.pets.filter(
              (p) => p.petStatus === "deceased",
            );
            return (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold">
                      Active Pets ({activePets.length})
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAddingPet(true)}
                    >
                      <Plus className="mr-1 size-4" />
                      {profileT("addPetButton")}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {activePets.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4">
                        {activePets.map((pet) => {
                          const petData = getPetData(pet);
                          // Per-animal incident history (2E.1) — spot repeat
                          // fights / recurring illness at a glance.
                          const petIncidents = allIncidents
                            .filter((i) => i.petIds.includes(pet.id))
                            .sort(
                              (a, b) =>
                                new Date(b.incidentDate).getTime() -
                                new Date(a.incidentDate).getTime(),
                            );
                          return (
                            <div
                              key={pet.id}
                              className="bg-card hover:bg-muted cursor-pointer rounded-lg border p-4 transition-colors"
                              onClick={() =>
                                router.push(
                                  `/facility/dashboard/clients/${id}/pets/${pet.id}`,
                                )
                              }
                            >
                              <div className="flex items-start gap-4">
                                <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-lg">
                                  {pet.type === "Dog" ? (
                                    <Dog className="text-muted-foreground size-8" />
                                  ) : (
                                    <Cat className="text-muted-foreground size-8" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-lg font-semibold">
                                      {pet.name}
                                    </h4>
                                    {pet.petStatus === "inactive" && (
                                      <Badge
                                        variant="secondary"
                                        className="bg-amber-100 text-xs text-amber-800 hover:bg-amber-100"
                                      >
                                        Inactive
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-muted-foreground text-sm">
                                    {pet.breed} • {pet.age}{" "}
                                    {pet.age === 1 ? "year" : "years"}
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <Badge variant="secondary">
                                      {pet.type}
                                    </Badge>
                                    <Badge variant="outline">
                                      {pet.weight} kg
                                    </Badge>
                                  </div>
                                  <div className="mt-2">
                                    <TagList
                                      entityType="pet"
                                      entityId={pet.id}
                                      editable
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-4">
                                <div className="text-center">
                                  <div className="text-lg font-bold">
                                    {petData.totalStays}
                                  </div>
                                  <div className="text-muted-foreground text-xs">
                                    Stays
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-lg font-bold">
                                    {petData.vaccinations.length}
                                  </div>
                                  <div className="text-muted-foreground text-xs">
                                    Vaccines
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-lg font-bold">
                                    {petData.reports.length}
                                  </div>
                                  <div className="text-muted-foreground text-xs">
                                    Reports
                                  </div>
                                </div>
                              </div>
                              {petData.expiredVaccinations.length > 0 && (
                                <div className="bg-destructive/10 text-destructive mt-3 flex items-center gap-2 rounded-sm p-2 text-xs">
                                  <AlertCircle className="size-3" />
                                  {petData.expiredVaccinations.length} expired
                                  vaccination(s)
                                </div>
                              )}
                              {petIncidents.length > 0 && (
                                <div className="mt-4 border-t pt-3">
                                  <div className="mb-2 flex items-center justify-between">
                                    <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold">
                                      <Siren className="size-3.5" />
                                      Incident history
                                      <Badge
                                        variant="secondary"
                                        className="text-[10px]"
                                      >
                                        {petIncidents.length}
                                      </Badge>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveTab("overview");
                                        if (typeof document !== "undefined") {
                                          setTimeout(() => {
                                            document
                                              .getElementById(
                                                "incidents-section",
                                              )
                                              ?.scrollIntoView({
                                                behavior: "smooth",
                                                block: "start",
                                              });
                                          }, 50);
                                        }
                                      }}
                                      className="text-primary text-xs hover:underline"
                                    >
                                      View all
                                    </button>
                                  </div>
                                  <ul className="space-y-1">
                                    {petIncidents
                                      .slice(0, 3)
                                      .map((incident) => (
                                        <li
                                          key={incident.id}
                                          className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
                                        >
                                          <span className="text-muted-foreground whitespace-nowrap">
                                            {new Date(
                                              incident.incidentDate,
                                            ).toLocaleDateString("en-US", {
                                              month: "short",
                                              day: "numeric",
                                              year: "numeric",
                                            })}
                                          </span>
                                          <span className="capitalize">
                                            {incident.type}
                                          </span>
                                          <Badge
                                            variant="outline"
                                            className={cn(
                                              "text-[10px] capitalize",
                                              INCIDENT_SEVERITY_STYLES[
                                                incident.severity
                                              ],
                                            )}
                                          >
                                            {incident.severity}
                                          </Badge>
                                          <Badge
                                            variant="outline"
                                            className={cn(
                                              "text-[10px] capitalize",
                                              INCIDENT_STATUS_STYLES[
                                                incident.status
                                              ],
                                            )}
                                          >
                                            {incident.status}
                                          </Badge>
                                        </li>
                                      ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <Heart className="text-muted-foreground mx-auto mb-2 size-12" />
                        <p className="text-muted-foreground text-sm">
                          No active pets registered
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={() => setAddingPet(true)}
                        >
                          <Plus className="mr-1 size-4" />
                          {profileT("addFirstPet")}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {deceasedPets.length > 0 && (
                  <Card className="border-dashed opacity-75">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <Heart className="size-4 text-red-400" />
                        Deceased Pets ({deceasedPets.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {deceasedPets.map((pet) => (
                          <div
                            key={pet.id}
                            className="bg-muted/50 hover:bg-muted flex cursor-pointer items-center gap-4 rounded-lg border border-dashed p-3 transition-colors"
                            onClick={() =>
                              router.push(
                                `/facility/dashboard/clients/${id}/pets/${pet.id}`,
                              )
                            }
                          >
                            <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
                              {pet.type === "Dog" ? (
                                <Dog className="text-muted-foreground size-5" />
                              ) : (
                                <Cat className="text-muted-foreground size-5" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{pet.name}</h4>
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  Deceased
                                </Badge>
                              </div>
                              <p className="text-muted-foreground text-xs">
                                {pet.breed} • {pet.type}
                              </p>
                            </div>
                            <p className="text-muted-foreground text-xs">
                              View records
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            );
          })()}
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <DollarSign className="size-4" />
                Billing & Payments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Billing Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-xl font-bold text-green-600">
                    {maskAmount(`$${totalRevenue.toFixed(2)}`)}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Total Paid
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-xl font-bold text-amber-600">
                    {maskAmount(`$${totalOutstanding.toFixed(2)}`)}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Outstanding
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-xl font-bold text-green-600">
                    {maskAmount(`$${totalCredits.toFixed(2)}`)}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Credit Balance
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-xl font-bold">
                    {clientPayments.length}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Transactions
                  </div>
                </div>
              </div>

              {/* Outstanding Alert */}
              {totalOutstanding > 0 && (
                <div className="flex items-center gap-2 rounded-2xl border p-3">
                  <AlertCircle className="text-warning size-4" aria-hidden />
                  <span className="text-warning text-sm font-semibold">
                    {profileFill("outstandingAlert", {
                      amount: formatMoney(totalOutstanding, profileLocale),
                    })}
                  </span>
                </div>
              )}

              {/* Billing Tabs */}
              <Tabs defaultValue="payments" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                  <TabsTrigger value="invoices">
                    Invoices
                    {openBookingInvoices.length > 0 && (
                      <Badge variant="pending" className="ml-1 tabular-nums">
                        {openBookingInvoices.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="credits">Credits</TabsTrigger>
                  <TabsTrigger value="giftcards">Gift Cards</TabsTrigger>
                  <TabsTrigger value="membership">
                    Membership
                    {client.membership?.status === "active" && (
                      <Badge
                        variant="outline"
                        className="ml-1 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
                      >
                        Active
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Payments Tab */}
                <TabsContent value="payments" className="mt-4">
                  {clientPayments.length > 0 ? (
                    <div className="space-y-3">
                      {clientPayments
                        .sort(
                          (a, b) =>
                            new Date(b.createdAt).getTime() -
                            new Date(a.createdAt).getTime(),
                        )
                        .map((payment) => (
                          <div
                            key={payment.id}
                            className="bg-card hover:bg-muted flex items-start justify-between rounded-lg border p-4 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`rounded-lg p-2 ${
                                  payment.isRefund
                                    ? "bg-red-100"
                                    : "bg-green-100"
                                } `}
                              >
                                {payment.method === "card" && (
                                  <CreditCard className="size-4" />
                                )}
                                {payment.method === "cash" && (
                                  <Wallet className="size-4" />
                                )}
                                {payment.method === "gift_card" && (
                                  <Gift className="size-4" />
                                )}
                                {!["card", "cash", "gift_card"].includes(
                                  payment.method,
                                ) && <DollarSign className="size-4" />}
                              </div>
                              <div>
                                {/* A payment row carries no free-text
                                    description to print. What it does carry is
                                    the booking it belongs to and who took it,
                                    which is what somebody reading a payment
                                    actually wants to know. */}
                                <h4 className="text-sm font-semibold">
                                  {payment.isRefund ? "Refund" : "Payment"}
                                  {payment.bookingId
                                    ? ` · Booking #${payment.bookingId}`
                                    : ""}
                                </h4>
                                <p className="text-muted-foreground mt-1 text-xs">
                                  {formatDate(payment.createdAt)} •{" "}
                                  {payment.method.replace("_", " ")}
                                  {payment.cardLast4
                                    ? ` •••• ${payment.cardLast4}`
                                    : ""}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div
                                className={`text-sm font-semibold ${
                                  payment.isRefund
                                    ? "text-red-600"
                                    : "text-green-600"
                                } `}
                              >
                                {/* NO manufactured minus sign. A refund is
                                    STORED as a negative amount, so prefixing
                                    one — as the fixture version did — would
                                    render "-$-52.50". */}
                                {payment.amount < 0 ? "-" : ""}$
                                {Math.abs(payment.amount).toFixed(2)}
                              </div>
                              <Badge
                                variant={
                                  payment.isRefund ? "destructive" : "outline"
                                }
                                className="mt-1 text-xs"
                              >
                                {payment.isRefund ? "refunded" : "completed"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground py-8 text-center text-sm">
                      No payment history
                    </p>
                  )}
                </TabsContent>

                {/* Invoices Tab */}
                <TabsContent value="invoices" className="mt-4">
                  {/* Booking-derived invoices */}
                  {clientBookings.filter((b) => b.invoice).length > 0 && (
                    <div className="mb-4 space-y-2">
                      <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                        Booking Invoices
                      </p>
                      {clientBookings
                        .filter((b) => b.invoice)
                        .map((b) => {
                          const inv = b.invoice!;
                          const bPet = client.pets.find(
                            (p) =>
                              p.id ===
                              (Array.isArray(b.petId) ? b.petId[0] : b.petId),
                          );
                          return (
                            <Link
                              key={inv.id}
                              href={`/facility/dashboard/bookings/${b.id}`}
                              className="bg-card hover:bg-muted/50 flex items-start justify-between rounded-lg border p-3 transition-colors"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold">
                                    {inv.id}
                                  </span>
                                  <Badge
                                    variant={
                                      inv.status === "closed"
                                        ? "outline"
                                        : inv.status === "open"
                                          ? "secondary"
                                          : "default"
                                    }
                                    className="text-[10px]"
                                  >
                                    {inv.status}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] capitalize"
                                  >
                                    {b.service}
                                  </Badge>
                                </div>
                                <p className="text-muted-foreground mt-0.5 text-xs">
                                  Booking #{b.id}
                                  {bPet && ` · ${bPet.name}`} ·{" "}
                                  {formatDate(b.startDate)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold">
                                  ${inv.total.toFixed(2)}
                                </p>
                                {inv.remainingDue > 0 && (
                                  <p className="text-xs font-medium text-amber-600">
                                    ${inv.remainingDue.toFixed(2)} due
                                  </p>
                                )}
                                {inv.remainingDue === 0 && (
                                  <p className="text-xs text-emerald-600">
                                    Paid
                                  </p>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                    </div>
                  )}

                  {clientBookings.filter((b) => b.invoice).length === 0 && (
                    <p className="text-muted-foreground py-8 text-center text-sm">
                      No invoices
                    </p>
                  )}
                </TabsContent>

                {/* Credits Tab */}
                <TabsContent value="credits" className="mt-4">
                  {creditEntries.length > 0 ? (
                    <ul className="space-y-2">
                      {creditEntries.map((entry) => (
                        <li
                          key={entry.id}
                          className="flex min-h-12 items-start justify-between gap-3 rounded-2xl border p-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">
                              {profileT(
                                entry.amount >= 0
                                  ? "creditIssued"
                                  : "creditSpent",
                              )}
                            </p>
                            {entry.note && (
                              <p className="text-ink-secondary text-sm">
                                {entry.note}
                              </p>
                            )}
                            <p className="text-ink-tertiary text-xs tabular-nums">
                              {formatDateLong(entry.createdAt, profileLocale)}
                              {entry.authorName ? ` · ${entry.authorName}` : ""}
                            </p>
                          </div>
                          <p
                            className="shrink-0 text-sm font-semibold tabular-nums"
                            data-sign={entry.amount >= 0 ? "in" : "out"}
                          >
                            {maskAmount(
                              formatMoney(entry.amount, profileLocale),
                            )}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-ink-tertiary py-8 text-center text-sm">
                      {profileT("noCredit")}
                    </p>
                  )}
                </TabsContent>

                {/* Gift Cards Tab */}
                <TabsContent value="giftcards" className="mt-4">
                  {clientGiftCards.length > 0 ? (
                    <ul className="space-y-2">
                      {clientGiftCards.map((gc) => (
                        <li
                          key={gc.id}
                          className="flex min-h-12 items-start justify-between gap-3 rounded-2xl border p-3"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Gift
                                className="text-ink-tertiary size-4"
                                aria-hidden
                              />
                              <span className="font-mono text-sm font-semibold">
                                {gc.code}
                              </span>
                              <StatusBadge
                                type="status"
                                value={
                                  gc.effectiveStatus === "redeemed"
                                    ? "completed"
                                    : gc.effectiveStatus
                                }
                              />
                            </div>
                            {gc.recipientName && (
                              <p className="text-ink-secondary mt-1 text-sm">
                                {profileFill("giftCardFor", {
                                  name: gc.recipientName,
                                })}
                              </p>
                            )}
                            {gc.expiresAt && (
                              <p className="text-ink-tertiary text-xs tabular-nums">
                                {profileFill("giftCardExpires", {
                                  date: formatDateLong(
                                    gc.expiresAt,
                                    profileLocale,
                                  ),
                                })}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold tabular-nums">
                              {formatMoney(gc.balance, profileLocale)}
                            </p>
                            <p className="text-ink-tertiary text-xs tabular-nums">
                              {profileFill("giftCardOf", {
                                amount: formatMoney(
                                  gc.initialAmount,
                                  profileLocale,
                                ),
                              })}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-ink-tertiary py-8 text-center text-sm">
                      {profileT("noGiftCards")}
                    </p>
                  )}
                </TabsContent>

                {/* Membership & Packages Tab */}
                <TabsContent value="membership" className="mt-4">
                  <div className="space-y-4">
                    {/* Membership */}
                    <div className="rounded-lg border p-4">
                      <p className="text-muted-foreground mb-3 text-[10px] font-semibold tracking-wider uppercase">
                        Membership
                      </p>
                      {client.membership ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "flex size-10 items-center justify-center rounded-full",
                                  client.membership.status === "active"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-muted text-muted-foreground",
                                )}
                              >
                                <Award className="size-5" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold">
                                  {client.membership.plan} Plan
                                </p>
                                <p className="text-muted-foreground text-xs capitalize">
                                  {client.membership.status}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant={
                                client.membership.status === "active"
                                  ? "default"
                                  : "secondary"
                              }
                              className="capitalize"
                            >
                              {client.membership.status}
                            </Badge>
                          </div>
                          <div className="divide-y rounded-md border">
                            <div className="flex justify-between px-3 py-2 text-xs">
                              <span className="text-muted-foreground">
                                Start Date
                              </span>
                              <span className="font-medium">
                                {formatDate(client.membership.startDate)}
                              </span>
                            </div>
                            <div className="flex justify-between px-3 py-2 text-xs">
                              <span className="text-muted-foreground">
                                Expiry Date
                              </span>
                              <span className="font-medium">
                                {formatDate(client.membership.expiryDate)}
                              </span>
                            </div>
                            {client.membership.benefits.discountPercent && (
                              <div className="flex justify-between px-3 py-2 text-xs">
                                <span className="text-muted-foreground">
                                  Discount
                                </span>
                                <span className="font-medium text-emerald-600">
                                  {client.membership.benefits.discountPercent}%
                                  off all services
                                </span>
                              </div>
                            )}
                            {client.membership.benefits.includedServices &&
                              client.membership.benefits.includedServices
                                .length > 0 && (
                                <div className="flex justify-between px-3 py-2 text-xs">
                                  <span className="text-muted-foreground">
                                    Included Services
                                  </span>
                                  <span className="font-medium">
                                    {client.membership.benefits.includedServices
                                      .map(
                                        (s) => `${s.quantity}× ${s.moduleId}`,
                                      )
                                      .join(", ")}
                                  </span>
                                </div>
                              )}
                            {client.membership.benefits.freeAddOns &&
                              client.membership.benefits.freeAddOns.length >
                                0 && (
                                <div className="flex justify-between px-3 py-2 text-xs">
                                  <span className="text-muted-foreground">
                                    Free Add-ons
                                  </span>
                                  <span className="font-medium">
                                    {client.membership.benefits.freeAddOns.join(
                                      ", ",
                                    )}
                                  </span>
                                </div>
                              )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground py-4 text-center text-sm">
                          No active membership
                        </p>
                      )}
                    </div>

                    {/* Packages */}
                    <div className="rounded-lg border p-4">
                      <p className="text-muted-foreground mb-3 text-[10px] font-semibold tracking-wider uppercase">
                        Packages
                      </p>
                      {client.packages && client.packages.length > 0 ? (
                        <div className="space-y-3">
                          {client.packages.map((pkg) => {
                            const usagePercent =
                              (pkg.usedCredits / pkg.totalCredits) * 100;
                            return (
                              <div
                                key={pkg.id}
                                className="rounded-md border p-3"
                              >
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-semibold">
                                    {pkg.name}
                                  </p>
                                  <Badge
                                    variant={
                                      pkg.remainingCredits > 0
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {pkg.remainingCredits} remaining
                                  </Badge>
                                </div>
                                <div className="mt-2">
                                  <div className="bg-muted mb-1 h-2 overflow-hidden rounded-full">
                                    <div
                                      className="bg-primary h-full rounded-full transition-all"
                                      style={{
                                        width: `${usagePercent}%`,
                                      }}
                                    />
                                  </div>
                                  <div className="flex justify-between text-[11px]">
                                    <span className="text-muted-foreground">
                                      {pkg.usedCredits} of {pkg.totalCredits}{" "}
                                      used
                                    </span>
                                    <span className="text-muted-foreground">
                                      ${pkg.pricePerCredit}/credit
                                    </span>
                                  </div>
                                </div>
                                <div className="text-muted-foreground mt-2 text-xs">
                                  Purchased: {formatDate(pkg.purchaseDate)}
                                  {pkg.expiryDate &&
                                    ` · Expires: ${formatDate(pkg.expiryDate)}`}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-muted-foreground py-4 text-center text-sm">
                          No packages purchased
                        </p>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchase History (Retail) Tab */}
        <TabsContent value="purchases" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <ShoppingBag className="size-4" />
                  Retail Purchase History
                </CardTitle>
                <p className="text-muted-foreground mt-1 text-xs">
                  Food, accessories, and other items purchased from the store
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/facility/dashboard/services/retail?clientId=${client.id}`}
                >
                  <ExternalLink className="mr-1 size-4" />
                  New Sale
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {clientRetailPurchases.length > 0 ? (
                <div className="space-y-4">
                  <div className="bg-muted/50 flex items-center justify-between rounded-lg p-3">
                    <span className="text-sm font-medium">Total Spent</span>
                    <span className="text-xl font-bold text-amber-600">
                      ${totalRetailSpent.toFixed(2)}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {clientRetailPurchases.map((txn) => (
                      <div
                        key={txn.id}
                        className="bg-card overflow-hidden rounded-lg border"
                      >
                        <div className="bg-muted/30 flex items-center justify-between border-b p-4">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-amber-100 p-2">
                              <Receipt className="size-4 text-amber-600" />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold">
                                {txn.transactionNumber}
                              </h4>
                              <p className="text-muted-foreground text-xs">
                                {formatDateTime(txn.createdAt)} •{" "}
                                {txn.paymentMethod}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">
                              ${txn.total.toFixed(2)}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {txn.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="p-4">
                          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
                            Items
                          </p>
                          <div className="space-y-2">
                            {txn.items.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between text-sm"
                              >
                                <span>
                                  {item.productName}
                                  {item.variantName && (
                                    <span className="text-muted-foreground">
                                      {" "}
                                      ({item.variantName})
                                    </span>
                                  )}
                                  <span className="text-muted-foreground ml-1">
                                    × {item.quantity}
                                  </span>
                                </span>
                                <span className="font-medium">
                                  ${item.total.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                          {txn.discountTotal > 0 && (
                            <div className="text-muted-foreground mt-2 flex justify-between border-t pt-2 text-sm">
                              <span>Discount</span>
                              <span>-${txn.discountTotal.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <ShoppingBag className="text-muted-foreground mx-auto mb-4 h-16 w-16 opacity-30" />
                  <h3 className="mb-2 text-lg font-semibold">
                    No retail purchases yet
                  </h3>
                  <p className="text-muted-foreground mx-auto max-w-sm text-sm">
                    When this customer buys food, accessories, or other products
                    from your store, their purchases will appear here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <ClientDocumentsPanel
            clientRef={client.id}
            clientName={client.name}
            pets={client.pets}
          />
        </TabsContent>

        {/* Communications Tab */}
        <TabsContent value="communications" className="space-y-4">
          {/* Playdate Alerts for this client */}
          {clientPlaydateAlerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Heart className="size-4" />
                  Playdate Alert History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {clientPlaydateAlerts
                    .sort(
                      (a, b) =>
                        new Date(b.sentAt).getTime() -
                        new Date(a.sentAt).getTime(),
                    )
                    .slice(0, 5)
                    .map((alert) => (
                      <div
                        key={alert.id}
                        className="bg-card space-y-2 rounded-lg border p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Heart className="size-4 text-pink-500" />
                            <div>
                              <Badge
                                variant="outline"
                                className="text-xs capitalize"
                              >
                                {formatAlertChannel(alert.channel)}
                              </Badge>
                              <Badge
                                variant={getAlertStatusVariant(alert.status)}
                                className="ml-1 text-xs"
                              >
                                {alert.status}
                              </Badge>
                            </div>
                          </div>
                          <span className="text-muted-foreground text-xs">
                            {formatDateTime(alert.sentAt)}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold">
                            Playdate alert: {alert.triggerPetName} booked
                          </h4>
                          <p className="text-muted-foreground mt-1 text-sm">
                            {alert.triggerPetName} is coming — alert sent for{" "}
                            {alert.recipientPetName}
                          </p>
                        </div>
                        {alert.reasonSuppressed && (
                          <div className="text-muted-foreground border-t pt-2 text-xs">
                            Suppressed: {alert.reasonSuppressed}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Call History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  Call History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {clientCalls.length > 0 ? (
                  <div className="space-y-3">
                    {clientCalls
                      .sort(
                        (a, b) =>
                          new Date(b.timestamp).getTime() -
                          new Date(a.timestamp).getTime(),
                      )
                      .slice(0, 5)
                      .map((call) => (
                        <div
                          key={call.id}
                          className="bg-card space-y-2 rounded-lg border p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <PhoneCall className="size-4" />
                              <div>
                                <Badge
                                  variant={
                                    call.direction === "inbound"
                                      ? "default"
                                      : "secondary"
                                  }
                                  className="text-xs capitalize"
                                >
                                  {call.direction}
                                </Badge>
                                <Badge
                                  variant={
                                    call.status === "completed"
                                      ? "outline"
                                      : call.status === "missed"
                                        ? "destructive"
                                        : "secondary"
                                  }
                                  className="ml-1 text-xs"
                                >
                                  {call.status}
                                </Badge>
                              </div>
                            </div>
                            <span className="text-muted-foreground text-xs">
                              {formatDateTime(call.timestamp)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium">
                                Duration: {formatDuration(call.duration)}
                              </div>
                              {call.staffName && (
                                <div className="text-muted-foreground mt-1 text-xs">
                                  Handled by: {call.staffName}
                                </div>
                              )}
                            </div>
                            {call.recordingUrl && (
                              <Button variant="outline" size="sm">
                                <Play className="mr-1 size-3" />
                                Play Recording
                              </Button>
                            )}
                          </div>
                          {call.notes && (
                            <div className="border-t pt-2">
                              <p className="text-muted-foreground text-sm">
                                {call.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    No call history
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Messages & Emails */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  Messages & Emails
                </CardTitle>
              </CardHeader>
              <CardContent>
                {clientComms.length > 0 ? (
                  <div className="space-y-3">
                    {clientComms
                      .sort(
                        (a, b) =>
                          new Date(b.timestamp).getTime() -
                          new Date(a.timestamp).getTime(),
                      )
                      .slice(0, 5)
                      .map((comm) => (
                        <div
                          key={comm.id}
                          className="bg-card space-y-2 rounded-lg border p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {getCommunicationIcon(comm.type)}
                              <div>
                                <Badge
                                  variant="outline"
                                  className="text-xs capitalize"
                                >
                                  {comm.type}
                                </Badge>
                                {comm.direction === "outbound" ? (
                                  <Badge
                                    variant="secondary"
                                    className="ml-1 text-xs"
                                  >
                                    Sent
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="secondary"
                                    className="ml-1 text-xs"
                                  >
                                    Received
                                  </Badge>
                                )}
                                {comm.status && (
                                  <Badge
                                    variant="outline"
                                    className="ml-1 text-xs"
                                  >
                                    {comm.status}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <span className="text-muted-foreground text-xs">
                              {formatDateTime(comm.timestamp)}
                            </span>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold">
                              {comm.subject}
                            </h4>
                            <p className="text-muted-foreground mt-1 text-sm">
                              {comm.content}
                            </p>
                          </div>
                          {comm.staffName && (
                            <div className="text-muted-foreground border-t pt-2 text-xs">
                              By: {comm.staffName}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    No message history
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <PageAuditTrail area="clients" entityId={String(id)} />

      {/* Grooming appointment entry point — opens the same dialog used on the
          calendar, pre-filled with this client and (optionally) the first pet. */}
      {(() => {
        const targetPet = client.pets.find((p) => p.id === groomingDialogPetId);
        const targetPetExtras = targetPet as
          | (Pet & { coatType?: string })
          | undefined;
        function inferSize(weightLb?: number): string {
          if (weightLb === undefined) return "";
          if (weightLb < 20) return "small";
          if (weightLb < 50) return "medium";
          if (weightLb < 80) return "large";
          return "giant";
        }
        return (
          <NewAppointmentDialog
            open={groomingDialogOpen}
            onOpenChange={setGroomingDialogOpen}
            prefillClient={{
              clientId: client.id,
              ownerName: client.name ?? "",
              ownerPhone: client.phone ?? "",
              ownerEmail: client.email ?? "",
              pet: targetPet
                ? {
                    id: targetPet.id,
                    name: targetPet.name,
                    breed: targetPet.breed,
                    size: inferSize(targetPet.weight),
                    coatType: targetPetExtras?.coatType ?? "",
                    ageMonths:
                      typeof targetPet.age === "number"
                        ? Math.round(targetPet.age * 12)
                        : undefined,
                  }
                : undefined,
            }}
          />
        );
      })()}

      {/* Incident Details Modal — opened from the Overview → Incidents table */}
      {addingPet && (
        <AddPetDialog
          open
          onOpenChange={setAddingPet}
          clientRef={client.id}
          clientName={client.name}
        />
      )}

      <Dialog
        open={!!selectedIncident}
        onOpenChange={(open) => {
          if (!open) setSelectedIncident(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          {selectedIncident && (
            <IncidentDetailsModal
              incident={selectedIncident}
              onClose={() => setSelectedIncident(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
