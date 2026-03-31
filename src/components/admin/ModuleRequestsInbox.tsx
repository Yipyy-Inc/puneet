"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  ArrowRight,
  Building,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAllRequests,
  updateRequestStatus,
} from "@/data/module-requests";

export function ModuleRequestsInbox() {
  const [refreshKey, setRefreshKey] = useState(0);
  const requests = useMemo(() => getAllRequests(), [refreshKey]);
  const pending = requests.filter(
    (r) => r.status === "pending" || r.status === "in_progress",
  );

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const handleDecline = (id: string, name: string) => {
    if (!window.confirm(`Decline request for "${name}"?`)) return;
    updateRequestStatus(id, "declined", {
      declineReason: "Not feasible at this time",
    });
    setRefreshKey((k) => k + 1);
    toast.success(`Request for "${name}" declined`);
  };

  const handleStartBuild = (id: string, name: string) => {
    updateRequestStatus(id, "in_progress");
    setRefreshKey((k) => k + 1);
    toast.success(`Started building "${name}"`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="size-5" />
            Module Requests
            {pending.length > 0 && (
              <Badge variant="secondary">{pending.length} pending</Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No module requests yet
          </p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="rounded-lg border p-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold">
                        {req.serviceName}
                      </h4>
                      <Badge
                        variant={
                          req.status === "pending"
                            ? "secondary"
                            : req.status === "in_progress"
                              ? "default"
                              : req.status === "completed"
                                ? "outline"
                                : "destructive"
                        }
                        className="text-[10px] capitalize"
                      >
                        {req.status.replace("_", " ")}
                      </Badge>
                      {req.priority === "urgent" && (
                        <Badge
                          variant="outline"
                          className="border-red-200 bg-red-50 text-[10px] text-red-700"
                        >
                          <AlertTriangle className="mr-0.5 size-2.5" />
                          Urgent
                        </Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1">
                        <Building className="size-3" />
                        {req.facilityName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {formatDate(req.requestedAt)}
                      </span>
                      <span className="capitalize">
                        {req.suggestedCategory === "unsure"
                          ? "Category: Unsure"
                          : req.suggestedCategory.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-2 line-clamp-2 text-xs">
                      {req.description}
                    </p>
                    {req.notes && (
                      <p className="mt-1 text-xs italic text-emerald-600">
                        {req.notes}
                      </p>
                    )}
                  </div>
                </div>

                {(req.status === "pending" || req.status === "in_progress") && (
                  <div className="mt-3 flex items-center gap-2">
                    {req.status === "pending" && (
                      <Link href="/dashboard/services/custom-modules/create">
                        <Button size="sm" className="h-7 gap-1 text-xs">
                          <ArrowRight className="size-3" />
                          Build Module
                        </Button>
                      </Link>
                    )}
                    {req.status === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        onClick={() =>
                          handleStartBuild(req.id, req.serviceName)
                        }
                      >
                        Mark In Progress
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive h-7 gap-1 text-xs"
                      onClick={() => handleDecline(req.id, req.serviceName)}
                    >
                      <XCircle className="size-3" />
                      Decline
                    </Button>
                  </div>
                )}

                {req.status === "completed" && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
                    <CheckCircle className="size-3" />
                    Built and published
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
