"use client";

import { use, useState } from "react";
import { estimates } from "@/data/estimates";
import { EstimateCard } from "@/components/bookings/EstimateCard";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

export default function ClientEstimatesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const clientId = parseInt(id);
  const [filter, setFilter] = useState<string>("all");

  const clientEstimates = estimates.filter((e) => e.clientId === clientId);
  const filtered =
    filter === "all"
      ? clientEstimates
      : clientEstimates.filter((e) => e.status === filter);

  const counts = {
    all: clientEstimates.length,
    draft: clientEstimates.filter((e) => e.status === "draft").length,
    sent: clientEstimates.filter((e) => e.status === "sent").length,
    accepted: clientEstimates.filter(
      (e) => e.status === "accepted" || e.status === "converted",
    ).length,
    declined: clientEstimates.filter(
      (e) => e.status === "declined" || e.status === "expired",
    ).length,
  };

  const tabs = [
    { key: "all", label: "All" },
    { key: "draft", label: "Drafts" },
    { key: "sent", label: "Sent" },
    { key: "accepted", label: "Accepted" },
    { key: "declined", label: "Declined" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-violet-100">
            <FileText className="size-4 text-violet-700" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Estimates</h2>
            <p className="text-muted-foreground text-xs">
              Price quotes sent to this customer
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">
          {clientEstimates.length} estimate
          {clientEstimates.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === tab.key
                ? "bg-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {counts[tab.key as keyof typeof counts] > 0 && (
              <span className="ml-1.5 text-[10px] opacity-60">
                {counts[tab.key as keyof typeof counts]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Estimates list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <FileText className="text-muted-foreground/30 size-10" />
            <p className="text-muted-foreground mt-3 text-sm">
              No estimates found
            </p>
          </div>
        ) : (
          filtered.map((estimate) => (
            <EstimateCard key={estimate.id} estimate={estimate} />
          ))
        )}
      </div>
    </div>
  );
}
