"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Edit,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserCircle,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdditionalContactsManager } from "@/components/clients/AdditionalContactsManager";
import { clients } from "@/data/clients";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import {
  ADDITIONAL_CONTACT_TAG_LABELS,
  ADDITIONAL_CONTACT_TAGS,
  type AdditionalContact,
} from "@/types/client";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

export default function CustomerHouseholdPage() {
  const { selectedFacility: _selectedFacility } = useCustomerFacility();

  const customer = useMemo(
    () => clients.find((c) => c.id === MOCK_CUSTOMER_ID),
    [],
  );

  const initialContacts = useMemo<AdditionalContact[]>(
    () => customer?.additionalContacts ?? [],
    [customer],
  );

  const [contacts, setContacts] = useState<AdditionalContact[]>(initialContacts);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Replace with actual API call.
      // Writes to customer.additionalContacts — same field staff edit on the
      // facility client file, so the two portals stay in sync.
      await new Promise((resolve) => setTimeout(resolve, 800));
      setIsEditing(false);
      toast.success(
        "Contacts updated. Staff will see the change on the facility side immediately.",
      );
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update contacts",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setContacts(initialContacts);
    setIsEditing(false);
  };

  return (
    <div className="from-background via-muted/20 to-background min-h-screen bg-linear-to-br p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Household & Contacts</h1>
            <p className="text-muted-foreground mt-1">
              People your facility may contact for pickup, drop-off, or
              emergencies.
            </p>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 size-4" />
              Edit Contacts
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 size-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Primary account holder — read-only; edited from Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="size-5" />
              Primary Account Holder
            </CardTitle>
            <CardDescription>
              Your facility&apos;s main point of contact for this account. To
              update name, email, or phone,{" "}
              <Link
                href="/customer/settings"
                className="text-primary hover:underline"
              >
                edit your profile
              </Link>
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold">
                    {customer?.name ?? "—"}
                  </p>
                  <Badge variant="default">Primary</Badge>
                </div>
                <div className="text-muted-foreground space-y-0.5 text-sm">
                  {customer?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="size-3.5" />
                      {customer.email}
                    </div>
                  )}
                  {customer?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="size-3.5" />
                      {customer.phone}
                    </div>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/customer/settings">
                  <ExternalLink className="mr-2 size-3.5" />
                  Manage in Settings
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Additional contacts — same component & data the facility uses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5" />
              Additional Contacts
            </CardTitle>
            <CardDescription>
              Add family, friends, or pet transport services your facility may
              contact. Tag each person with what they&apos;re authorized for —
              the facility honors these tags at check-in and pick-up.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TagLegend />
            <AdditionalContactsManager
              value={contacts}
              onChange={setContacts}
              disabled={!isEditing}
              heading=""
              description=""
            />
          </CardContent>
        </Card>

        {isEditing && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <ShieldCheck className="text-primary mt-0.5 size-5" />
                <div className="flex-1">
                  <p className="mb-1 text-sm font-medium">
                    Stays in sync with the facility
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Your changes go to the same contact list staff see on the
                    client file. Whoever you tag for pickup or drop-off can
                    arrive without you needing to call ahead.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function TagLegend() {
  return (
    <div className="bg-muted/30 flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-3 text-xs">
      <span className="text-muted-foreground font-medium">Tags:</span>
      {ADDITIONAL_CONTACT_TAGS.map((tag) => (
        <Badge key={tag} variant="secondary" className="font-normal">
          {ADDITIONAL_CONTACT_TAG_LABELS[tag]}
        </Badge>
      ))}
      <span className="text-muted-foreground">
        — choose one or more per contact based on what they&apos;re allowed to
        do.
      </span>
    </div>
  );
}
