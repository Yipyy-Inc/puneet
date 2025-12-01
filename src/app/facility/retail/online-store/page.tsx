"use client";

import { useState } from "react";
import {
  Globe,
  RefreshCw,
  Link,
  Unlink,
  Settings,
  Package,
  DollarSign,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { onlineStoreSettings, products, getRetailStats } from "@/data/retail";

export default function OnlineStorePage() {
  const [settings, setSettings] = useState(onlineStoreSettings);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [connectForm, setConnectForm] = useState({
    storeUrl: settings.storeUrl,
    apiKey: "",
    apiSecret: "",
  });

  const stats = getRetailStats();
  const onlineProducts = products.filter((p) => p.onlineVisible);
  const hiddenProducts = products.filter((p) => !p.onlineVisible);

  const handleSync = async () => {
    setIsSyncing(true);
    // Simulate sync
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setSettings({
      ...settings,
      lastSyncAt: new Date().toISOString(),
    });
    setIsSyncing(false);
  };

  const handleConnect = () => {
    // In a real app, this would connect to the store API
    setSettings({
      ...settings,
      storeUrl: connectForm.storeUrl,
      apiConnected: true,
    });
    setIsConnectModalOpen(false);
  };

  const handleDisconnect = () => {
    setSettings({
      ...settings,
      apiConnected: false,
    });
  };

  const toggleSetting = (key: keyof typeof settings) => {
    if (typeof settings[key] === "boolean") {
      setSettings({
        ...settings,
        [key]: !settings[key],
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Online Store Integration</h3>
          <p className="text-sm text-muted-foreground">
            Sync your inventory and products with your online store
          </p>
        </div>
        <div className="flex items-center gap-2">
          {settings.apiConnected && (
            <Button
              variant="outline"
              onClick={handleSync}
              disabled={isSyncing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`}
              />
              {isSyncing ? "Syncing..." : "Sync Now"}
            </Button>
          )}
          <Button
            variant={settings.apiConnected ? "destructive" : "default"}
            onClick={
              settings.apiConnected
                ? handleDisconnect
                : () => setIsConnectModalOpen(true)
            }
          >
            {settings.apiConnected ? (
              <>
                <Unlink className="h-4 w-4 mr-2" />
                Disconnect
              </>
            ) : (
              <>
                <Link className="h-4 w-4 mr-2" />
                Connect Store
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`h-12 w-12 rounded-full flex items-center justify-center ${
                  settings.apiConnected ? "bg-green-100" : "bg-gray-100"
                }`}
              >
                {settings.apiConnected ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-gray-400" />
                )}
              </div>
              <div>
                <p className="font-medium">
                  {settings.apiConnected ? "Connected" : "Not Connected"}
                </p>
                {settings.apiConnected && (
                  <a
                    href={settings.storeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground flex items-center gap-1 hover:text-primary"
                  >
                    {settings.storeUrl}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
            {settings.apiConnected && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground flex items-center gap-1 justify-end">
                  <Clock className="h-4 w-4" />
                  Last synced
                </p>
                <p className="font-medium">{formatDate(settings.lastSyncAt)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {settings.apiConnected && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Online Products
              </CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{onlineProducts.length}</div>
              <p className="text-xs text-muted-foreground">Visible online</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Hidden Products
              </CardTitle>
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{hiddenProducts.length}</div>
              <p className="text-xs text-muted-foreground">Not shown online</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <Badge
                variant={stats.lowStockCount > 0 ? "destructive" : "secondary"}
              >
                {stats.lowStockCount}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.lowStockCount}</div>
              <p className="text-xs text-muted-foreground">
                Below threshold ({settings.lowStockThreshold})
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Active</div>
              <p className="text-xs text-muted-foreground">Auto-sync enabled</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sync Settings */}
      {settings.apiConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Sync Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Enable Online Store</Label>
                <p className="text-sm text-muted-foreground">
                  Allow customers to browse and purchase online
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={() => toggleSetting("enabled")}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Sync Inventory
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically update stock levels in online store
                </p>
              </div>
              <Switch
                checked={settings.syncInventory}
                onCheckedChange={() => toggleSetting("syncInventory")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Sync Products
                </Label>
                <p className="text-sm text-muted-foreground">
                  Keep product details synchronized
                </p>
              </div>
              <Switch
                checked={settings.syncProducts}
                onCheckedChange={() => toggleSetting("syncProducts")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Sync Prices
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically update product prices
                </p>
              </div>
              <Switch
                checked={settings.syncPrices}
                onCheckedChange={() => toggleSetting("syncPrices")}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Auto-Publish New Products</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically make new products visible online
                </p>
              </div>
              <Switch
                checked={settings.autoPublishNewProducts}
                onCheckedChange={() => toggleSetting("autoPublishNewProducts")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Hide Out of Stock</Label>
                <p className="text-sm text-muted-foreground">
                  Hide products with zero stock from online store
                </p>
              </div>
              <Switch
                checked={settings.hideOutOfStock}
                onCheckedChange={() => toggleSetting("hideOutOfStock")}
              />
            </div>

            <Separator />

            <div className="grid gap-2">
              <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
              <p className="text-sm text-muted-foreground">
                Products below this quantity will trigger low stock alerts
              </p>
              <Input
                id="lowStockThreshold"
                type="number"
                min={0}
                value={settings.lowStockThreshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    lowStockThreshold: parseInt(e.target.value) || 0,
                  })
                }
                className="w-32"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Visibility Summary */}
      {settings.apiConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Product Visibility</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Eye className="h-4 w-4 text-green-500" />
                  Visible Online ({onlineProducts.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {onlineProducts.slice(0, 5).map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-2 rounded border"
                    >
                      <span className="text-sm">{product.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {product.stock} in stock
                      </Badge>
                    </div>
                  ))}
                  {onlineProducts.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
                      +{onlineProducts.length - 5} more products
                    </p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <EyeOff className="h-4 w-4 text-gray-400" />
                  Hidden ({hiddenProducts.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {hiddenProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      All products are visible online
                    </p>
                  ) : (
                    hiddenProducts.slice(0, 5).map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-2 rounded border"
                      >
                        <span className="text-sm">{product.name}</span>
                        <Button variant="outline" size="sm">
                          Show
                        </Button>
                      </div>
                    ))
                  )}
                  {hiddenProducts.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
                      +{hiddenProducts.length - 5} more products
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connect Store Modal */}
      <Dialog open={isConnectModalOpen} onOpenChange={setIsConnectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Online Store</DialogTitle>
            <DialogDescription>
              Enter your store API credentials to enable synchronization.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="storeUrl">Store URL</Label>
              <Input
                id="storeUrl"
                value={connectForm.storeUrl}
                onChange={(e) =>
                  setConnectForm({ ...connectForm, storeUrl: e.target.value })
                }
                placeholder="https://store.yoursite.com"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                value={connectForm.apiKey}
                onChange={(e) =>
                  setConnectForm({ ...connectForm, apiKey: e.target.value })
                }
                placeholder="Enter your API key"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="apiSecret">API Secret</Label>
              <Input
                id="apiSecret"
                type="password"
                value={connectForm.apiSecret}
                onChange={(e) =>
                  setConnectForm({ ...connectForm, apiSecret: e.target.value })
                }
                placeholder="Enter your API secret"
              />
            </div>

            <p className="text-sm text-muted-foreground">
              You can find your API credentials in your online store&apos;s admin
              settings under &quot;API Access&quot; or &quot;Integrations&quot;.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConnectModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleConnect}>Connect</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
