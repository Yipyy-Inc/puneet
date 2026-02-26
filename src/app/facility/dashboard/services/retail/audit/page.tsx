"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAuditLogs, type PaymentAuditLog, type AuditActionType } from "@/lib/payment-audit";
import { formatTransactionTimestamp } from "@/lib/payment-method-utils";
import { 
  CreditCard, 
  RotateCcw, 
  XCircle, 
  Edit, 
  Smartphone, 
  Printer,
  Banknote,
  Wallet,
  Gift,
  Search,
  Download,
  Filter,
} from "lucide-react";

export default function PaymentAuditPage() {
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "custom">("30d");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<AuditActionType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const facilityId = 11; // TODO: Get from context

  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    let start: Date;

    if (dateRange === "custom") {
      start = customStartDate ? new Date(customStartDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      const customEnd = customEndDate ? new Date(customEndDate) : end;
      return { startDate: start, endDate: customEnd };
    }

    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
    start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    return { startDate: start, endDate: end };
  }, [dateRange, customStartDate, customEndDate]);

  // Get audit logs
  const auditLogs = useMemo(() => {
    const logs = getAuditLogs(facilityId, {
      action: actionFilter !== "all" ? actionFilter : undefined,
      startDate,
      endDate,
    });

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return logs.filter(
        (log) =>
          log.transactionNumber?.toLowerCase().includes(query) ||
          log.staffName.toLowerCase().includes(query) ||
          log.customerName?.toLowerCase().includes(query) ||
          log.processorTransactionId?.toLowerCase().includes(query)
      );
    }

    return logs;
  }, [facilityId, actionFilter, startDate, endDate, searchQuery]);

  const getActionIcon = (action: AuditActionType) => {
    switch (action) {
      case "payment_capture":
        return CreditCard;
      case "refund":
        return RotateCcw;
      case "void":
        return XCircle;
      case "method_override":
        return Edit;
      case "manual_card_entry":
        return CreditCard;
      case "card_saved":
        return CreditCard;
      case "card_deleted":
        return CreditCard;
      default:
        return CreditCard;
    }
  };

  const getActionBadgeVariant = (action: AuditActionType) => {
    switch (action) {
      case "payment_capture":
        return "default";
      case "refund":
        return "secondary";
      case "void":
        return "destructive";
      case "method_override":
        return "outline";
      default:
        return "outline";
    }
  };

  const auditColumns: ColumnDef<PaymentAuditLog>[] = [
    {
      key: "timestamp",
      label: "Timestamp",
      defaultVisible: true,
      render: (item) => (
        <div className="flex flex-col">
          <span>{formatTransactionTimestamp(item.timestamp)}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(item.timestamp).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        </div>
      ),
    },
    {
      key: "action",
      label: "Action",
      defaultVisible: true,
      render: (item) => {
        const ActionIcon = getActionIcon(item.action);
        return (
          <div className="flex items-center gap-2">
            <ActionIcon className="h-4 w-4 text-muted-foreground" />
            <Badge variant={getActionBadgeVariant(item.action)}>
              {item.action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </Badge>
          </div>
        );
      },
    },
    {
      key: "transactionNumber",
      label: "Transaction #",
      defaultVisible: true,
      render: (item) => (
        <span className="font-mono font-medium">{item.transactionNumber || "—"}</span>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      defaultVisible: true,
      render: (item) => 
        item.amount ? `$${item.amount.toFixed(2)}` : "—",
    },
    {
      key: "paymentMethod",
      label: "Payment Method",
      defaultVisible: true,
      render: (item) => {
        if (!item.paymentMethod) return "—";
        const method = item.paymentMethod;
        if (method === "yipyy_pay") return "Card (Pay with iPhone)";
        if (method === "clover_terminal") return "Card (Clover Terminal)";
        if (method === "saved_card" || method === "manual_card_entry") return "Online Card (Saved)";
        if (method === "cash") return "Cash";
        if (method === "store_credit") return "Store Credit";
        if (method === "gift_card") return "Gift Card";
        return method.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      },
    },
    {
      key: "processorTransactionId",
      label: "Processor ID",
      defaultVisible: true,
      render: (item) => 
        item.processorTransactionId ? (
          <span className="font-mono text-xs">{item.processorTransactionId}</span>
        ) : "—",
    },
    {
      key: "staff",
      label: "Staff Member",
      defaultVisible: true,
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-medium">{item.staffName}</span>
          <span className="text-xs text-muted-foreground">
            {item.staffRole} • ID: {item.staffId}
          </span>
        </div>
      ),
    },
    {
      key: "customer",
      label: "Customer",
      defaultVisible: true,
      render: (item) => item.customerName || "—",
    },
    {
      key: "notes",
      label: "Notes",
      defaultVisible: false,
      render: (item) => (
        <div className="flex flex-col">
          <span className="text-sm">{item.notes || "—"}</span>
          {item.reason && (
            <span className="text-xs text-muted-foreground">Reason: {item.reason}</span>
          )}
        </div>
      ),
    },
    {
      key: "overrideMethod",
      label: "Override Method",
      defaultVisible: false,
      render: (item) => 
        item.action === "method_override" && item.overrideMethod ? (
          <div className="flex flex-col">
            <span className="text-sm">Original: {item.originalPaymentMethod}</span>
            <span className="text-sm font-medium">Override: {item.overrideMethod}</span>
          </div>
        ) : "—",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Payment Audit Logs</h2>
          <p className="text-muted-foreground">
            Complete audit trail of all payment-related actions
          </p>
        </div>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Export Logs
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select
                value={dateRange}
                onValueChange={(value) =>
                  setDateRange(value as "7d" | "30d" | "90d" | "custom")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === "custom" && (
              <>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Action Type</Label>
              <Select
                value={actionFilter}
                onValueChange={(value) =>
                  setActionFilter(value as AuditActionType | "all")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="payment_capture">Payment Capture</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="void">Void</SelectItem>
                  <SelectItem value="method_override">Method Override</SelectItem>
                  <SelectItem value="manual_card_entry">Manual Card Entry</SelectItem>
                  <SelectItem value="card_saved">Card Saved</SelectItem>
                  <SelectItem value="card_deleted">Card Deleted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Transaction #, staff, customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
          <CardDescription>
            {auditLogs.length} log entries found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={auditLogs}
            columns={auditColumns}
            searchKey="transactionNumber"
            searchPlaceholder="Search logs..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
