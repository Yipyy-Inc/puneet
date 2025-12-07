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

export default function StoreSettingsPage() {
  const [settings, setSettings] = useState({
    // General Settings
    enabled: true,
    storeName: "Pet Supply Store",
    enableOnlineOrdering: true,
    enableInStorePickup: true,

    // Operating Hours
    openTime: "09:00",
    closeTime: "18:00",
    openWeekends: true,
    weekendOpenTime: "10:00",
    weekendCloseTime: "16:00",

    // Inventory Settings
    lowStockThreshold: 10,
    enableLowStockAlerts: true,
    autoHideOutOfStock: false,
    showStockQuantity: true,

    // Pricing & Tax
    defaultTaxRate: 8.25,
    enableMemberPricing: true,
    memberDiscountPercentage: 10,
    roundPrices: true,

    // Product Categories
    enableFoodCategory: true,
    enableToysCategory: true,
    enableAccessoriesCategory: true,
    enableGroomingCategory: true,
    enableHealthCategory: true,

    // Order Settings
    minimumOrderAmount: 0,
    freePickupThreshold: 25,
    enableGiftWrapping: false,
    giftWrappingFee: 5,

    // Customer Settings
    requireAccountForPurchase: false,
    enableGuestCheckout: true,
    enableWishlist: true,
    enableProductReviews: false,

    // Notifications
    sendOrderConfirmation: true,
    sendReadyForPickup: true,
    sendLowStockAlerts: true,
    lowStockAlertEmail: "",

    // Policies
    returnPolicy:
      "Items may be returned within 14 days of purchase with original receipt. Opened food items cannot be returned.",
    pickupPolicy:
      "Orders will be held for 7 days. Please bring your order confirmation and valid ID for pickup.",
    termsOfService:
      "All sales are final on clearance items. We reserve the right to limit quantities on promotional items.",
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
          <h2 className="text-2xl font-bold tracking-tight">Store Settings</h2>
          <p className="text-muted-foreground">
            Configure store preferences and policies
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
            <CardDescription>Basic store configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Store</Label>
                <p className="text-sm text-muted-foreground">
                  Enable the store for customers
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
            <div className="space-y-2">
              <Label>Store Name</Label>
              <Input
                value={settings.storeName}
                onChange={(e) =>
                  setSettings({ ...settings, storeName: e.target.value })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Online Ordering</Label>
                <p className="text-sm text-muted-foreground">
                  Allow customers to place orders online
                </p>
              </div>
              <Switch
                checked={settings.enableOnlineOrdering}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableOnlineOrdering: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable In-Store Pickup</Label>
                <p className="text-sm text-muted-foreground">
                  Allow customers to pick up orders at the facility
                </p>
              </div>
              <Switch
                checked={settings.enableInStorePickup}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableInStorePickup: checked })
                }
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Operating Hours */}
        <Card>
          <CardHeader>
            <CardTitle>Operating Hours</CardTitle>
            <CardDescription>Set store hours</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Weekday Opening Time</Label>
                <Input
                  type="time"
                  value={settings.openTime}
                  onChange={(e) =>
                    setSettings({ ...settings, openTime: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Weekday Closing Time</Label>
                <Input
                  type="time"
                  value={settings.closeTime}
                  onChange={(e) =>
                    setSettings({ ...settings, closeTime: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Open on Weekends</Label>
                <p className="text-sm text-muted-foreground">
                  Store operates on Saturday and Sunday
                </p>
              </div>
              <Switch
                checked={settings.openWeekends}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, openWeekends: checked })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.openWeekends && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Weekend Opening Time</Label>
                  <Input
                    type="time"
                    value={settings.weekendOpenTime}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        weekendOpenTime: e.target.value,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Weekend Closing Time</Label>
                  <Input
                    type="time"
                    value={settings.weekendCloseTime}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        weekendCloseTime: e.target.value,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>
              </div>
            )}
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
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Hide Out of Stock</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically hide products when out of stock
                </p>
              </div>
              <Switch
                checked={settings.autoHideOutOfStock}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, autoHideOutOfStock: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Stock Quantity</Label>
                <p className="text-sm text-muted-foreground">
                  Display available quantity to customers
                </p>
              </div>
              <Switch
                checked={settings.showStockQuantity}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, showStockQuantity: checked })
                }
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing & Tax */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing & Tax</CardTitle>
            <CardDescription>
              Configure pricing and tax settings
            </CardDescription>
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
                <Label>Enable Member Pricing</Label>
                <p className="text-sm text-muted-foreground">
                  Offer special pricing for members
                </p>
              </div>
              <Switch
                checked={settings.enableMemberPricing}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableMemberPricing: checked })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.enableMemberPricing && (
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
                <Label>Round Prices</Label>
                <p className="text-sm text-muted-foreground">
                  Round prices to nearest cent
                </p>
              </div>
              <Switch
                checked={settings.roundPrices}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, roundPrices: checked })
                }
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Product Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Product Categories</CardTitle>
            <CardDescription>
              Enable or disable product categories
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label>Pet Food</Label>
                <Switch
                  checked={settings.enableFoodCategory}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enableFoodCategory: checked })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Toys</Label>
                <Switch
                  checked={settings.enableToysCategory}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enableToysCategory: checked })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Accessories</Label>
                <Switch
                  checked={settings.enableAccessoriesCategory}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      enableAccessoriesCategory: checked,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Grooming Supplies</Label>
                <Switch
                  checked={settings.enableGroomingCategory}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      enableGroomingCategory: checked,
                    })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Health & Wellness</Label>
                <Switch
                  checked={settings.enableHealthCategory}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enableHealthCategory: checked })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Order Settings</CardTitle>
            <CardDescription>Configure order options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Minimum Order Amount ($)</Label>
              <Input
                type="number"
                value={settings.minimumOrderAmount}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    minimumOrderAmount: parseFloat(e.target.value) || 0,
                  })
                }
                disabled={!isEditing}
                className="w-32"
              />
              <p className="text-sm text-muted-foreground">
                Set to 0 for no minimum
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Free Pickup Threshold ($)</Label>
              <Input
                type="number"
                value={settings.freePickupThreshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    freePickupThreshold: parseFloat(e.target.value) || 0,
                  })
                }
                disabled={!isEditing}
                className="w-32"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Gift Wrapping</Label>
                <p className="text-sm text-muted-foreground">
                  Offer gift wrapping service
                </p>
              </div>
              <Switch
                checked={settings.enableGiftWrapping}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableGiftWrapping: checked })
                }
                disabled={!isEditing}
              />
            </div>
            {settings.enableGiftWrapping && (
              <div className="space-y-2">
                <Label>Gift Wrapping Fee ($)</Label>
                <Input
                  type="number"
                  value={settings.giftWrappingFee}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      giftWrappingFee: parseFloat(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditing}
                  className="w-32"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Settings</CardTitle>
            <CardDescription>Configure customer experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Account for Purchase</Label>
                <p className="text-sm text-muted-foreground">
                  Customers must create an account to purchase
                </p>
              </div>
              <Switch
                checked={settings.requireAccountForPurchase}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    requireAccountForPurchase: checked,
                  })
                }
                disabled={!isEditing}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Guest Checkout</Label>
                <p className="text-sm text-muted-foreground">
                  Allow purchases without an account
                </p>
              </div>
              <Switch
                checked={settings.enableGuestCheckout}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableGuestCheckout: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Wishlist</Label>
                <p className="text-sm text-muted-foreground">
                  Allow customers to save items for later
                </p>
              </div>
              <Switch
                checked={settings.enableWishlist}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableWishlist: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Product Reviews</Label>
                <p className="text-sm text-muted-foreground">
                  Allow customers to review products
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

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Configure store notifications</CardDescription>
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
                <Label>Ready for Pickup</Label>
                <p className="text-sm text-muted-foreground">
                  Notify when order is ready for pickup
                </p>
              </div>
              <Switch
                checked={settings.sendReadyForPickup}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, sendReadyForPickup: checked })
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
              Define store policies displayed to customers
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
              <Label>Pickup Policy</Label>
              <Textarea
                value={settings.pickupPolicy}
                onChange={(e) =>
                  setSettings({ ...settings, pickupPolicy: e.target.value })
                }
                disabled={!isEditing}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Terms of Service</Label>
              <Textarea
                value={settings.termsOfService}
                onChange={(e) =>
                  setSettings({ ...settings, termsOfService: e.target.value })
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
