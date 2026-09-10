"use client";

import Link from "next/link";
import { useCurrentCustomer } from "@/lib/api/current-customer";
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
import {
  AdditionalContactsManager,
  contactTagLabel,
} from "@/components/clients/AdditionalContactsManager";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import {
  ADDITIONAL_CONTACT_TAGS,
  type AdditionalContact,
} from "@/types/client";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { rich } from "@/lib/i18n/rich";
import { PageHeader } from "@/components/ui/page-header";

export default function CustomerHouseholdPage() {
  const { client: customer } = useCurrentCustomer();
  const customerId = customer?.id;

  const { selectedFacility: _selectedFacility } = useCustomerFacility();
  const { t } = useCustomerText("household");

  const initialContacts = useMemo<AdditionalContact[]>(
    () => customer?.additionalContacts ?? [],
    [customer],
  );

  const [contacts, setContacts] =
    useState<AdditionalContact[]>(initialContacts);
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
      toast.success(t("contactsUpdated"));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("failedToUpdate"));
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
          <PageHeader
            title={t("householdAndContacts")}
            description={t("householdDescription")}
          />
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 size-4" />
              {t("editContacts")}
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
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    {t("saving")}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 size-4" />
                    {t("saveChanges")}
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
              {t("primaryAccountHolder")}
            </CardTitle>
            <CardDescription>
              {rich(t("mainPointOfContact"), {
                link: (
                  <Link
                    href="/customer/settings"
                    className="text-primary hover:underline"
                  >
                    {t("editYourProfile")}
                  </Link>
                ),
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold">
                    {customer?.name ?? "—"}
                  </p>
                  <Badge variant="default">{t("primary")}</Badge>
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
                  {t("manageInSettings")}
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
              {t("additionalContacts")}
            </CardTitle>
            <CardDescription>{t("additionalContactsBody")}</CardDescription>
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
                  <p className="mb-1 text-sm font-medium">{t("staysInSync")}</p>
                  <p className="text-muted-foreground text-sm">
                    {t("staysInSyncBody")}
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
  const { t } = useCustomerText("household");
  // The tag names come from the same catalogue the contacts manager below
  // uses, so the legend and the chips cannot disagree.
  const { t: contactT } = useStaffText("createClient");
  return (
    <div className="bg-muted/30 flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-3 text-xs">
      <span className="text-muted-foreground font-medium">
        {t("tagsLabel")}
      </span>
      {ADDITIONAL_CONTACT_TAGS.map((tag) => (
        <Badge key={tag} variant="secondary" className="font-normal">
          {contactTagLabel(tag, contactT)}
        </Badge>
      ))}
      <span className="text-muted-foreground">{t("tagsHint")}</span>
    </div>
  );
}
