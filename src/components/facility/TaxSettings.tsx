"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Receipt, Plus, Trash2, Shield, Globe, Percent } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TAX_PRESETS, getPreset } from "@/data/tax-presets";
import { facilities } from "@/data/facilities";
import { useFacilityRole } from "@/hooks/use-facility-role";

interface TaxEntry {
  id: string;
  name: string;
  rate: number;
  appliesTo: "all" | "services_only" | "products_only";
  registrationNumber: string;
  description: string;
  isCompound: boolean; // compound = calculated on subtotal + previous taxes
  enabled: boolean;
}

const defaultFacility = facilities.find((f) => f.id === 11);
const defaultConfig = defaultFacility?.taxConfig;

let _taxId = 500;

export function TaxSettings() {
  const { role } = useFacilityRole();

  const [country, setCountry] = useState(defaultConfig?.country ?? "CA");
  const [province, setProvince] = useState(defaultConfig?.province ?? "QC");
  const [taxes, setTaxes] = useState<TaxEntry[]>(
    (defaultConfig?.taxes ?? []).map((t) => ({
      ...t,
      registrationNumber:
        (t as unknown as Record<string, string>).registrationNumber ?? "",
      description: "",
      isCompound: false,
    })),
  );
  const [pricesIncludeTax, setPricesIncludeTax] = useState(
    defaultConfig?.pricesIncludeTax ?? false,
  );
  const [showSeparately, setShowSeparately] = useState(
    defaultConfig?.showTaxesSeparately ?? true,
  );
  const [showRegistration, setShowRegistration] = useState(
    defaultConfig?.showRegistrationOnInvoice ?? true,
  );
  const [exemptGiftCards, setExemptGiftCards] = useState(
    defaultConfig?.exemptions.giftCards ?? true,
  );
  const [exemptStoreCredit, setExemptStoreCredit] = useState(
    defaultConfig?.exemptions.storeCredit ?? true,
  );

  const selectedCountry = TAX_PRESETS.find((c) => c.code === country);
  const regions = selectedCountry?.regions ?? [];

  const combinedRate = taxes
    .filter((t) => t.enabled)
    .reduce((sum, t) => sum + t.rate, 0);

  const handleCountryChange = (code: string) => {
    setCountry(code);
    const c = TAX_PRESETS.find((p) => p.code === code);
    if (c && c.regions.length > 0) {
      setProvince(c.regions[0].code);
      applyPreset(code, c.regions[0].code);
    }
  };

  const handleProvinceChange = (code: string) => {
    setProvince(code);
    applyPreset(country, code);
  };

  const applyPreset = (countryCode: string, regionCode: string) => {
    const preset = getPreset(countryCode, regionCode);
    if (preset) {
      setTaxes(
        preset.map((p, i) => ({
          id: `preset-${i}`,
          name: p.name,
          rate: p.rate,
          appliesTo: p.appliesTo,
          registrationNumber: "",
          description: "",
          isCompound: false,
          enabled: true,
        })),
      );
    }
  };

  const handleAddTax = () => {
    _taxId += 1;
    setTaxes((prev) => [
      ...prev,
      {
        id: `tax-${_taxId}`,
        name: "",
        rate: 0,
        appliesTo: "all",
        registrationNumber: "",
        description: "",
        isCompound: false,
        enabled: true,
      },
    ]);
  };

  const handleRemoveTax = (id: string) => {
    setTaxes((prev) => prev.filter((t) => t.id !== id));
  };

  const handleUpdateTax = (id: string, updates: Partial<TaxEntry>) => {
    setTaxes((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    );
  };

  const handleSave = () => {
    if (defaultFacility) {
      (defaultFacility as Record<string, unknown>).taxConfig = {
        country,
        province,
        taxes,
        pricesIncludeTax,
        showTaxesSeparately: showSeparately,
        showRegistrationOnInvoice: showRegistration,
        exemptions: {
          tips: true,
          giftCards: exemptGiftCards,
          storeCredit: exemptStoreCredit,
        },
      };
    }
    toast.success("Tax settings saved");
  };

  if (role !== "owner" && role !== "manager") {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-8">
          <Shield className="text-muted-foreground size-5" />
          <p className="text-muted-foreground text-sm">
            Tax settings are only accessible to facility owners and managers.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Tax Configuration</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure tax rates for your facility. These rates apply to all
          invoices, estimates, and receipts.
        </p>
      </div>

      {/* Location */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Globe className="size-4" />
            Facility Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Country</Label>
              <Select value={country} onValueChange={handleCountryChange}>
                <SelectTrigger className="mt-1 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAX_PRESETS.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Province / State / Region</Label>
              <Select value={province} onValueChange={handleProvinceChange}>
                <SelectTrigger className="mt-1 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((r) => (
                    <SelectItem key={r.code} value={r.code}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            Selecting a location auto-fills standard tax rates. You can
            customize them below.
          </p>
        </CardContent>
      </Card>

      {/* Tax Rates */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Percent className="size-4" />
              Tax Rates
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleAddTax}
            >
              <Plus className="size-3.5" />
              Add Tax Rate
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {taxes.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No tax rates configured — your invoices won&apos;t include tax.
            </p>
          ) : (
            <>
              {taxes.map((tax) => (
                <div
                  key={tax.id}
                  className={cn(
                    "rounded-xl border p-4 transition-opacity",
                    !tax.enabled && "opacity-40",
                  )}
                >
                  {/* Header row — name, rate, toggle, delete */}
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div>
                          <Label className="text-[11px]">Tax Name</Label>
                          <Input
                            value={tax.name}
                            onChange={(e) =>
                              handleUpdateTax(tax.id, { name: e.target.value })
                            }
                            placeholder="e.g. GST, HST, VAT"
                            className="mt-1 h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px]">Rate (%)</Label>
                          <Input
                            type="number"
                            step="0.001"
                            min="0"
                            max="100"
                            value={
                              tax.rate > 0
                                ? (tax.rate * 100).toFixed(
                                    tax.rate * 100 ===
                                      Math.floor(tax.rate * 100)
                                      ? 0
                                      : 3,
                                  )
                                : ""
                            }
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              handleUpdateTax(tax.id, {
                                rate: Number.isNaN(val) ? 0 : val / 100,
                              });
                            }}
                            placeholder="5.000"
                            className="mt-1 h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px]">Applies To</Label>
                          <Select
                            value={tax.appliesTo}
                            onValueChange={(v) =>
                              handleUpdateTax(tax.id, {
                                appliesTo: v as TaxEntry["appliesTo"],
                              })
                            }
                          >
                            <SelectTrigger className="mt-1 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All items</SelectItem>
                              <SelectItem value="services_only">
                                Services only
                              </SelectItem>
                              <SelectItem value="products_only">
                                Products only
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[11px]">Registration #</Label>
                          <Input
                            value={tax.registrationNumber}
                            onChange={(e) =>
                              handleUpdateTax(tax.id, {
                                registrationNumber: e.target.value,
                              })
                            }
                            placeholder="e.g. RT 123456789"
                            className="mt-1 h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-center gap-1 pt-4">
                      <Switch
                        checked={tax.enabled}
                        onCheckedChange={(c) =>
                          handleUpdateTax(tax.id, { enabled: c })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                        onClick={() => handleRemoveTax(tax.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded fields */}
                  <div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3">
                    <div>
                      <Label className="text-[11px]">
                        Description (optional)
                      </Label>
                      <Input
                        value={tax.description}
                        onChange={(e) =>
                          handleUpdateTax(tax.id, {
                            description: e.target.value,
                          })
                        }
                        placeholder="e.g. Federal Goods and Services Tax"
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    <div className="flex items-end gap-4 pb-1">
                      <label className="flex cursor-pointer items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={tax.isCompound}
                          onChange={(e) =>
                            handleUpdateTax(tax.id, {
                              isCompound: e.target.checked,
                            })
                          }
                          className="accent-primary"
                        />
                        <span>
                          Compound tax{" "}
                          <span className="text-muted-foreground">
                            (calculated on subtotal + previous taxes)
                          </span>
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
              <div className="bg-muted/40 flex items-center justify-between rounded-lg px-4 py-2.5">
                <span className="text-sm font-medium">Combined Rate</span>
                <span className="font-[tabular-nums] text-sm font-bold">
                  {(combinedRate * 100).toFixed(
                    combinedRate * 100 === Math.floor(combinedRate * 100)
                      ? 0
                      : 3,
                  )}
                  %
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tax Behavior */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Receipt className="size-4" />
            Tax Behavior &amp; Display
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Prices include tax</p>
              <p className="text-muted-foreground text-xs">
                When on, listed prices already include tax. When off, tax is
                added on top.
              </p>
            </div>
            <Switch
              checked={pricesIncludeTax}
              onCheckedChange={setPricesIncludeTax}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                Show each tax line separately
              </p>
              <p className="text-muted-foreground text-xs">
                Show GST and QST as separate lines vs a combined total.
              </p>
            </div>
            <Switch
              checked={showSeparately}
              onCheckedChange={setShowSeparately}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                Show registration numbers on invoices
              </p>
              <p className="text-muted-foreground text-xs">
                Display your tax registration numbers on printed/emailed
                invoices.
              </p>
            </div>
            <Switch
              checked={showRegistration}
              onCheckedChange={setShowRegistration}
            />
          </div>
        </CardContent>
      </Card>

      {/* Exemptions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Shield className="size-4" />
            Tax Exemptions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Tips</p>
              <p className="text-muted-foreground text-xs">
                Tips are always tax exempt.
              </p>
            </div>
            <Switch checked disabled />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Gift card purchases</p>
              <p className="text-muted-foreground text-xs">
                Exempt gift card purchases from tax.
              </p>
            </div>
            <Switch
              checked={exemptGiftCards}
              onCheckedChange={setExemptGiftCards}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Store credit redemptions</p>
              <p className="text-muted-foreground text-xs">
                Exempt store credit usage from tax.
              </p>
            </div>
            <Switch
              checked={exemptStoreCredit}
              onCheckedChange={setExemptStoreCredit}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-1.5">
          Save Tax Settings
        </Button>
      </div>
    </div>
  );
}
