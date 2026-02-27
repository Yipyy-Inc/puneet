"use client";

import { useState, useMemo } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Mail,
  Phone,
  MapPin,
  UserCircle,
  Bell,
  Save,
  Edit,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

export default function CustomerSettingsPage() {
  const { selectedFacility } = useCustomerFacility();
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Get customer data
  const customer = useMemo(
    () => clients.find((c) => c.id === MOCK_CUSTOMER_ID),
    []
  );

  const [profileData, setProfileData] = useState({
    name: customer?.name || "",
    email: customer?.email || "",
    phone: customer?.phone || "",
    address: {
      street: customer?.address?.street || "",
      city: customer?.address?.city || "",
      state: customer?.address?.state || "",
      zip: customer?.address?.zip || "",
      country: customer?.address?.country || "USA",
    },
    emergencyContact: {
      name: customer?.emergencyContact?.name || "",
      relationship: customer?.emergencyContact?.relationship || "",
      phone: customer?.emergencyContact?.phone || "",
      email: customer?.emergencyContact?.email || "",
    },
  });

  const [notificationPreferences, setNotificationPreferences] = useState({
    // Email notifications
    emailBookingConfirmations: true,
    emailBookingReminders: true,
    emailCheckInOut: true,
    emailReportCards: true,
    emailPaymentReceipts: true,
    // Explicit consent for marketing email
    emailMarketing: false,
    // SMS notifications
    smsBookingReminders: true,
    smsEmergencyAlerts: true,
    smsCheckInOut: false,
    // Explicit consent for marketing SMS
    smsMarketing: false,
    // Push notifications (in‑app / device)
    pushBookingConfirmations: true,
    pushBookingReminders: true,
    pushReportCards: true,
    pushPetUpdates: true,
    // Per-pet preferences (report cards)
    perPetReportCards: {} as Record<number, boolean>,
    // Quiet hours for SMS/push
    quietHoursEnabled: false,
    quietHoursStart: "21:00",
    quietHoursEnd: "07:00",
    // Language preference
    language: "en",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Derive pets for this customer (for per-pet notification preferences)
  const customerPets = useMemo(() => {
    return customer?.pets || [];
  }, [customer]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!profileData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!profileData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (profileData.phone && !/^[\d\s\-\(\)]+$/.test(profileData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    if (!profileData.emergencyContact.name.trim()) {
      newErrors.emergencyContactName = "Emergency contact name is required";
    }

    if (!profileData.emergencyContact.phone.trim()) {
      newErrors.emergencyContactPhone = "Emergency contact phone is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error("Please fix the errors before saving");
      return;
    }

    setIsSaving(true);

    try {
      // TODO: Replace with actual API call
      // This should update the customer profile and sync to all facilities
      await updateCustomerProfile(profileData, notificationPreferences);
      setIsEditing(false);
      toast.success("Profile updated successfully! Changes will reflect on the facility side.");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original customer data
    setProfileData({
      name: customer?.name || "",
      email: customer?.email || "",
      phone: customer?.phone || "",
      address: {
        street: customer?.address?.street || "",
        city: customer?.address?.city || "",
        state: customer?.address?.state || "",
        zip: customer?.address?.zip || "",
        country: customer?.address?.country || "USA",
      },
      emergencyContact: {
        name: customer?.emergencyContact?.name || "",
        relationship: customer?.emergencyContact?.relationship || "",
        phone: customer?.emergencyContact?.phone || "",
        email: customer?.emergencyContact?.email || "",
      },
    });
    setErrors({});
    setIsEditing(false);
  };

  // Placeholder function - replace with actual API call
  const updateCustomerProfile = async (
    data: typeof profileData,
    notifications: typeof notificationPreferences
  ) => {
    // TODO: API call to update customer profile
    // This should sync to all facilities automatically
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Account Settings</h1>
            <p className="text-muted-foreground mt-1">
              Manage your profile and preferences
            </p>
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
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Your personal information. Updates will reflect on the facility side automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) =>
                    setProfileData({ ...profileData, name: e.target.value })
                  }
                  disabled={!isEditing}
                  aria-invalid={errors.name ? "true" : "false"}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) =>
                      setProfileData({ ...profileData, email: e.target.value })
                    }
                    disabled={!isEditing}
                    className="pl-9"
                    aria-invalid={errors.email ? "true" : "false"}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) =>
                      setProfileData({ ...profileData, phone: e.target.value })
                    }
                    disabled={!isEditing}
                    className="pl-9"
                    placeholder="(555) 123-4567"
                    aria-invalid={errors.phone ? "true" : "false"}
                  />
                </div>
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Address */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <Label className="text-base font-semibold">Address</Label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="street">Street Address</Label>
                  <Input
                    id="street"
                    value={profileData.address.street}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        address: { ...profileData.address, street: e.target.value },
                      })
                    }
                    disabled={!isEditing}
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={profileData.address.city}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        address: { ...profileData.address, city: e.target.value },
                      })
                    }
                    disabled={!isEditing}
                    placeholder="Springfield"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={profileData.address.state}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        address: { ...profileData.address, state: e.target.value },
                      })
                    }
                    disabled={!isEditing}
                    placeholder="IL"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input
                    id="zip"
                    value={profileData.address.zip}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        address: { ...profileData.address, zip: e.target.value },
                      })
                    }
                    disabled={!isEditing}
                    placeholder="62701"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select
                    value={profileData.address.country}
                    onValueChange={(value) =>
                      setProfileData({
                        ...profileData,
                        address: { ...profileData.address, country: value },
                      })
                    }
                    disabled={!isEditing}
                  >
                    <SelectTrigger id="country">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USA">United States</SelectItem>
                      <SelectItem value="CAN">Canada</SelectItem>
                      <SelectItem value="MEX">Mexico</SelectItem>
                      <SelectItem value="GBR">United Kingdom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Emergency Contact */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-muted-foreground" />
                <Label className="text-base font-semibold">Emergency Contact</Label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergencyName">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="emergencyName"
                    value={profileData.emergencyContact.name}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        emergencyContact: {
                          ...profileData.emergencyContact,
                          name: e.target.value,
                        },
                      })
                    }
                    disabled={!isEditing}
                    aria-invalid={errors.emergencyContactName ? "true" : "false"}
                  />
                  {errors.emergencyContactName && (
                    <p className="text-sm text-destructive">
                      {errors.emergencyContactName}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyRelationship">Relationship</Label>
                  <Select
                    value={profileData.emergencyContact.relationship}
                    onValueChange={(value) =>
                      setProfileData({
                        ...profileData,
                        emergencyContact: {
                          ...profileData.emergencyContact,
                          relationship: value,
                        },
                      })
                    }
                    disabled={!isEditing}
                  >
                    <SelectTrigger id="emergencyRelationship">
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Spouse">Spouse</SelectItem>
                      <SelectItem value="Partner">Partner</SelectItem>
                      <SelectItem value="Parent">Parent</SelectItem>
                      <SelectItem value="Sibling">Sibling</SelectItem>
                      <SelectItem value="Friend">Friend</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyPhone">
                    Phone <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="emergencyPhone"
                      type="tel"
                      value={profileData.emergencyContact.phone}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          emergencyContact: {
                            ...profileData.emergencyContact,
                            phone: e.target.value,
                          },
                        })
                      }
                      disabled={!isEditing}
                      className="pl-9"
                      placeholder="(555) 123-4567"
                      aria-invalid={errors.emergencyContactPhone ? "true" : "false"}
                    />
                  </div>
                  {errors.emergencyContactPhone && (
                    <p className="text-sm text-destructive">
                      {errors.emergencyContactPhone}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyEmail">Email (Optional)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="emergencyEmail"
                      type="email"
                      value={profileData.emergencyContact.email}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          emergencyContact: {
                            ...profileData.emergencyContact,
                            email: e.target.value,
                          },
                        })
                      }
                      disabled={!isEditing}
                      className="pl-9"
                      placeholder="contact@example.com"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Choose how you want to receive notifications from the facility
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email Notifications */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Email Notifications</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-base">Booking Confirmations</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive emails when bookings are confirmed or updated
                    </p>
                  </div>
                  <Switch
                    checked={notificationPreferences.emailBookingConfirmations}
                    onCheckedChange={(checked) =>
                      setNotificationPreferences({
                        ...notificationPreferences,
                        emailBookingConfirmations: checked,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-base">Booking Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      24-hour reminder before appointments
                    </p>
                  </div>
                  <Switch
                    checked={notificationPreferences.emailBookingReminders}
                    onCheckedChange={(checked) =>
                      setNotificationPreferences({
                        ...notificationPreferences,
                        emailBookingReminders: checked,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-base">Check-In/Out Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify when your pet is checked in or out
                    </p>
                  </div>
                  <Switch
                    checked={notificationPreferences.emailCheckInOut}
                    onCheckedChange={(checked) =>
                      setNotificationPreferences({
                        ...notificationPreferences,
                        emailCheckInOut: checked,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-base">Report Cards</Label>
                    <p className="text-sm text-muted-foreground">
                      Daily updates and photos from the facility
                    </p>
                  </div>
                  <Switch
                    checked={notificationPreferences.emailReportCards}
                    onCheckedChange={(checked) =>
                      setNotificationPreferences({
                        ...notificationPreferences,
                        emailReportCards: checked,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-base">Payment Receipts</Label>
                    <p className="text-sm text-muted-foreground">
                      Email receipts after payments
                    </p>
                  </div>
                  <Switch
                    checked={notificationPreferences.emailPaymentReceipts}
                    onCheckedChange={(checked) =>
                      setNotificationPreferences({
                        ...notificationPreferences,
                        emailPaymentReceipts: checked,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-base">Marketing Emails</Label>
                    <p className="text-sm text-muted-foreground">
                      Promotions, special offers, and facility news
                    </p>
                  </div>
                  <Switch
                    checked={notificationPreferences.emailMarketing}
                    onCheckedChange={(checked) =>
                      setNotificationPreferences({
                        ...notificationPreferences,
                        emailMarketing: checked,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Per-Pet Report Card Preferences */}
            {customerPets.length > 0 && (
              <>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <UserCircle className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Per-Pet Report Cards</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Choose which pets should receive report cards and photo updates. This is
                    optional and can be different for each pet.
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {customerPets.map((pet) => (
                      <div
                        key={pet.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium flex items-center gap-2">
                            {pet.type === "Dog" ? "🐶" : pet.type === "Cat" ? "🐱" : "🐾"} {pet.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {pet.breed} • Report cards{" "}
                            {notificationPreferences.perPetReportCards[pet.id] ?? true
                              ? "enabled"
                              : "disabled"}
                          </p>
                        </div>
                        <Switch
                          checked={
                            notificationPreferences.perPetReportCards[pet.id] ?? true
                          }
                          onCheckedChange={(checked) =>
                            setNotificationPreferences({
                              ...notificationPreferences,
                              perPetReportCards: {
                                ...notificationPreferences.perPetReportCards,
                                [pet.id]: checked,
                              },
                            })
                          }
                          disabled={!isEditing}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />
              </>
            )}

            {/* SMS Notifications */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">SMS Notifications</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-base">Booking Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Text reminders before appointments
                    </p>
                  </div>
                  <Switch
                    checked={notificationPreferences.smsBookingReminders}
                    onCheckedChange={(checked) =>
                      setNotificationPreferences({
                        ...notificationPreferences,
                        smsBookingReminders: checked,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-base">Emergency Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Critical alerts and urgent notifications
                    </p>
                  </div>
                  <Switch
                    checked={notificationPreferences.smsEmergencyAlerts}
                    onCheckedChange={(checked) =>
                      setNotificationPreferences({
                        ...notificationPreferences,
                        smsEmergencyAlerts: checked,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-base">Marketing SMS</Label>
                    <p className="text-sm text-muted-foreground">
                      Occasional offers and updates by text. Standard message and data rates may apply.
                    </p>
                  </div>
                  <Switch
                    checked={notificationPreferences.smsMarketing}
                    onCheckedChange={(checked) =>
                      setNotificationPreferences({
                        ...notificationPreferences,
                        smsMarketing: checked,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-base">Check-In/Out</Label>
                    <p className="text-sm text-muted-foreground">
                      Text when your pet is checked in or out
                    </p>
                  </div>
                  <Switch
                    checked={notificationPreferences.smsCheckInOut}
                    onCheckedChange={(checked) =>
                      setNotificationPreferences({
                        ...notificationPreferences,
                        smsCheckInOut: checked,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Push Notifications */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Push Notifications</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-base">Booking Confirmations</Label>
                    <p className="text-sm text-muted-foreground">
                      Push notifications for booking updates
                    </p>
                  </div>
                  <Switch
                    checked={notificationPreferences.pushBookingConfirmations}
                    onCheckedChange={(checked) =>
                      setNotificationPreferences({
                        ...notificationPreferences,
                        pushBookingConfirmations: checked,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-base">Booking Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Push reminders before appointments
                    </p>
                  </div>
                  <Switch
                    checked={notificationPreferences.pushBookingReminders}
                    onCheckedChange={(checked) =>
                      setNotificationPreferences({
                        ...notificationPreferences,
                        pushBookingReminders: checked,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-base">Report Cards</Label>
                    <p className="text-sm text-muted-foreground">
                      Daily updates and photos
                    </p>
                  </div>
                  <Switch
                    checked={notificationPreferences.pushReportCards}
                    onCheckedChange={(checked) =>
                      setNotificationPreferences({
                        ...notificationPreferences,
                        pushReportCards: checked,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-base">Pet Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Real-time updates during your pet's stay
                    </p>
                  </div>
                  <Switch
                    checked={notificationPreferences.pushPetUpdates}
                    onCheckedChange={(checked) =>
                      setNotificationPreferences({
                        ...notificationPreferences,
                        pushPetUpdates: checked,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Quiet Hours & Language */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Quiet Hours */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Quiet Hours (SMS & Push)</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  During quiet hours, non‑urgent SMS and push notifications will be held and sent
                  after your quiet period ends. Emergency alerts may still be delivered.
                </p>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Enable Quiet Hours</Label>
                    <p className="text-xs text-muted-foreground">
                      Temporarily mute reminders and updates overnight.
                    </p>
                  </div>
                  <Switch
                    checked={notificationPreferences.quietHoursEnabled}
                    onCheckedChange={(checked) =>
                      setNotificationPreferences({
                        ...notificationPreferences,
                        quietHoursEnabled: checked,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>
                {notificationPreferences.quietHoursEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="quiet-start">Start Time</Label>
                      <Input
                        id="quiet-start"
                        type="time"
                        value={notificationPreferences.quietHoursStart}
                        onChange={(e) =>
                          setNotificationPreferences({
                            ...notificationPreferences,
                            quietHoursStart: e.target.value,
                          })
                        }
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="quiet-end">End Time</Label>
                      <Input
                        id="quiet-end"
                        type="time"
                        value={notificationPreferences.quietHoursEnd}
                        onChange={(e) =>
                          setNotificationPreferences({
                            ...notificationPreferences,
                            quietHoursEnd: e.target.value,
                          })
                        }
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Language Preference */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <UserCircle className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Language Preference</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Choose the language you prefer for emails, SMS (where supported), and in‑app
                  communications for facilities that support multiple languages.
                </p>
                <div className="space-y-2 max-w-xs">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={notificationPreferences.language}
                    onValueChange={(value) =>
                      setNotificationPreferences({
                        ...notificationPreferences,
                        language: value,
                      })
                    }
                    disabled={!isEditing}
                  >
                    <SelectTrigger id="language">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Banner */}
        {isEditing && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">
                    Changes sync automatically
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Any updates you make will automatically reflect on the facility side.
                    The facility staff will see your updated information immediately.
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
