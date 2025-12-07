"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Save, RotateCcw } from "lucide-react";

export default function RetailSettingsPage() {
  const [settings, setSettings] = useState({
    // General Settings
    enabled: true,
    enableOnlineStore: true,
    enableInStorePOS: true,
    requireCustomerAccount: false,

    // POS Settings
    defaultTaxRate: 8.25,
    enableTips: false,
    tipPercentages: [15, 18, 20, 25],
    roundToNearestCent: true,
    printReceipts: true,
    emailReceipts: true,

    // Payment Methods
    acceptCash: true,
    acceptCreditCards: true,
    acceptDebitCards: true,
    acceptMobilePayments: true,
    acceptGiftCards: true,
    acceptStoreCredit: true,

    // Inventory Settings
    lowStockThreshold: 10,
    enableLowStockAlerts: true,
    autoReorderEnabled: false,
    autoReorderThreshold: 5,
    trackInventoryByLocation: true,

    // Product Settings
    allowBackorders: false,
    showOutOfStockProducts: true,
    enableProductReviews: false,
    requireSkuForProducts: true,
    enableBarcodeScanning: true,

    // Pricing & Discounts
    enableMemberDiscounts: true,
    memberDiscountPercentage: 10,
    enableBulkDiscounts: true,
    enablePromoCodes: true,
    maxDiscountPercentage: 50,

    // Orders & Fulfillment
    enableOrderPickup: true,
    enableLocalDelivery: false,
    localDeliveryFee: 10,
    localDeliveryRadius: 10,
    orderReadyNotification: true,

    // Returns & Refunds
    enableReturns: true,
    returnWindowDays: 30,
    requireReceipt: true,
    restockingFeePercentage: 0,
    allowExchanges: true,

    // Notifications
    sendOrderConfirmation: true,
    sendShippingNotification: true,
    sendLowStockAlerts: true,
    lowStockAlertEmail: "",

    // Policies
    returnPolicy:
      "Items may be returned within 30 days of purchase with original receipt. Items must be in original condition with tags attached.",
    shippingPolicy:
      "Orders over $50 qualify for free shipping. Standard shipping takes 3-5 business days.",
    termsAndConditions:
      "All sales are subject to our standard terms and conditions. Gift cards are non-refundable.",
  });

  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    // TODO: Save to backend
    setIsEditing(false);
  };

  const handleReset = () => {
    // TODO: Reset to saved values
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Retail Settings</h2>
          <p className="text-muted-foreground">
            Configure retail and POS preferences
          </p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit Settings</Button>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>Basic retail configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Retail Service</Label>
                <p className="text-sm text-muted-foreground">
                  Enable retail and POS functionality
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enabled: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Online Store</Label>
                <p className="text-sm text-muted-foreground">
                  Allow customers to purchase online
                </p>
              </div>
              <Switch
                checked={settings.enableOnlineStore}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableOnlineStore: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable In-Store POS</Label>
                <p className="text-sm text-muted-foreground">
                  Enable point of sale for in-store transactions
                </p>
              </div>
              <Switch
                checked={settings.enableInStorePOS}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableInStorePOS: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Customer Account</Label>
                <p className="text-sm text-muted-foreground">
                  Customers must have an account to purchase
                </p>
              </div>
              <Switch
                checked={settings.requireCustomerAccount}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, requireCustomerAccount: checked })
                }
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* POS Settings */}
        <Card>
          <CardHeader>
            <CardTitle>POS Settings</CardTitle>
            <CardDescription>Configure point of sale options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default Tax Rate (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={settings.defaultTaxRate}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultTaxRate: parseFloat(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                  className="w-32"
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Tips</Label>
                <p className="text-sm text-muted-foreground">
                  Allow customers to add tips at checkout
                </p>
              </div>
              <Switch
                checked={settings.enableTips}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableTips: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Print Receipts</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically print receipts after purchase
                </p>
              </div>
              <Switch
                checked={settings.printReceipts}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, printReceipts: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Receipts</Label>
                <p className="text-sm text-muted-foreground">
                  Offer to email receipts to customers
                </p>
              </div>
              <Switch
                checked={settings.emailReceipts}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, emailReceipts: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Barcode Scanning</Label>
                <p className="text-sm text-muted-foreground">
                  Use barcode scanner for product lookup
                </p>
              </div>
              <Switch
                checked={settings.enableBarcodeScanning}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableBarcodeScanning: checked })
                }
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>
              Configure accepted payment methods
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label>Cash</Label>
                <Switch
                  checked={settings.acceptCash}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, acceptCash: checked })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Credit Cards</Label>
                <Switch
                  checked={settings.acceptCreditCards}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, acceptCreditCards: checked })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Debit Cards</Label>
                <Switch
                  checked={settings.acceptDebitCards}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, acceptDebitCards: checked })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Mobile Payments</Label>
                <Switch
                  checked={settings.acceptMobilePayments}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, acceptMobilePayments: checked })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Gift Cards</Label>
                <Switch
                  checked={settings.acceptGiftCards}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, acceptGiftCards: checked })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Store Credit</Label>
                <Switch
                  checked={settings.acceptStoreCredit}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, acceptStoreCredit: checked })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Settings</CardTitle>
            <CardDescription>Configure inventory management</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Low Stock Threshold</Label>
              <Input
                type="number"
                value={settings.lowStockThreshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    lowStockThreshold: parseInt(e.target.value) || 0,
                  })
                }
                disabled={!isEditing}
                className="w-32"
              />
              <p className="text-sm text-muted-foreground">
                Alert when stock falls below this quantity
              </p>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Low Stock Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Send notifications when items are low in stock
                </p>
              </div>
              <Switch
                checked={settings.enableLowStockAlerts}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableLowStockAlerts: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Reorder</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically create purchase orders for low stock items
                </p>
              </div>
              <Switch
                checked={settings.autoReorderEnabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, autoReorderEnabled: checked })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.autoReorderEnabled && (
              <div className="space-y-2">
                <Label>Auto-Reorder Threshold</Label>
                <Input
                  type="number"
                  value={settings.autoReorderThreshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      autoReorderThreshold: parseInt(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                  className="w-32"
                />
              </div>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Track Inventory by Location</Label>
                <p className="text-sm text-muted-foreground">
                  Maintain separate inventory counts per location
                </p>
              </div>
              <Switch
                checked={settings.trackInventoryByLocation}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    trackInventoryByLocation: checked,
                  })
                }
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Product Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Product Settings</CardTitle>
            <CardDescription>
              Configure product display and management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Backorders</Label>
                <p className="text-sm text-muted-foreground">
                  Allow orders for out-of-stock items
                </p>
              </div>
              <Switch
                checked={settings.allowBackorders}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, allowBackorders: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Out of Stock Products</Label>
                <p className="text-sm text-muted-foreground">
                  Display products that are currently out of stock
                </p>
              </div>
              <Switch
                checked={settings.showOutOfStockProducts}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, showOutOfStockProducts: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require SKU for Products</Label>
                <p className="text-sm text-muted-foreground">
                  All products must have a unique SKU
                </p>
              </div>
              <Switch
                checked={settings.requireSkuForProducts}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, requireSkuForProducts: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Product Reviews</Label>
                <p className="text-sm text-muted-foreground">
                  Allow customers to leave reviews on products
                </p>
              </div>
              <Switch
                checked={settings.enableProductReviews}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableProductReviews: checked })
                }
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing & Discounts */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing & Discounts</CardTitle>
            <CardDescription>
              Configure discounts and promotions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Member Discounts</Label>
                <p className="text-sm text-muted-foreground">
                  Offer discounts to registered members
                </p>
              </div>
              <Switch
                checked={settings.enableMemberDiscounts}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableMemberDiscounts: checked })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.enableMemberDiscounts && (
              <div className="space-y-2">
                <Label>Member Discount (%)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={settings.memberDiscountPercentage}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        memberDiscountPercentage: parseInt(e.target.value) || 0,
                      })
                    }
                    disabled={!isEditing}
                    className="w-24"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Bulk Discounts</Label>
                <p className="text-sm text-muted-foreground">
                  Offer discounts for bulk purchases
                </p>
              </div>
              <Switch
                checked={settings.enableBulkDiscounts}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableBulkDiscounts: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Promo Codes</Label>
                <p className="text-sm text-muted-foreground">
                  Accept promotional discount codes
                </p>
              </div>
              <Switch
                checked={settings.enablePromoCodes}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enablePromoCodes: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Maximum Discount (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={settings.maxDiscountPercentage}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maxDiscountPercentage: parseInt(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                  className="w-24"
                />
                <span className="text-muted-foreground">% maximum allowed</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders & Fulfillment */}
        <Card>
          <CardHeader>
            <CardTitle>Orders & Fulfillment</CardTitle>
            <CardDescription>Configure order handling options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Order Pickup</Label>
                <p className="text-sm text-muted-foreground">
                  Allow customers to pick up orders in store
                </p>
              </div>
              <Switch
                checked={settings.enableOrderPickup}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableOrderPickup: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Local Delivery</Label>
                <p className="text-sm text-muted-foreground">
                  Offer delivery to local addresses
                </p>
              </div>
              <Switch
                checked={settings.enableLocalDelivery}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableLocalDelivery: checked })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.enableLocalDelivery && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Delivery Fee ($)</Label>
                    <Input
                      type="number"
                      value={settings.localDeliveryFee}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          localDeliveryFee: parseFloat(e.target.value) || 0,
                        })
                      }
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Delivery Radius (miles)</Label>
                    <Input
                      type="number"
                      value={settings.localDeliveryRadius}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          localDeliveryRadius: parseInt(e.target.value) || 0,
                        })
                      }
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Order Ready Notification</Label>
                <p className="text-sm text-muted-foreground">
                  Notify customers when their order is ready
                </p>
              </div>
              <Switch
                checked={settings.orderReadyNotification}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, orderReadyNotification: checked })
                }
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Returns & Refunds */}
        <Card>
          <CardHeader>
            <CardTitle>Returns & Refunds</CardTitle>
            <CardDescription>
              Configure return and refund policies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Returns</Label>
                <p className="text-sm text-muted-foreground">
                  Accept product returns
                </p>
              </div>
              <Switch
                checked={settings.enableReturns}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableReturns: checked })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.enableReturns && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Return Window (days)</Label>
                  <Input
                    type="number"
                    value={settings.returnWindowDays}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        returnWindowDays: parseInt(e.target.value) || 0,
                      })
                    }
                    disabled={!isEditing}
                    className="w-32"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Receipt</Label>
                    <p className="text-sm text-muted-foreground">
                      Receipt required for returns
                    </p>
                  </div>
                  <Switch
                    checked={settings.requireReceipt}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, requireReceipt: checked })
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Restocking Fee (%)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={settings.restockingFeePercentage}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          restockingFeePercentage:
                            parseInt(e.target.value) || 0,
                        })
                      }
                      disabled={!isEditing}
                      className="w-24"
                    />
                    <span className="text-muted-foreground">
                      % (0 for no fee)
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Exchanges</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow product exchanges in addition to refunds
                    </p>
                  </div>
                  <Switch
                    checked={settings.allowExchanges}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, allowExchanges: checked })
                    }
                    disabled={!isEditing}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Configure retail notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Order Confirmation</Label>
                <p className="text-sm text-muted-foreground">
                  Send confirmation email after purchase
                </p>
              </div>
              <Switch
                checked={settings.sendOrderConfirmation}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, sendOrderConfirmation: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Shipping Notification</Label>
                <p className="text-sm text-muted-foreground">
                  Notify when order is shipped
                </p>
              </div>
              <Switch
                checked={settings.sendShippingNotification}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    sendShippingNotification: checked,
                  })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Low Stock Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Send alerts when inventory is low
                </p>
              </div>
              <Switch
                checked={settings.sendLowStockAlerts}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, sendLowStockAlerts: checked })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.sendLowStockAlerts && (
              <div className="space-y-2">
                <Label>Alert Email</Label>
                <Input
                  type="email"
                  value={settings.lowStockAlertEmail}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      lowStockAlertEmail: e.target.value,
                    })
                  }
                  disabled={!isEditing}
                  placeholder="inventory@example.com"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Policies */}
        <Card>
          <CardHeader>
            <CardTitle>Policies</CardTitle>
            <CardDescription>
              Define retail policies displayed to customers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Return Policy</Label>
              <Textarea
                value={settings.returnPolicy}
                onChange={(e) =>
                  setSettings({ ...settings, returnPolicy: e.target.value })
                }
                disabled={!isEditing}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Shipping Policy</Label>
              <Textarea
                value={settings.shippingPolicy}
                onChange={(e) =>
                  setSettings({ ...settings, shippingPolicy: e.target.value })
                }
                disabled={!isEditing}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Terms & Conditions</Label>
              <Textarea
                value={settings.termsAndConditions}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    termsAndConditions: e.target.value,
                  })
                }
                disabled={!isEditing}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
