"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { paymentProviders, PaymentProvider } from "@/data/transactions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MoreHorizontal, Settings, TrendingUp, Eye, Building } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function PaymentProvidersTable() {
  const [data, setData] = useState<PaymentProvider[]>(paymentProviders);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showFacilitiesModal, setShowFacilitiesModal] = useState(false);

  const toggleProviderStatus = (providerId: string) => {
    setData(prev =>
      prev.map(p =>
        p.id === providerId ? { ...p, isActive: !p.isActive } : p
      )
    );
  };

  const columns: ColumnDef<PaymentProvider>[] = [
    {
      key: "name",
      label: "Provider",
      render: (item) => (
        <div className="flex items-center gap-2">
          <div className="font-medium">{item.name}</div>
          {!item.isActive && <Badge variant="outline">Inactive</Badge>}
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (item) => (
        <Badge variant="secondary" className="capitalize">
          {item.type}
        </Badge>
      ),
    },
    {
      key: "facilities",
      label: "Facilities",
      render: (item) => (
        <div className="flex items-center gap-1">
          <span className="font-medium">{item.facilities.length}</span>
          <span className="text-muted-foreground text-sm">connected</span>
        </div>
      ),
    },
    {
      key: "processingFee",
      label: "Fees",
      render: (item) => (
        <div className="text-sm">
          {item.processingFeePercentage}% + ${item.fixedFee.toFixed(2)}
        </div>
      ),
    },
    {
      key: "totalTransactions",
      label: "Transactions",
      render: (item) => (
        <div className="text-right">
          {item.statistics.totalTransactions.toLocaleString()}
        </div>
      ),
    },
    {
      key: "successRate",
      label: "Success Rate",
      render: (item) => {
        const rate =
          (item.statistics.successfulTransactions /
            item.statistics.totalTransactions) *
          100;
        return (
          <div className="flex items-center justify-end gap-1">
            <span className={rate > 90 ? "text-green-600 font-medium" : ""}>
              {rate.toFixed(1)}%
            </span>
            {rate > 90 && <TrendingUp className="h-4 w-4 text-green-600" />}
          </div>
        );
      },
    },
    {
      key: "totalVolume",
      label: "Volume",
      render: (item) => (
        <div className="text-right font-semibold">
          ${item.statistics.totalVolume.toLocaleString()}
        </div>
      ),
    },
  ];

  const renderActions = (item: PaymentProvider) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => { setSelectedProvider(item); setShowConfigModal(true); }}>
          <Settings className="mr-2 h-4 w-4" />
          Configure Provider
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { setSelectedProvider(item); setShowStatsModal(true); }}>
          <Eye className="mr-2 h-4 w-4" />
          View Statistics
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { setSelectedProvider(item); setShowFacilitiesModal(true); }}>
          <Building className="mr-2 h-4 w-4" />
          Manage Facilities
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {item.isActive ? (
          <DropdownMenuItem className="text-red-600" onClick={() => toggleProviderStatus(item.id)}>
            Deactivate
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => toggleProviderStatus(item.id)}>Activate</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Calculate summary
  const totalTransactions = data.reduce(
    (sum, p) => sum + p.statistics.totalTransactions,
    0,
  );
  const totalVolume = data.reduce(
    (sum, p) => sum + p.statistics.totalVolume,
    0,
  );
  const activeProviders = data.filter((p) => p.isActive).length;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Active Providers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProviders}</div>
            <p className="text-xs text-muted-foreground">
              Out of {data.length} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Total Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalTransactions.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all providers
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalVolume.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Payment processing</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Providers</CardTitle>
          <CardDescription>
            Configure and manage payment integration providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns as unknown as ColumnDef<Record<string, unknown>>[]}
            data={data as unknown as Record<string, unknown>[]}
            actions={
              renderActions as unknown as (
                item: Record<string, unknown>,
              ) => React.ReactNode
            }
          />
        </CardContent>
      </Card>

      {/* Configure Provider Modal */}
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configure {selectedProvider?.name}
            </DialogTitle>
            <DialogDescription>
              Update provider settings and fees
            </DialogDescription>
          </DialogHeader>
          {selectedProvider && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Processing Fee (%)</Label>
                <Input type="number" step="0.01" defaultValue={selectedProvider.processingFeePercentage} />
              </div>
              <div className="space-y-2">
                <Label>Fixed Fee ($)</Label>
                <Input type="number" step="0.01" defaultValue={selectedProvider.fixedFee} />
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Provider Active</p>
                  <p className="text-sm text-muted-foreground">Enable or disable this provider</p>
                </div>
                <Switch checked={selectedProvider.isActive} onCheckedChange={() => toggleProviderStatus(selectedProvider.id)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigModal(false)}>Cancel</Button>
            <Button onClick={() => setShowConfigModal(false)}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Statistics Modal */}
      <Dialog open={showStatsModal} onOpenChange={setShowStatsModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Statistics for {selectedProvider?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedProvider && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Total Transactions</p>
                  <p className="text-2xl font-bold">{selectedProvider.statistics.totalTransactions.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Total Volume</p>
                  <p className="text-2xl font-bold">${selectedProvider.statistics.totalVolume.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Successful</p>
                  <p className="text-2xl font-bold text-green-600">{selectedProvider.statistics.successfulTransactions.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{selectedProvider.statistics.failedTransactions.toLocaleString()}</p>
                </div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-3xl font-bold">
                  {((selectedProvider.statistics.successfulTransactions / selectedProvider.statistics.totalTransactions) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowStatsModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Facilities Modal */}
      <Dialog open={showFacilitiesModal} onOpenChange={setShowFacilitiesModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Facilities using {selectedProvider?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedProvider?.facilities.length || 0} facilities connected
            </DialogDescription>
          </DialogHeader>
          {selectedProvider && (
            <div className="space-y-2 py-4 max-h-[300px] overflow-y-auto">
              {selectedProvider.facilities.map((facility, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium">{facility}</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">Connected</Badge>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowFacilitiesModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
