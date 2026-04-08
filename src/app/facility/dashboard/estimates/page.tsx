"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Plus,
  Search,
  Send,
  CheckCircle,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { estimates } from "@/data/estimates";
import { clients } from "@/data/clients";
import { EstimateCard } from "@/components/bookings/EstimateCard";
import { EstimateFollowUpSettings } from "@/components/estimates/EstimateFollowUpSettings";
import { useBookingModal } from "@/hooks/use-booking-modal";

type TabFilter =
  | "all"
  | "draft"
  | "sent"
  | "accepted"
  | "declined"
  | "expired"
  | "converted";

const TAB_FILTERS: { key: TabFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "accepted", label: "Accepted" },
  { key: "declined", label: "Declined" },
  { key: "expired", label: "Expired" },
  { key: "converted", label: "Converted" },
];

export default function EstimatesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const { openBookingModal } = useBookingModal();

  const openDashboardEstimateWizard = useCallback(() => {
    const facilityName = "Example Pet Care Facility";
    localStorage.setItem("booking-modal-mode", "estimate");
    openBookingModal({
      clients: clients.filter((c) => c.facility === facilityName),
      facilityId: 11,
      facilityName,
      onCreateBooking: () => {
        toast.success("Booking created");
      },
    });
  }, [openBookingModal]);

  const filtered = useMemo(() => {
    let list = estimates;
    if (activeTab !== "all") {
      list = list.filter((e) => e.status === activeTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.clientName.toLowerCase().includes(q) ||
          e.clientEmail.toLowerCase().includes(q) ||
          e.service.toLowerCase().includes(q),
      );
    }
    return list;
  }, [activeTab, searchQuery]);

  const stats = {
    draft: estimates.filter((e) => e.status === "draft").length,
    sent: estimates.filter((e) => e.status === "sent").length,
    accepted: estimates.filter((e) => e.status === "accepted").length,
    converted: estimates.filter((e) => e.status === "converted"),
  };
  const convertedTotal = stats.converted.reduce((s, e) => s + e.total, 0);

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Estimates</h2>
          <p className="text-muted-foreground">
            Create, manage, and track service estimates for clients and
            prospects.
          </p>
        </div>
        <Button className="gap-2" onClick={openDashboardEstimateWizard}>
          <Plus className="size-4" />
          Create Estimate
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          {
            key: "draft" as const,
            label: "Draft",
            count: stats.draft,
            icon: FileText,
            iconColor: "text-slate-300",
            countColor: "",
            tab: "draft" as TabFilter,
          },
          {
            key: "sent" as const,
            label: "Sent",
            count: stats.sent,
            icon: Send,
            iconColor: "text-blue-300",
            countColor: "text-blue-600",
            tab: "sent" as TabFilter,
          },
          {
            key: "accepted" as const,
            label: "Accepted",
            count: stats.accepted,
            icon: CheckCircle,
            iconColor: "text-emerald-300",
            countColor: "text-emerald-600",
            tab: "accepted" as TabFilter,
          },
          {
            key: "converted" as const,
            label: "Converted this month",
            count: stats.converted.length,
            icon: TrendingUp,
            iconColor: "text-primary/30",
            countColor: "",
            tab: "converted" as TabFilter,
          },
        ].map((s) => {
          const Icon = s.icon;
          const isActive = activeTab === s.tab;
          return (
            <Card
              key={s.key}
              className={cn(
                "cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md",
                isActive && "ring-primary/30 ring-2 ring-offset-2",
              )}
              onClick={() => setActiveTab(isActive ? "all" : s.tab)}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">{s.label}</p>
                    <p className={cn("text-2xl font-bold", s.countColor)}>
                      {s.count}
                      {s.key === "converted" && (
                        <span className="text-muted-foreground ml-1 text-sm font-normal">
                          (${convertedTotal.toFixed(0)})
                        </span>
                      )}
                    </p>
                  </div>
                  <Icon className={cn("size-8", s.iconColor)} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-1">
          {TAB_FILTERS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                activeTab === tab.key
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative w-full md:max-w-xs">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search estimates..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Estimate list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <AlertCircle className="text-muted-foreground/20 size-12" />
          <p className="text-muted-foreground mt-3">No estimates found</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((estimate) => (
            <EstimateCard
              key={estimate.id}
              estimate={estimate}
              onDuplicate={(id) => {
                toast.success(
                  `Estimate ${id} duplicated as draft — edit and send`,
                );
              }}
            />
          ))}
        </div>
      )}

      {/* Follow-up settings */}
      <EstimateFollowUpSettings />
    </div>
  );
}
