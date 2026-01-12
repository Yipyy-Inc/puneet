"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import { BoardingBookingRequest } from "@/data/boarding-ops";
import { Calendar, ClipboardList, ShieldAlert, CreditCard } from "lucide-react";

function statusBadge(status: BoardingBookingRequest["status"]) {
  if (status === "new") return <Badge variant="warning">New</Badge>;
  if (status === "in-review") return <Badge variant="secondary">In review</Badge>;
  if (status === "accepted") return <Badge variant="success">Accepted</Badge>;
  return <Badge variant="destructive">Declined</Badge>;
}

function preCheckBadge(status: BoardingBookingRequest["preCheck"]["status"]) {
  if (status === "approved") return <Badge variant="success">Approved</Badge>;
  if (status === "submitted") return <Badge variant="secondary">Submitted</Badge>;
  if (status === "corrections-requested")
    return <Badge variant="destructive">Corrections</Badge>;
  return <Badge variant="warning">Missing</Badge>;
}

function paymentBadge(status: BoardingBookingRequest["paymentStatus"]) {
  if (status === "paid") return <Badge variant="success">Paid</Badge>;
  if (status === "partial") return <Badge variant="secondary">Partial</Badge>;
  if (status === "deposit") return <Badge variant="warning">Deposit</Badge>;
  return <Badge variant="destructive">Unpaid</Badge>;
}

export function BoardingOpsRequestsTable({
  requests,
  onOpen,
  onAccept,
  onDecline,
}: {
  requests: BoardingBookingRequest[];
  onOpen: (req: BoardingBookingRequest) => void;
  onAccept: (req: BoardingBookingRequest) => void;
  onDecline: (req: BoardingBookingRequest) => void;
}) {
  const columns: ColumnDef<BoardingBookingRequest>[] = useMemo(
    () => [
      {
        key: "id",
        label: "Request",
        icon: ClipboardList,
        sortable: true,
        render: (r) => (
          <div className="space-y-1">
            <div className="font-medium">{r.id}</div>
            <div className="text-xs text-muted-foreground">{r.clientName}</div>
          </div>
        ),
      },
      {
        key: "createdAt",
        label: "Created",
        sortable: true,
        render: (r) => new Date(r.createdAt).toLocaleString(),
        sortValue: (r) => r.createdAt,
      },
      {
        key: "checkInDate",
        label: "Dates",
        icon: Calendar,
        sortable: true,
        render: (r) => (
          <div className="text-sm">
            <div>{r.checkInDate}</div>
            <div className="text-xs text-muted-foreground">→ {r.checkOutDate}</div>
          </div>
        ),
        sortValue: (r) => r.checkInDate,
      },
      {
        key: "pets",
        label: "Pets",
        icon: ShieldAlert,
        render: (r) => (
          <div className="space-y-1">
            <div className="text-sm font-medium">{r.pets.length} pet(s)</div>
            <div className="text-xs text-muted-foreground">
              {r.pets.map((p) => p.petName).join(", ")}
            </div>
          </div>
        ),
        sortable: false,
      },
      {
        key: "preCheck",
        label: "PreCheck",
        render: (r) => preCheckBadge(r.preCheck.status),
        sortable: true,
        sortValue: (r) => r.preCheck.status,
      },
      {
        key: "paymentStatus",
        label: "Payment",
        icon: CreditCard,
        render: (r) => paymentBadge(r.paymentStatus),
        sortable: true,
      },
      {
        key: "status",
        label: "Status",
        render: (r) => statusBadge(r.status),
        sortable: true,
      },
    ],
    [],
  );

  const filters: FilterDef[] = useMemo(
    () => [
      {
        key: "status",
        label: "Status",
        options: [
          { value: "all", label: "All" },
          { value: "new", label: "New" },
          { value: "in-review", label: "In review" },
          { value: "accepted", label: "Accepted" },
          { value: "declined", label: "Declined" },
        ],
      },
      {
        key: "paymentStatus",
        label: "Payment",
        options: [
          { value: "all", label: "All" },
          { value: "unpaid", label: "Unpaid" },
          { value: "deposit", label: "Deposit" },
          { value: "partial", label: "Partial" },
          { value: "paid", label: "Paid" },
        ],
      },
    ],
    [],
  );

  return (
    <DataTable
      data={requests}
      columns={columns}
      filters={filters}
      searchKeys={["id", "clientName", "checkInDate", "checkOutDate"]}
      searchPlaceholder="Search requests..."
      actions={(r) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpen(r)}>
            Open
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDecline(r)}
            disabled={r.status === "declined"}
          >
            Decline
          </Button>
          <Button
            size="sm"
            onClick={() => onAccept(r)}
            disabled={r.status === "accepted"}
          >
            Accept
          </Button>
        </div>
      )}
      rowClassName={(r) =>
        [
          r.status === "new" ? "bg-warning/5" : "",
          r.status === "declined" ? "opacity-60" : "",
        ]
          .filter(Boolean)
          .join(" ")
      }
    />
  );
}

