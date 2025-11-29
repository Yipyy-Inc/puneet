"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, ColumnDef, FilterDef } from "@/components/DataTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DollarSign,
  TrendingUp,
  Target,
  Clock,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Plus,
  Building2,
  User,
  Calendar,
} from "lucide-react";
import {
  deals,
  Deal,
  DealStage,
  dealStages,
  getActiveDeals,
  getWonDeals,
  getLostDeals,
  calculatePipelineValue,
} from "@/data/crm/deals";
import { salesTeamMembers } from "@/data/crm/sales-team";

const stageColors: Record<DealStage, string> = {
  qualification: "bg-slate-100 text-slate-800",
  needs_analysis: "bg-blue-100 text-blue-800",
  proposal: "bg-purple-100 text-purple-800",
  negotiation: "bg-orange-100 text-orange-800",
  closed_won: "bg-green-100 text-green-800",
  closed_lost: "bg-red-100 text-red-800",
};

const tierColors: Record<string, string> = {
  beginner: "bg-blue-100 text-blue-800",
  pro: "bg-purple-100 text-purple-800",
  enterprise: "bg-amber-100 text-amber-800",
  custom: "bg-emerald-100 text-emerald-800",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);
}

export default function DealsPage() {
  const [, setSelectedDeal] = useState<Deal | null>(null);

  const activeDeals = getActiveDeals();
  const wonDeals = getWonDeals();
  const lostDeals = getLostDeals();
  const pipelineValue = calculatePipelineValue(deals);

  const totalWonValue = wonDeals.reduce(
    (sum, deal) => sum + deal.estimatedAnnualValue,
    0,
  );

  const avgDealSize = wonDeals.length > 0 ? totalWonValue / wonDeals.length : 0;

  const winRate =
    wonDeals.length + lostDeals.length > 0
      ? (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100
      : 0;

  const columns: ColumnDef<Deal>[] = [
    {
      key: "facilityName",
      label: "Facility",
      icon: Building2,
      render: (deal) => (
        <div>
          <div className="font-medium">{deal.facilityName}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <User className="h-3 w-3" />
            {deal.contactPerson}
          </div>
        </div>
      ),
    },
    {
      key: "stage",
      label: "Stage",
      render: (deal) => {
        const stageInfo = dealStages.find((s) => s.value === deal.stage);
        return (
          <Badge variant="secondary" className={stageColors[deal.stage]}>
            {stageInfo?.label || deal.stage}
          </Badge>
        );
      },
    },
    {
      key: "expectedTier",
      label: "Tier",
      render: (deal) => (
        <Badge variant="secondary" className={tierColors[deal.expectedTier]}>
          {deal.expectedTier.charAt(0).toUpperCase() +
            deal.expectedTier.slice(1)}
        </Badge>
      ),
    },
    {
      key: "estimatedAnnualValue",
      label: "Value",
      icon: DollarSign,
      sortable: true,
      render: (deal) => (
        <div>
          <div className="font-medium">
            {formatCurrency(deal.estimatedAnnualValue)}/yr
          </div>
          <div className="text-xs text-muted-foreground">
            {formatCurrency(deal.estimatedMonthlyValue)}/mo
          </div>
        </div>
      ),
    },
    {
      key: "probability",
      label: "Probability",
      sortable: true,
      render: (deal) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary"
              style={{ width: `${deal.probability}%` }}
            />
          </div>
          <span className="text-sm">{deal.probability}%</span>
        </div>
      ),
    },
    {
      key: "expectedCloseDate",
      label: "Expected Close",
      icon: Calendar,
      sortable: true,
      render: (deal) => {
        const date = new Date(deal.expectedCloseDate);
        const isOverdue =
          date < new Date() &&
          deal.stage !== "closed_won" &&
          deal.stage !== "closed_lost";
        return (
          <span className={isOverdue ? "text-red-600 font-medium" : ""}>
            {date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        );
      },
    },
    {
      key: "assignedTo",
      label: "Owner",
      render: (deal) => {
        const rep = salesTeamMembers.find((m) => m.id === deal.assignedTo);
        return rep ? (
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
              {rep.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <span className="text-sm">{rep.name.split(" ")[0]}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        );
      },
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "stage",
      label: "Stage",
      options: [
        { value: "all", label: "All Stages" },
        ...dealStages.map((s) => ({ value: s.value, label: s.label })),
      ],
    },
    {
      key: "expectedTier",
      label: "Tier",
      options: [
        { value: "all", label: "All Tiers" },
        { value: "beginner", label: "Beginner" },
        { value: "pro", label: "Pro" },
        { value: "enterprise", label: "Enterprise" },
        { value: "custom", label: "Custom" },
      ],
    },
  ];

  const handleActions = (deal: Deal) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setSelectedDeal(deal)}>
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Edit className="h-4 w-4 mr-2" />
          Edit Deal
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Deal
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Deal Tracking</h1>
          <p className="text-muted-foreground">
            Manage and track your sales opportunities
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Deal
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Deals
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDeals.length}</div>
            <p className="text-xs text-muted-foreground">In pipeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pipeline Value
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(pipelineValue)}
            </div>
            <p className="text-xs text-muted-foreground">Weighted value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Win Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winRate.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">
              {wonDeals.length} won / {lostDeals.length} lost
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Deal Size
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(avgDealSize)}
            </div>
            <p className="text-xs text-muted-foreground">Annual value</p>
          </CardContent>
        </Card>
      </div>

      {/* Deals Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Deals</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={deals}
            columns={columns}
            filters={filters}
            searchKey="facilityName"
            searchPlaceholder="Search deals..."
            actions={handleActions}
            rowClassName={(deal) =>
              deal.stage === "closed_won"
                ? "bg-green-50/50"
                : deal.stage === "closed_lost"
                  ? "bg-red-50/50"
                  : ""
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
