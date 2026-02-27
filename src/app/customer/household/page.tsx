"use client";

import { useState, useMemo } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { clients } from "@/data/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { UserCircle, Save, Edit, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

type HouseholdContact = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  relationship?: string;
  canBook: boolean;
  canPay: boolean;
  canViewCameras: boolean;
};

export default function CustomerHouseholdPage() {
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
    emergencyContact: {
      name: customer?.emergencyContact?.name || "",
      relationship: customer?.emergencyContact?.relationship || "",
      phone: customer?.emergencyContact?.phone || "",
      email: customer?.emergencyContact?.email || "",
    },
  });

  const [householdContacts, setHouseholdContacts] = useState<HouseholdContact[]>(() => {
    const primary: HouseholdContact = {
      id: "primary",
      name: profileData.name,
      email: profileData.email,
      phone: profileData.phone,
      relationship: "Primary account holder",
      canBook: true,
      canPay: true,
      canViewCameras: true,
    };

    const secondaryFromEmergency = profileData.emergencyContact.name
      ? ({
          id: "secondary-1",
          name: profileData.emergencyContact.name,
          email: profileData.emergencyContact.email,
          phone: profileData.emergencyContact.phone,
          relationship: profileData.emergencyContact.relationship || "Secondary contact",
          canBook: true,
          canPay: false,
          canViewCameras: true,
        } as HouseholdContact)
      : undefined;

    return secondaryFromEmergency ? [primary, secondaryFromEmergency] : [primary];
  });

  const [newContact, setNewContact] = useState<HouseholdContact>({
    id: "",
    name: "",
    email: "",
    phone: "",
    relationship: "",
    canBook: true,
    canPay: false,
    canViewCameras: true,
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsEditing(false);
      toast.success("Household contacts updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update household contacts");
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
      emergencyContact: {
        name: customer?.emergencyContact?.name || "",
        relationship: customer?.emergencyContact?.relationship || "",
        phone: customer?.emergencyContact?.phone || "",
        email: customer?.emergencyContact?.email || "",
      },
    });
    setIsEditing(false);
  };

  const handleRemoveContact = (contactId: string) => {
    if (contactId === "primary") {
      toast.error("Cannot remove the primary account holder");
      return;
    }
    setHouseholdContacts((prev) => prev.filter((c) => c.id !== contactId));
    toast.success("Contact removed");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Household & Contacts</h1>
            <p className="text-muted-foreground mt-1">
              Manage who in your household can book, pay, and view cameras for your pets
            </p>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Contacts
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

        {/* Household & Contacts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              Household & Contacts
            </CardTitle>
            <CardDescription>
              Manage who in your household can book, pay, and view cameras for your pets.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Many families share responsibilities. Add secondary contacts (spouse, partner,
              roommate) and choose what each person is allowed to do.
            </div>

            {/* Existing Contacts */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">People on this account</div>
              <div className="space-y-2">
                {householdContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center p-3 rounded-lg border bg-background/60"
                  >
                    <div className="space-y-0.5 md:col-span-2">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{contact.name}</p>
                        {contact.id === "primary" && (
                          <Badge className="text-xs" variant="default">
                            Primary
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {contact.relationship || "Household member"}
                      </p>
                      {(contact.email || contact.phone) && (
                        <p className="text-xs text-muted-foreground">
                          {contact.email && <span>{contact.email}</span>}
                          {contact.email && contact.phone && <span> · </span>}
                          {contact.phone && <span>{contact.phone}</span>}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Switch
                        checked={contact.canBook}
                        onCheckedChange={(checked) =>
                          setHouseholdContacts((prev) =>
                            prev.map((c) =>
                              c.id === contact.id ? { ...c, canBook: checked } : c,
                            ),
                          )
                        }
                        disabled={!isEditing || contact.id === "primary"}
                      />
                      <span>Can book</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Switch
                        checked={contact.canPay}
                        onCheckedChange={(checked) =>
                          setHouseholdContacts((prev) =>
                            prev.map((c) =>
                              c.id === contact.id ? { ...c, canPay: checked } : c,
                            ),
                          )
                        }
                        disabled={!isEditing || contact.id === "primary"}
                      />
                      <span>Can pay</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Switch
                        checked={contact.canViewCameras}
                        onCheckedChange={(checked) =>
                          setHouseholdContacts((prev) =>
                            prev.map((c) =>
                              c.id === contact.id ? { ...c, canViewCameras: checked } : c,
                            ),
                          )
                        }
                        disabled={!isEditing}
                      />
                      <span>Can view cameras</span>
                    </div>
                    {contact.id !== "primary" && isEditing && (
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveContact(contact.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Add Secondary Contact */}
            <div className="pt-2 border-t space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Add Secondary Contact</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="hh-name">Name</Label>
                  <Input
                    id="hh-name"
                    value={newContact.name}
                    onChange={(e) =>
                      setNewContact((prev) => ({ ...prev, name: e.target.value }))
                    }
                    disabled={!isEditing}
                    placeholder="Spouse / Partner"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="hh-email">Email</Label>
                  <Input
                    id="hh-email"
                    type="email"
                    value={newContact.email}
                    onChange={(e) =>
                      setNewContact((prev) => ({ ...prev, email: e.target.value }))
                    }
                    disabled={!isEditing}
                    placeholder="contact@example.com"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="hh-phone">Phone</Label>
                  <Input
                    id="hh-phone"
                    value={newContact.phone}
                    onChange={(e) =>
                      setNewContact((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    disabled={!isEditing}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="hh-relationship">Relationship</Label>
                  <Input
                    id="hh-relationship"
                    value={newContact.relationship}
                    onChange={(e) =>
                      setNewContact((prev) => ({
                        ...prev,
                        relationship: e.target.value,
                      }))
                    }
                    disabled={!isEditing}
                    placeholder="Spouse, Partner, etc."
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newContact.canBook}
                    onCheckedChange={(checked) =>
                      setNewContact((prev) => ({ ...prev, canBook: checked }))
                    }
                    disabled={!isEditing}
                  />
                  <span>Can book</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newContact.canPay}
                    onCheckedChange={(checked) =>
                      setNewContact((prev) => ({ ...prev, canPay: checked }))
                    }
                    disabled={!isEditing}
                  />
                  <span>Can pay</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newContact.canViewCameras}
                    onCheckedChange={(checked) =>
                      setNewContact((prev) => ({ ...prev, canViewCameras: checked }))
                    }
                    disabled={!isEditing}
                  />
                  <span>Can view cameras</span>
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                className="mt-1"
                disabled={!isEditing || !newContact.name.trim()}
                onClick={() => {
                  setHouseholdContacts((prev) => [
                    ...prev,
                    {
                      ...newContact,
                      id: `secondary-${prev.length}`,
                    },
                  ]);
                  setNewContact({
                    id: "",
                    name: "",
                    email: "",
                    phone: "",
                    relationship: "",
                    canBook: true,
                    canPay: false,
                    canViewCameras: true,
                  });
                  toast.success("Contact added");
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
