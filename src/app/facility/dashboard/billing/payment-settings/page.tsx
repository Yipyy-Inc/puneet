"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Save, RotateCcw, CreditCard, Settings, AlertCircle, Banknote } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FiservPaymentConfig,
  getFiservConfig,
  mockFiservConfigs,
  getCloverTerminalsByFacility,
  getCloverTerminal,
  getYipyyPayConfig,
  getYipyyPayDevicesByFacility,
  getYipyyPayDevice,
  type CloverTerminalConfig,
  type YipyyPayDevice,
} from "@/data/fiserv-payments";
import { Printer, Wifi, EthernetPort, Bluetooth, Smartphone, CheckCircle2, Info } from "lucide-react";
import { locations } from "@/data/settings";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function PaymentSettingsPage() {
  const facilityId = 11; // TODO: Get from auth context

  const [config, setConfig] = useState<FiservPaymentConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const existingConfig = getFiservConfig(facilityId);
    if (existingConfig) {
      setConfig(existingConfig);
    } else {
      // Create default config
      const defaultConfig: FiservPaymentConfig = {
        facilityId,
        apiKey: "",
        merchantId: "",
        environment: "sandbox",
        enabledPaymentMethods: {
          card: true,
          cardOnFile: true,
          autoPay: true,
          cash: true,
          giftCard: true,
          storeCredit: true,
          bankTransfer: false,
        },
        autoPaySettings: {
          enabled: true,
          requireConsent: true,
          defaultToAutoPay: false,
          allowedServices: ["grooming", "membership", "package"],
        },
        cardOnFileSettings: {
          enabled: true,
          requireCvv: false,
          allowMultipleCards: true,
          defaultCardBehavior: "use_default",
        },
        processingSettings: {
          allowPartialPayments: true,
          allowSplitPayments: true,
          requireTip: false,
          tipOptions: [15, 18, 20, 25],
          captureMethod: "automatic",
          refundPolicy: "full_refund",
          splitPaymentRefundPolicy: "last_payment_first",
        },
        integrationSettings: {
          posEnabled: true,
          onlineEnabled: true,
          invoiceEnabled: true,
          membershipEnabled: true,
          recurringGroomingEnabled: true,
        },
        cloverTerminal: {
          enabled: false,
          autoPrintReceipts: true,
          defaultPaymentMethod: "terminal",
        },
        yipyyPay: {
          enabled: false,
          requireReceipt: true,
          autoSendReceipt: true,
        },
        inPersonMethods: {
          cloverTerminal: true,
          payWithiPhone: true,
          manualCardEntry: false,
          cash: true,
          storeCredit: true,
          giftCard: true,
          iphoneSettings: {
            enabledLocations: locations.map((loc) => loc.id),
            restrictedRoles: [],
            deviceRequirements: {
              minIOSVersion: "16.0",
              supportedModels: [
                "iPhone XS",
                "iPhone XS Max",
                "iPhone XR",
                "iPhone 11",
                "iPhone 11 Pro",
                "iPhone 11 Pro Max",
                "iPhone 12",
                "iPhone 12 mini",
                "iPhone 12 Pro",
                "iPhone 12 Pro Max",
                "iPhone 13",
                "iPhone 13 mini",
                "iPhone 13 Pro",
                "iPhone 13 Pro Max",
                "iPhone 14",
                "iPhone 14 Plus",
                "iPhone 14 Pro",
                "iPhone 14 Pro Max",
                "iPhone 15",
                "iPhone 15 Plus",
                "iPhone 15 Pro",
                "iPhone 15 Pro Max",
                "iPhone 16",
                "iPhone 16 Plus",
                "iPhone 16 Pro",
                "iPhone 16 Pro Max",
              ],
            },
          },
          manualCardEntrySettings: {
            adminOnly: true,
            requireCvv: true,
            requireZipCode: true,
          },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setConfig(defaultConfig);
    }
  }, [facilityId]);

  const cloverTerminals = getCloverTerminalsByFacility(facilityId);
  const yipyyPayConfig = getYipyyPayConfig(facilityId);
  const yipyyPayDevices = getYipyyPayDevicesByFacility(facilityId);
  const facilityLocations = locations.filter((loc) => loc.isActive);

  const handleSave = async () => {
    if (!config) return;

    setIsSaving(true);
    try {
      // TODO: Save to backend
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Update local mock data
      const index = mockFiservConfigs.findIndex((c) => c.facilityId === facilityId);
      if (index >= 0) {
        mockFiservConfigs[index] = {
          ...config,
          updatedAt: new Date().toISOString(),
        };
      } else {
        mockFiservConfigs.push({
          ...config,
          updatedAt: new Date().toISOString(),
        });
      }

      setIsEditing(false);
      setHasChanges(false);
      // TODO: Show success toast
    } catch (error) {
      console.error("Failed to save payment settings:", error);
      // TODO: Show error toast
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const existingConfig = getFiservConfig(facilityId);
    if (existingConfig) {
      setConfig(existingConfig);
    }
    setIsEditing(false);
    setHasChanges(false);
  };

  const updateConfig = (updates: Partial<FiservPaymentConfig>) => {
    if (!config) return;
    setConfig({ ...config, ...updates });
    setHasChanges(true);
  };

  if (!config) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Payment Settings</h2>
          <p className="text-muted-foreground">
            Configure Fiserv payment processing and payment methods
          </p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleReset} disabled={isSaving}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Edit Settings
            </Button>
          )}
        </div>
      </div>

      {/* Connection Status */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {config.apiKey && config.merchantId ? (
            <div className="flex items-center gap-2">
              <Badge variant={config.environment === "production" ? "default" : "secondary"}>
                {config.environment === "production" ? "Production" : "Sandbox"}
              </Badge>
              <span>Fiserv payment processing is configured</span>
            </div>
          ) : (
            <span>Please configure Fiserv API credentials to enable payment processing</span>
          )}
        </AlertDescription>
      </Alert>

      {/* Fiserv API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Fiserv API Configuration
          </CardTitle>
          <CardDescription>
            Configure your Fiserv merchant account credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="environment">Environment</Label>
              <Select
                value={config.environment}
                onValueChange={(value: "sandbox" | "production") =>
                  updateConfig({ environment: value })
                }
                disabled={!isEditing}
              >
                <SelectTrigger id="environment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="merchantId">Merchant ID</Label>
              <Input
                id="merchantId"
                type="text"
                value={config.merchantId}
                onChange={(e) => updateConfig({ merchantId: e.target.value })}
                disabled={!isEditing}
                placeholder="Enter your Fiserv Merchant ID"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={config.apiKey}
              onChange={(e) => updateConfig({ apiKey: e.target.value })}
              disabled={!isEditing}
              placeholder="Enter your Fiserv API Key"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="terminalId">Terminal ID (Optional)</Label>
            <Input
              id="terminalId"
              type="text"
              value={config.terminalId || ""}
              onChange={(e) => updateConfig({ terminalId: e.target.value })}
              disabled={!isEditing}
              placeholder="Enter Terminal ID if applicable"
            />
          </div>
        </CardContent>
      </Card>

      {/* In-Person Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>In-Person Payment Methods</CardTitle>
          <CardDescription>
            Configure payment methods available for in-person transactions at your facility
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {/* Clover Terminal */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  Clover Terminal (Fiserv)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Physical terminal for Tap/Chip/Swipe payments
                </p>
              </div>
              <Switch
                checked={config.inPersonMethods?.cloverTerminal ?? false}
                onCheckedChange={(checked) =>
                  updateConfig({
                    inPersonMethods: {
                      cloverTerminal: checked,
                      payWithiPhone: config.inPersonMethods?.payWithiPhone ?? false,
                      manualCardEntry: config.inPersonMethods?.manualCardEntry ?? false,
                      cash: config.inPersonMethods?.cash ?? true,
                      storeCredit: config.inPersonMethods?.storeCredit ?? true,
                      giftCard: config.inPersonMethods?.giftCard ?? true,
                      iphoneSettings: config.inPersonMethods?.iphoneSettings,
                      manualCardEntrySettings: config.inPersonMethods?.manualCardEntrySettings,
                    },
                  })
                }
                disabled={!isEditing}
              />
            </div>

            {/* Pay with iPhone */}
            <div className="p-3 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Pay with iPhone (Tap to Pay)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Contactless payments directly on iPhone - no terminal needed
                  </p>
                </div>
                <Switch
                  checked={config.inPersonMethods?.payWithiPhone ?? false}
                  onCheckedChange={(checked) =>
                    updateConfig({
                      inPersonMethods: {
                        cloverTerminal: config.inPersonMethods?.cloverTerminal ?? false,
                        payWithiPhone: checked,
                        manualCardEntry: config.inPersonMethods?.manualCardEntry ?? false,
                        cash: config.inPersonMethods?.cash ?? true,
                        storeCredit: config.inPersonMethods?.storeCredit ?? true,
                        giftCard: config.inPersonMethods?.giftCard ?? true,
                        iphoneSettings: checked
                          ? config.inPersonMethods?.iphoneSettings || {
                              enabledLocations: facilityLocations.map((loc) => loc.id),
                              restrictedRoles: [],
                              deviceRequirements: {
                                minIOSVersion: "16.0",
                                supportedModels: [],
                              },
                            }
                          : config.inPersonMethods?.iphoneSettings,
                        manualCardEntrySettings: config.inPersonMethods?.manualCardEntrySettings,
                      },
                    })
                  }
                  disabled={!isEditing}
                />
              </div>

              {/* iPhone Settings (collapsible) */}
              {config.inPersonMethods?.payWithiPhone && (
                <Collapsible defaultOpen={false}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between">
                      <span className="text-sm">iPhone Setup & Configuration</span>
                      <Settings className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-3">
                    {/* Device Requirements */}
                    <div className="p-3 bg-muted rounded-lg space-y-2">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                        <div className="flex-1 space-y-2">
                          <Label className="text-sm font-semibold">Device Eligibility Requirements</Label>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p><strong>Minimum iOS Version:</strong> {config.inPersonMethods?.iphoneSettings?.deviceRequirements.minIOSVersion || "16.0"}</p>
                            <p><strong>Supported iPhone Models:</strong></p>
                            <ul className="list-disc list-inside ml-2 space-y-1">
                              <li>iPhone XS and newer</li>
                              <li>Requires NFC capability</li>
                              <li>Must have iOS {config.inPersonMethods?.iphoneSettings?.deviceRequirements.minIOSVersion || "16.0"} or later</li>
                            </ul>
                            <p className="mt-2 text-blue-600">
                              <strong>Note:</strong> Tap to Pay requires iPhone XS or newer with iOS 16.0+. 
                              The device must be authorized in Yipyy Pay settings.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enable per Location */}
                    <div className="space-y-2">
                      <Label>Enable for Locations</Label>
                      <p className="text-xs text-muted-foreground">
                        Select which locations can accept iPhone payments
                      </p>
                      <div className="space-y-2">
                        {facilityLocations.map((location) => (
                          <div key={location.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`iphone-loc-${location.id}`}
                              checked={
                                config.inPersonMethods?.iphoneSettings?.enabledLocations.includes(
                                  location.id
                                ) ?? false
                              }
                              onCheckedChange={(checked) => {
                                const currentLocations =
                                  config.inPersonMethods?.iphoneSettings?.enabledLocations || [];
                                const newLocations = checked
                                  ? [...currentLocations, location.id]
                                  : currentLocations.filter((id) => id !== location.id);
                                updateConfig({
                                  inPersonMethods: {
                                    cloverTerminal: config.inPersonMethods?.cloverTerminal ?? false,
                                    payWithiPhone: config.inPersonMethods?.payWithiPhone ?? false,
                                    manualCardEntry: config.inPersonMethods?.manualCardEntry ?? false,
                                    cash: config.inPersonMethods?.cash ?? true,
                                    storeCredit: config.inPersonMethods?.storeCredit ?? true,
                                    giftCard: config.inPersonMethods?.giftCard ?? true,
                                    iphoneSettings: {
                                      ...config.inPersonMethods?.iphoneSettings,
                                      enabledLocations: newLocations,
                                      restrictedRoles:
                                        config.inPersonMethods?.iphoneSettings?.restrictedRoles || [],
                                      deviceRequirements:
                                        config.inPersonMethods?.iphoneSettings?.deviceRequirements || {
                                          minIOSVersion: "16.0",
                                          supportedModels: [],
                                        },
                                    },
                                  },
                                });
                              }}
                              disabled={!isEditing}
                            />
                            <Label
                              htmlFor={`iphone-loc-${location.id}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {location.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Role Restrictions */}
                    <div className="space-y-2">
                      <Label>Restrict to Roles (Optional)</Label>
                      <p className="text-xs text-muted-foreground">
                        Leave empty to allow all roles. Select specific roles to restrict access.
                      </p>
                      <div className="space-y-2">
                        {["Admin", "Manager", "Front Desk", "Staff"].map((role) => (
                          <div key={role} className="flex items-center space-x-2">
                            <Checkbox
                              id={`iphone-role-${role}`}
                              checked={
                                config.inPersonMethods?.iphoneSettings?.restrictedRoles?.includes(
                                  role
                                ) ?? false
                              }
                              onCheckedChange={(checked) => {
                                const currentRoles =
                                  config.inPersonMethods?.iphoneSettings?.restrictedRoles || [];
                                const newRoles = checked
                                  ? [...currentRoles, role]
                                  : currentRoles.filter((r) => r !== role);
                                updateConfig({
                                  inPersonMethods: {
                                    cloverTerminal: config.inPersonMethods?.cloverTerminal ?? false,
                                    payWithiPhone: config.inPersonMethods?.payWithiPhone ?? false,
                                    manualCardEntry: config.inPersonMethods?.manualCardEntry ?? false,
                                    cash: config.inPersonMethods?.cash ?? true,
                                    storeCredit: config.inPersonMethods?.storeCredit ?? true,
                                    giftCard: config.inPersonMethods?.giftCard ?? true,
                                    iphoneSettings: {
                                      ...config.inPersonMethods?.iphoneSettings,
                                      restrictedRoles: newRoles,
                                      enabledLocations:
                                        config.inPersonMethods?.iphoneSettings?.enabledLocations || [],
                                      deviceRequirements:
                                        config.inPersonMethods?.iphoneSettings?.deviceRequirements || {
                                          minIOSVersion: "16.0",
                                          supportedModels: [],
                                        },
                                    },
                                  },
                                });
                              }}
                              disabled={!isEditing}
                            />
                            <Label
                              htmlFor={`iphone-role-${role}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {role}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {(!config.inPersonMethods?.iphoneSettings?.restrictedRoles ||
                        config.inPersonMethods.iphoneSettings.restrictedRoles.length === 0) && (
                        <p className="text-xs text-muted-foreground italic">
                          All roles can use iPhone payments
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>

            {/* Manual Card Entry */}
            <div className="p-3 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Manual Card Entry
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Enter card details manually (optional / admin-only)
                  </p>
                </div>
                <Switch
                  checked={config.inPersonMethods?.manualCardEntry ?? false}
                  onCheckedChange={(checked) =>
                    updateConfig({
                      inPersonMethods: {
                        cloverTerminal: config.inPersonMethods?.cloverTerminal ?? false,
                        payWithiPhone: config.inPersonMethods?.payWithiPhone ?? false,
                        manualCardEntry: checked,
                        cash: config.inPersonMethods?.cash ?? true,
                        storeCredit: config.inPersonMethods?.storeCredit ?? true,
                        giftCard: config.inPersonMethods?.giftCard ?? true,
                        iphoneSettings: config.inPersonMethods?.iphoneSettings,
                        manualCardEntrySettings: checked
                          ? config.inPersonMethods?.manualCardEntrySettings || {
                              adminOnly: true,
                              requireCvv: true,
                              requireZipCode: true,
                            }
                          : config.inPersonMethods?.manualCardEntrySettings,
                      },
                    })
                  }
                  disabled={!isEditing}
                />
              </div>

              {/* Manual Card Entry Settings */}
              {config.inPersonMethods?.manualCardEntry && (
                <Collapsible defaultOpen={false}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between">
                      <span className="text-sm">Manual Entry Settings</span>
                      <Settings className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Admin Only</Label>
                        <p className="text-xs text-muted-foreground">
                          Restrict manual card entry to admin users only
                        </p>
                      </div>
                      <Switch
                        checked={config.inPersonMethods?.manualCardEntrySettings?.adminOnly ?? true}
                        onCheckedChange={(checked) =>
                          updateConfig({
                            inPersonMethods: {
                              cloverTerminal: config.inPersonMethods?.cloverTerminal ?? false,
                              payWithiPhone: config.inPersonMethods?.payWithiPhone ?? false,
                              manualCardEntry: config.inPersonMethods?.manualCardEntry ?? false,
                              cash: config.inPersonMethods?.cash ?? true,
                              storeCredit: config.inPersonMethods?.storeCredit ?? true,
                              giftCard: config.inPersonMethods?.giftCard ?? true,
                              iphoneSettings: config.inPersonMethods?.iphoneSettings,
                              manualCardEntrySettings: {
                                ...config.inPersonMethods?.manualCardEntrySettings,
                                adminOnly: checked,
                                requireCvv:
                                  config.inPersonMethods?.manualCardEntrySettings?.requireCvv ?? true,
                                requireZipCode:
                                  config.inPersonMethods?.manualCardEntrySettings?.requireZipCode ??
                                  true,
                              },
                            },
                          })
                        }
                        disabled={!isEditing}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Require CVV</Label>
                        <p className="text-xs text-muted-foreground">
                          Require CVV code for manual card entry
                        </p>
                      </div>
                      <Switch
                        checked={config.inPersonMethods?.manualCardEntrySettings?.requireCvv ?? true}
                        onCheckedChange={(checked) =>
                          updateConfig({
                            inPersonMethods: {
                              cloverTerminal: config.inPersonMethods?.cloverTerminal ?? false,
                              payWithiPhone: config.inPersonMethods?.payWithiPhone ?? false,
                              manualCardEntry: config.inPersonMethods?.manualCardEntry ?? false,
                              cash: config.inPersonMethods?.cash ?? true,
                              storeCredit: config.inPersonMethods?.storeCredit ?? true,
                              giftCard: config.inPersonMethods?.giftCard ?? true,
                              iphoneSettings: config.inPersonMethods?.iphoneSettings,
                              manualCardEntrySettings: {
                                ...config.inPersonMethods?.manualCardEntrySettings,
                                requireCvv: checked,
                                adminOnly:
                                  config.inPersonMethods?.manualCardEntrySettings?.adminOnly ?? true,
                                requireZipCode:
                                  config.inPersonMethods?.manualCardEntrySettings?.requireZipCode ??
                                  true,
                              },
                            },
                          })
                        }
                        disabled={!isEditing}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Require ZIP Code</Label>
                        <p className="text-xs text-muted-foreground">
                          Require billing ZIP code for manual card entry
                        </p>
                      </div>
                      <Switch
                        checked={
                          config.inPersonMethods?.manualCardEntrySettings?.requireZipCode ?? true
                        }
                        onCheckedChange={(checked) =>
                          updateConfig({
                            inPersonMethods: {
                              cloverTerminal: config.inPersonMethods?.cloverTerminal ?? false,
                              payWithiPhone: config.inPersonMethods?.payWithiPhone ?? false,
                              manualCardEntry: config.inPersonMethods?.manualCardEntry ?? false,
                              cash: config.inPersonMethods?.cash ?? true,
                              storeCredit: config.inPersonMethods?.storeCredit ?? true,
                              giftCard: config.inPersonMethods?.giftCard ?? true,
                              iphoneSettings: config.inPersonMethods?.iphoneSettings,
                              manualCardEntrySettings: {
                                ...config.inPersonMethods?.manualCardEntrySettings,
                                requireZipCode: checked,
                                adminOnly:
                                  config.inPersonMethods?.manualCardEntrySettings?.adminOnly ?? true,
                                requireCvv:
                                  config.inPersonMethods?.manualCardEntrySettings?.requireCvv ?? true,
                              },
                            },
                          })
                        }
                        disabled={!isEditing}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>

            <Separator />

            {/* Cash */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  Cash
                </Label>
                <p className="text-sm text-muted-foreground">
                  Accept cash payments at POS
                </p>
              </div>
              <Switch
                checked={config.inPersonMethods?.cash ?? true}
                onCheckedChange={(checked) =>
                  updateConfig({
                    inPersonMethods: {
                      cloverTerminal: config.inPersonMethods?.cloverTerminal ?? false,
                      payWithiPhone: config.inPersonMethods?.payWithiPhone ?? false,
                      manualCardEntry: config.inPersonMethods?.manualCardEntry ?? false,
                      cash: checked,
                      storeCredit: config.inPersonMethods?.storeCredit ?? true,
                      giftCard: config.inPersonMethods?.giftCard ?? true,
                      iphoneSettings: config.inPersonMethods?.iphoneSettings,
                      manualCardEntrySettings: config.inPersonMethods?.manualCardEntrySettings,
                    },
                  })
                }
                disabled={!isEditing}
              />
            </div>

            {/* Store Credit */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Store Credit
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow customers to use store credit
                </p>
              </div>
              <Switch
                checked={config.inPersonMethods?.storeCredit ?? true}
                onCheckedChange={(checked) =>
                  updateConfig({
                    inPersonMethods: {
                      cloverTerminal: config.inPersonMethods?.cloverTerminal ?? false,
                      payWithiPhone: config.inPersonMethods?.payWithiPhone ?? false,
                      manualCardEntry: config.inPersonMethods?.manualCardEntry ?? false,
                      cash: config.inPersonMethods?.cash ?? true,
                      storeCredit: checked,
                      giftCard: config.inPersonMethods?.giftCard ?? true,
                      iphoneSettings: config.inPersonMethods?.iphoneSettings,
                      manualCardEntrySettings: config.inPersonMethods?.manualCardEntrySettings,
                    },
                  })
                }
                disabled={!isEditing}
              />
            </div>

            {/* Gift Card */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Gift Card
                </Label>
                <p className="text-sm text-muted-foreground">
                  Accept gift card payments
                </p>
              </div>
              <Switch
                checked={config.inPersonMethods?.giftCard ?? true}
                onCheckedChange={(checked) =>
                  updateConfig({
                    inPersonMethods: {
                      cloverTerminal: config.inPersonMethods?.cloverTerminal ?? false,
                      payWithiPhone: config.inPersonMethods?.payWithiPhone ?? false,
                      manualCardEntry: config.inPersonMethods?.manualCardEntry ?? false,
                      cash: config.inPersonMethods?.cash ?? true,
                      storeCredit: config.inPersonMethods?.storeCredit ?? true,
                      giftCard: checked,
                      iphoneSettings: config.inPersonMethods?.iphoneSettings,
                      manualCardEntrySettings: config.inPersonMethods?.manualCardEntrySettings,
                    },
                  })
                }
                disabled={!isEditing}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Enabled Payment Methods</CardTitle>
          <CardDescription>
            Select which payment methods are available for your facility
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Credit/Debit Cards</Label>
                <p className="text-sm text-muted-foreground">
                  Process card payments through Fiserv
                </p>
              </div>
              <Switch
                checked={config.enabledPaymentMethods.card}
                onCheckedChange={(checked) =>
                  updateConfig({
                    enabledPaymentMethods: {
                      ...config.enabledPaymentMethods,
                      card: checked,
                    },
                  })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Card on File</Label>
                <p className="text-sm text-muted-foreground">
                  Allow customers to save cards for future payments
                </p>
              </div>
              <Switch
                checked={config.enabledPaymentMethods.cardOnFile}
                onCheckedChange={(checked) =>
                  updateConfig({
                    enabledPaymentMethods: {
                      ...config.enabledPaymentMethods,
                      cardOnFile: checked,
                    },
                  })
                }
                disabled={!isEditing || !config.enabledPaymentMethods.card}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Pay</Label>
                <p className="text-sm text-muted-foreground">
                  Enable automatic payments for recurring services
                </p>
              </div>
              <Switch
                checked={config.enabledPaymentMethods.autoPay}
                onCheckedChange={(checked) =>
                  updateConfig({
                    enabledPaymentMethods: {
                      ...config.enabledPaymentMethods,
                      autoPay: checked,
                    },
                  })
                }
                disabled={!isEditing || !config.enabledPaymentMethods.cardOnFile}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Cash</Label>
                <p className="text-sm text-muted-foreground">
                  Accept cash payments at POS
                </p>
              </div>
              <Switch
                checked={config.enabledPaymentMethods.cash}
                onCheckedChange={(checked) =>
                  updateConfig({
                    enabledPaymentMethods: {
                      ...config.enabledPaymentMethods,
                      cash: checked,
                    },
                  })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Gift Cards</Label>
                <p className="text-sm text-muted-foreground">
                  Accept gift card payments
                </p>
              </div>
              <Switch
                checked={config.enabledPaymentMethods.giftCard}
                onCheckedChange={(checked) =>
                  updateConfig({
                    enabledPaymentMethods: {
                      ...config.enabledPaymentMethods,
                      giftCard: checked,
                    },
                  })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Store Credit</Label>
                <p className="text-sm text-muted-foreground">
                  Allow customers to use store credit
                </p>
              </div>
              <Switch
                checked={config.enabledPaymentMethods.storeCredit}
                onCheckedChange={(checked) =>
                  updateConfig({
                    enabledPaymentMethods: {
                      ...config.enabledPaymentMethods,
                      storeCredit: checked,
                    },
                  })
                }
                disabled={!isEditing}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Pay Settings */}
      {config.enabledPaymentMethods.autoPay && (
        <Card>
          <CardHeader>
            <CardTitle>Auto-Pay Settings</CardTitle>
            <CardDescription>
              Configure automatic payment preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Auto-Pay</Label>
                <p className="text-sm text-muted-foreground">
                  Allow automatic charging for recurring services
                </p>
              </div>
              <Switch
                checked={config.autoPaySettings.enabled}
                onCheckedChange={(checked) =>
                  updateConfig({
                    autoPaySettings: {
                      ...config.autoPaySettings,
                      enabled: checked,
                    },
                  })
                }
                disabled={!isEditing}
              />
            </div>
            {config.autoPaySettings.enabled && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Customer Consent</Label>
                    <p className="text-sm text-muted-foreground">
                      Customers must explicitly opt-in to auto-pay
                    </p>
                  </div>
                  <Switch
                    checked={config.autoPaySettings.requireConsent}
                    onCheckedChange={(checked) =>
                      updateConfig({
                        autoPaySettings: {
                          ...config.autoPaySettings,
                          requireConsent: checked,
                        },
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Default to Auto-Pay</Label>
                    <p className="text-sm text-muted-foreground">
                      Pre-select auto-pay option for new bookings
                    </p>
                  </div>
                  <Switch
                    checked={config.autoPaySettings.defaultToAutoPay}
                    onCheckedChange={(checked) =>
                      updateConfig({
                        autoPaySettings: {
                          ...config.autoPaySettings,
                          defaultToAutoPay: checked,
                        },
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Allowed Services for Auto-Pay</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      "grooming",
                      "membership",
                      "package",
                      "boarding",
                      "daycare",
                      "training",
                    ].map((service) => (
                      <div key={service} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`autopay-${service}`}
                          checked={config.autoPaySettings.allowedServices.includes(
                            service as any
                          )}
                          onChange={(e) => {
                            const allowedServices = e.target.checked
                              ? [...config.autoPaySettings.allowedServices, service as any]
                              : config.autoPaySettings.allowedServices.filter(
                                  (s) => s !== service
                                );
                            updateConfig({
                              autoPaySettings: {
                                ...config.autoPaySettings,
                                allowedServices,
                              },
                            });
                          }}
                          disabled={!isEditing}
                          className="rounded border-gray-300"
                        />
                        <Label
                          htmlFor={`autopay-${service}`}
                          className="text-sm font-normal capitalize"
                        >
                          {service}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Card on File Settings */}
      {config.enabledPaymentMethods.cardOnFile && (
        <Card>
          <CardHeader>
            <CardTitle>Card on File Settings</CardTitle>
            <CardDescription>
              Configure how saved cards are managed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require CVV for Saved Cards</Label>
                <p className="text-sm text-muted-foreground">
                  Ask for CVV when using saved cards
                </p>
              </div>
              <Switch
                checked={config.cardOnFileSettings.requireCvv}
                onCheckedChange={(checked) =>
                  updateConfig({
                    cardOnFileSettings: {
                      ...config.cardOnFileSettings,
                      requireCvv: checked,
                    },
                  })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Multiple Cards</Label>
                <p className="text-sm text-muted-foreground">
                  Customers can save multiple payment methods
                </p>
              </div>
              <Switch
                checked={config.cardOnFileSettings.allowMultipleCards}
                onCheckedChange={(checked) =>
                  updateConfig({
                    cardOnFileSettings: {
                      ...config.cardOnFileSettings,
                      allowMultipleCards: checked,
                    },
                  })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Default Card Behavior</Label>
              <Select
                value={config.cardOnFileSettings.defaultCardBehavior}
                onValueChange={(value: "use_default" | "prompt_selection" | "require_selection") =>
                  updateConfig({
                    cardOnFileSettings: {
                      ...config.cardOnFileSettings,
                      defaultCardBehavior: value,
                    },
                  })
                }
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="use_default">
                    Use Default Card Automatically
                  </SelectItem>
                  <SelectItem value="prompt_selection">
                    Prompt for Card Selection
                  </SelectItem>
                  <SelectItem value="require_selection">
                    Require Card Selection
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Integration Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Settings</CardTitle>
          <CardDescription>
            Enable Fiserv payments for different modules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>POS Checkout</Label>
                <p className="text-sm text-muted-foreground">
                  Process payments at point of sale
                </p>
              </div>
              <Switch
                checked={config.integrationSettings.posEnabled}
                onCheckedChange={(checked) =>
                  updateConfig({
                    integrationSettings: {
                      ...config.integrationSettings,
                      posEnabled: checked,
                    },
                  })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Online Payments</Label>
                <p className="text-sm text-muted-foreground">
                  Process payments from customer portal
                </p>
              </div>
              <Switch
                checked={config.integrationSettings.onlineEnabled}
                onCheckedChange={(checked) =>
                  updateConfig({
                    integrationSettings: {
                      ...config.integrationSettings,
                      onlineEnabled: checked,
                    },
                  })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Booking Invoices</Label>
                <p className="text-sm text-muted-foreground">
                  Charge invoices through Fiserv
                </p>
              </div>
              <Switch
                checked={config.integrationSettings.invoiceEnabled}
                onCheckedChange={(checked) =>
                  updateConfig({
                    integrationSettings: {
                      ...config.integrationSettings,
                      invoiceEnabled: checked,
                    },
                  })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Memberships/Packages</Label>
                <p className="text-sm text-muted-foreground">
                  Process membership and package payments
                </p>
              </div>
              <Switch
                checked={config.integrationSettings.membershipEnabled}
                onCheckedChange={(checked) =>
                  updateConfig({
                    integrationSettings: {
                      ...config.integrationSettings,
                      membershipEnabled: checked,
                    },
                  })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Recurring Grooming Auto-Pay</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically charge recurring grooming appointments
                </p>
              </div>
              <Switch
                checked={config.integrationSettings.recurringGroomingEnabled}
                onCheckedChange={(checked) =>
                  updateConfig({
                    integrationSettings: {
                      ...config.integrationSettings,
                      recurringGroomingEnabled: checked,
                    },
                  })
                }
                disabled={!isEditing}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Settings</CardTitle>
          <CardDescription>
            Configure payment processing behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Partial Payments</Label>
              <p className="text-sm text-muted-foreground">
                Customers can pay invoices in multiple installments
              </p>
            </div>
            <Switch
              checked={config.processingSettings.allowPartialPayments}
              onCheckedChange={(checked) =>
                updateConfig({
                  processingSettings: {
                    ...config.processingSettings,
                    allowPartialPayments: checked,
                  },
                })
              }
              disabled={!isEditing}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Split Payments</Label>
              <p className="text-sm text-muted-foreground">
                Split payment across multiple methods
              </p>
            </div>
            <Switch
              checked={config.processingSettings.allowSplitPayments}
              onCheckedChange={(checked) =>
                updateConfig({
                  processingSettings: {
                    ...config.processingSettings,
                    allowSplitPayments: checked,
                  },
                })
              }
              disabled={!isEditing}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Capture Method</Label>
            <Select
              value={config.processingSettings.captureMethod}
              onValueChange={(value: "automatic" | "manual") =>
                updateConfig({
                  processingSettings: {
                    ...config.processingSettings,
                    captureMethod: value,
                  },
                })
              }
              disabled={!isEditing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="automatic">Automatic (Charge Immediately)</SelectItem>
                <SelectItem value="manual">Manual (Authorize Only)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Refund Policy</Label>
            <Select
              value={config.processingSettings.refundPolicy}
              onValueChange={(value: "full_refund" | "partial_refund" | "store_credit_only") =>
                updateConfig({
                  processingSettings: {
                    ...config.processingSettings,
                    refundPolicy: value,
                  },
                })
              }
              disabled={!isEditing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full_refund">Full Refund Allowed</SelectItem>
                <SelectItem value="partial_refund">Partial Refund Only</SelectItem>
                <SelectItem value="store_credit_only">Store Credit Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Clover Terminal Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Clover Terminal Configuration
          </CardTitle>
          <CardDescription>
            Configure Fiserv Clover physical terminal for in-person payments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Clover Terminal</Label>
              <p className="text-sm text-muted-foreground">
                Allow payments through physical Clover terminal (Tap/Chip/Swipe)
              </p>
            </div>
            <Switch
              checked={config.cloverTerminal?.enabled ?? false}
              onCheckedChange={(checked) =>
                updateConfig({
                  cloverTerminal: {
                    ...config.cloverTerminal,
                    enabled: checked,
                    autoPrintReceipts: config.cloverTerminal?.autoPrintReceipts ?? true,
                    defaultPaymentMethod: config.cloverTerminal?.defaultPaymentMethod ?? "terminal",
                  },
                })
              }
              disabled={!isEditing}
            />
          </div>

          {config.cloverTerminal?.enabled && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>Select Terminal</Label>
                <Select
                  value={config.cloverTerminal?.terminalId || ""}
                  onValueChange={(value) =>
                    updateConfig({
                      cloverTerminal: {
                        ...config.cloverTerminal,
                        terminalId: value,
                        enabled: true,
                        autoPrintReceipts: config.cloverTerminal?.autoPrintReceipts ?? true,
                        defaultPaymentMethod: config.cloverTerminal?.defaultPaymentMethod ?? "terminal",
                      },
                    })
                  }
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a terminal" />
                  </SelectTrigger>
                  <SelectContent>
                    {cloverTerminals.map((terminal) => (
                      <SelectItem key={terminal.terminalId} value={terminal.terminalId}>
                        <div className="flex items-center gap-2">
                          {terminal.connectionType === "wifi" && <Wifi className="h-4 w-4" />}
                          {terminal.connectionType === "ethernet" && <EthernetPort className="h-4 w-4" />}
                          {terminal.connectionType === "bluetooth" && <Bluetooth className="h-4 w-4" />}
                          <span>{terminal.terminalName}</span>
                          {terminal.isOnline ? (
                            <Badge variant="default" className="ml-2">Online</Badge>
                          ) : (
                            <Badge variant="secondary" className="ml-2">Offline</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {cloverTerminals.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No Clover terminals configured. Please add a terminal first.
                  </p>
                )}
              </div>

              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Print Receipts</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically print receipts on terminal after payment
                  </p>
                </div>
                <Switch
                  checked={config.cloverTerminal?.autoPrintReceipts ?? true}
                  onCheckedChange={(checked) =>
                    updateConfig({
                      cloverTerminal: {
                        ...config.cloverTerminal,
                        autoPrintReceipts: checked,
                        enabled: true,
                        defaultPaymentMethod: config.cloverTerminal?.defaultPaymentMethod ?? "terminal",
                      },
                    })
                  }
                  disabled={!isEditing}
                />
              </div>

              <Separator />
              <div className="space-y-2">
                <Label>Default Payment Method</Label>
                <Select
                  value={config.cloverTerminal?.defaultPaymentMethod || "terminal"}
                  onValueChange={(value: "terminal" | "web" | "both") =>
                    updateConfig({
                      cloverTerminal: {
                        ...config.cloverTerminal,
                        defaultPaymentMethod: value,
                        enabled: true,
                        autoPrintReceipts: config.cloverTerminal?.autoPrintReceipts ?? true,
                      },
                    })
                  }
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="terminal">Terminal Only (Tap/Chip/Swipe)</SelectItem>
                    <SelectItem value="web">Web App Only</SelectItem>
                    <SelectItem value="both">Both (Prompt for Choice)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  When "Both" is selected, cashier will be prompted to choose between terminal or web payment
                </p>
              </div>

              {config.cloverTerminal?.terminalId && (
                <>
                  <Separator />
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <Label className="text-sm font-semibold">Terminal Information</Label>
                    {(() => {
                      const terminal = getCloverTerminal(facilityId, config.cloverTerminal?.terminalId);
                      if (!terminal) return null;
                      return (
                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Name:</span>
                            <span>{terminal.terminalName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Serial:</span>
                            <span>{terminal.terminalSerialNumber}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Location:</span>
                            <span>{terminal.location || "Not specified"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Connection:</span>
                            <span className="capitalize">{terminal.connectionType}</span>
                            {terminal.ipAddress && (
                              <span className="text-muted-foreground">({terminal.ipAddress})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Status:</span>
                            {terminal.isOnline ? (
                              <Badge variant="default">Online</Badge>
                            ) : (
                              <Badge variant="secondary">Offline</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Supports:</span>
                            <div className="flex gap-1">
                              {terminal.supportsTap && <Badge variant="outline">Tap</Badge>}
                              {terminal.supportsChip && <Badge variant="outline">Chip</Badge>}
                              {terminal.supportsSwipe && <Badge variant="outline">Swipe</Badge>}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Yipyy Pay / Tap to Pay Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Yipyy Pay / Tap to Pay Configuration
          </CardTitle>
          <CardDescription>
            Configure iPhone Tap to Pay for contactless payments (no terminal needed)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Tap to Pay</Label>
              <p className="text-sm text-muted-foreground">
                Allow contactless card payments directly on iPhone
              </p>
            </div>
            <Switch
              checked={config.yipyyPay?.enabled ?? false}
              onCheckedChange={(checked) =>
                updateConfig({
                  yipyyPay: {
                    ...config.yipyyPay,
                    enabled: checked,
                    requireReceipt: config.yipyyPay?.requireReceipt ?? true,
                    autoSendReceipt: config.yipyyPay?.autoSendReceipt ?? true,
                  },
                })
              }
              disabled={!isEditing}
            />
          </div>

          {config.yipyyPay?.enabled && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>Authorized iPhone Devices</Label>
                {yipyyPayDevices.length > 0 ? (
                  <div className="space-y-2">
                    {yipyyPayDevices.map((device) => (
                      <div
                        key={device.id}
                        className="p-3 border rounded-lg flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <Smartphone className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{device.deviceName}</p>
                            <p className="text-xs text-muted-foreground">
                              Device ID: {device.deviceId}
                              {device.lastUsedAt && (
                                <span> • Last used: {new Date(device.lastUsedAt).toLocaleDateString()}</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <Badge variant={device.isAuthorized ? "default" : "secondary"}>
                          {device.isAuthorized ? "Authorized" : "Pending"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 border rounded-lg text-center text-sm text-muted-foreground">
                    <Smartphone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No authorized iPhone devices</p>
                    <p className="text-xs mt-1">
                      Authorize an iPhone device to enable Tap to Pay
                    </p>
                  </div>
                )}
              </div>

              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Receipt</Label>
                  <p className="text-sm text-muted-foreground">
                    Require receipt for all Tap to Pay transactions
                  </p>
                </div>
                <Switch
                  checked={config.yipyyPay?.requireReceipt ?? true}
                  onCheckedChange={(checked) =>
                    updateConfig({
                      yipyyPay: {
                        ...config.yipyyPay,
                        requireReceipt: checked,
                        enabled: true,
                        autoSendReceipt: config.yipyyPay?.autoSendReceipt ?? true,
                      },
                    })
                  }
                  disabled={!isEditing}
                />
              </div>

              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Send Receipt</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically send receipt to customer after payment
                  </p>
                </div>
                <Switch
                  checked={config.yipyyPay?.autoSendReceipt ?? true}
                  onCheckedChange={(checked) =>
                    updateConfig({
                      yipyyPay: {
                        ...config.yipyyPay,
                        autoSendReceipt: checked,
                        enabled: true,
                        requireReceipt: config.yipyyPay?.requireReceipt ?? true,
                      },
                    })
                  }
                  disabled={!isEditing}
                />
              </div>

              {yipyyPayConfig && (
                <>
                  <Separator />
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <Label className="text-sm font-semibold">Transaction Limits</Label>
                    <div className="text-sm space-y-1">
                      {yipyyPayConfig.minTransactionAmount && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Minimum:</span>
                          <span>${yipyyPayConfig.minTransactionAmount.toFixed(2)}</span>
                        </div>
                      )}
                      {yipyyPayConfig.maxTransactionAmount && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Maximum:</span>
                          <span>${yipyyPayConfig.maxTransactionAmount.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
