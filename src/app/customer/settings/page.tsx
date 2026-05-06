"use client";

import { AlertCircle, Edit, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { useCustomerSettingsForm } from "./_components/use-customer-settings-form";
import { ProfileCard } from "./_components/ProfileCard";
import { PickupDropoffCard } from "./_components/PickupDropoffCard";
import { PaymentPreferencesCard } from "./_components/PaymentPreferencesCard";
import { InstantBookingCard } from "./_components/InstantBookingCard";
import { NotificationPreferencesCard } from "./_components/NotificationPreferencesCard";
import { LoginSecurityCard } from "./_components/LoginSecurityCard";
import { PrivacyConsentCard } from "./_components/PrivacyConsentCard";

export default function CustomerSettingsPage() {
  const { selectedFacility: _selectedFacility } = useCustomerFacility();
  const form = useCustomerSettingsForm();

  return (
    <div className="from-background via-muted/20 to-background min-h-screen bg-linear-to-br p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Account Settings</h1>
            <p className="text-muted-foreground mt-1">
              Manage your profile and preferences
            </p>
          </div>
          {!form.isEditing ? (
            <Button onClick={() => form.setIsEditing(true)}>
              <Edit className="mr-2 size-4" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={form.handleCancel}
                disabled={form.isSaving}
              >
                Cancel
              </Button>
              <Button onClick={form.handleSave} disabled={form.isSaving}>
                {form.isSaving ? (
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

        <ProfileCard
          profileData={form.profileData}
          setProfileData={form.setProfileData}
          isEditing={form.isEditing}
          errors={form.errors}
        />

        <PickupDropoffCard
          profileData={form.profileData}
          setProfileData={form.setProfileData}
          isEditing={form.isEditing}
        />

        <LoginSecurityCard
          email={form.profileData.email}
          phone={form.profileData.phone}
        />

        <PaymentPreferencesCard
          paymentPreferences={form.paymentPreferences}
          setPaymentPreferences={form.setPaymentPreferences}
          isEditing={form.isEditing}
        />

        <InstantBookingCard
          summary={form.instabookSummary}
          hasAny={form.hasAnyInstabook}
        />

        <NotificationPreferencesCard
          notificationPreferences={form.notificationPreferences}
          setNotificationPreferences={form.setNotificationPreferences}
          updateCategory={form.updateCategory}
          selectedNotificationLanguage={form.selectedNotificationLanguage}
          customerLanguageOptions={form.customerLanguageOptions}
          customerPets={form.customerPets}
          isEditing={form.isEditing}
        />

        <PrivacyConsentCard
          privacyPreferences={form.privacyPreferences}
          setPrivacyPreferences={form.setPrivacyPreferences}
          isEditing={form.isEditing}
        />

        {form.isEditing && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-primary mt-0.5 size-5" />
                <div className="flex-1">
                  <p className="mb-1 text-sm font-medium">
                    Changes sync automatically
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Any updates you make will automatically reflect on the
                    facility side. The facility staff will see your updated
                    information immediately.
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
